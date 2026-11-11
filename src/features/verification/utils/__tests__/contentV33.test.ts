import { describe, expect, it } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { composeEnrichmentPayload } from '@/features/exercises/useEnrichmentDraft';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import {
  V33_EDITABLE_PATHS,
  applyVerificationEditsV33,
  omitRetiredCoreVariablesV33,
  readContraindicationTextsV33,
  withV3SchemaMarker,
  writeContraindicationsV33,
} from '../contentV33';
import { computeCompleteness } from '../enrichmentSkeleton';
import { toV3 } from '../enrichmentToV3';

const golden = goldenV33 as ExerciseEnrichmentData;

/** The draft exactly as the editor form hands it to the save: loaded through `toV3`, then composed. */
function draftOf(document: ExerciseEnrichmentData, edit: (draft: ExerciseEnrichmentData) => void = () => undefined) {
  const draft = toV3(document);
  edit(draft);
  return composeEnrichmentPayload(draft);
}

function withoutPath(document: ExerciseEnrichmentData, section: string, key: string): unknown {
  const copy = structuredClone(document) as Record<string, Record<string, unknown>>;
  delete copy[section][key];
  return copy;
}

describe('applyVerificationEditsV33', () => {
  it('bez edycji oddaje wczytany dokument co do klucza, z null i pustymi listami', () => {
    const payload = applyVerificationEditsV33(golden, draftOf(golden));

    expect(payload).toEqual(golden);
    expect(JSON.stringify(payload)).toBe(JSON.stringify(golden));
    expect(payload).not.toBe(golden);
  });

  it('edycja przeciwwskazań zmienia tylko safety.contraindications', () => {
    const payload = applyVerificationEditsV33(
      golden,
      draftOf(golden, (draft) => {
        draft.safety = {
          ...draft.safety,
          contraindications: writeContraindicationsV33(draft, [
            ...readContraindicationTextsV33(draft),
            'Świeże zszycie łąkotki bez zgody operatora.',
          ]),
        };
      })
    );

    expect(payload.safety?.contraindications).toEqual([
      ...(golden.safety?.contraindications ?? []),
      { text: 'Świeże zszycie łąkotki bez zgody operatora.' },
    ]);
    expect(withoutPath(payload, 'safety', 'contraindications')).toEqual(
      withoutPath(golden, 'safety', 'contraindications')
    );
    expect(payload.schemaVersion).toBe('3.3');
    expect(payload.$schema).toBe('fiziyo-exercise-v3');
    expect(payload.therapist).toEqual(golden.therapist);
    expect(payload.therapist).not.toHaveProperty('contraindications');
  });

  it('edycja jednego kroku zostawia resztę dokumentu bez zmian', () => {
    const payload = applyVerificationEditsV33(
      golden,
      draftOf(golden, (draft) => {
        draft.patient = {
          ...draft.patient,
          steps: ['Połóż się na plecach.', ...(draft.patient?.steps ?? []).slice(1)],
        };
      })
    );

    expect(payload.patient?.steps?.[0]).toBe('Połóż się na plecach.');
    expect(withoutPath(payload, 'patient', 'steps')).toEqual(withoutPath(golden, 'patient', 'steps'));
  });

  it('wyczyszczone pole traci klucz, a pusty wiersz kroku nie trafia do zapisu', () => {
    const payload = applyVerificationEditsV33(
      golden,
      draftOf(golden, (draft) => {
        draft.safety = { ...draft.safety, stop_if: '  ' };
        draft.patient = { ...draft.patient, steps: [...(draft.patient?.steps ?? []), ''] };
      })
    );

    expect(payload.safety).not.toHaveProperty('stop_if');
    expect(payload.patient?.steps).toEqual(golden.patient?.steps);
  });

  it('nie dopisuje wycofanych miejsc, gdy szkic formularza je niesie', () => {
    const payload = applyVerificationEditsV33(
      golden,
      draftOf(golden, (draft) => {
        draft.therapist = { ...draft.therapist, contraindications: ['stare miejsce'], clinical_notes: 'stare' };
        draft.equipment = ['mata'];
      })
    );

    expect(payload).toEqual(golden);
  });

  it('rekord 3.3 bez znacznika $schema nie gubi kluczy po przejściu przez formularz', () => {
    const { $schema: _marker, ...unmarked } = golden;
    const payload = applyVerificationEditsV33(unmarked, draftOf(withV3SchemaMarker(unmarked)));

    expect(payload).toEqual(unmarked);
    expect(payload).not.toHaveProperty('$schema');
  });

  it('pisze tylko w miejscach kontraktu', () => {
    const paths: readonly string[] = V33_EDITABLE_PATHS;

    expect(paths.filter((path) => path.startsWith('therapist.') || path === 'equipment')).toEqual([]);
  });
});

describe('przeciwwskazania v3.3', () => {
  it('zachowują pozostałe klucze wpisu, którego tekst się nie zmienił', () => {
    const enrichment = {
      safety: { contraindications: [{ text: 'Świeży uraz', source: 'S3' }, { text: 'Gorączka' }] },
    } as ExerciseEnrichmentData;

    expect(writeContraindicationsV33(enrichment, ['Świeży uraz', 'Ostry stan zapalny'])).toEqual([
      { text: 'Świeży uraz', source: 'S3' },
      { text: 'Ostry stan zapalny' },
    ]);
  });

  it('czyta teksty z obiektów i z samych napisów', () => {
    const enrichment = {
      safety: { contraindications: [{ text: 'Świeży uraz' }, 'Gorączka', { text: ' ' }] },
    } as unknown as ExerciseEnrichmentData;

    expect(readContraindicationTextsV33(enrichment)).toEqual(['Świeży uraz', 'Gorączka']);
  });
});

describe('omitRetiredCoreVariablesV33', () => {
  it('nie przepuszcza wycofanych kolumn opisu', () => {
    expect(
      omitRetiredCoreVariablesV33({ name: 'Mostek', description: 'Opis', clinicalDescription: 'Opis fizjo', sets: 3 })
    ).toEqual({ name: 'Mostek', sets: 3 });
  });
});

describe('computeCompleteness', () => {
  it('rekord wzorcowy 3.3 nie ma braków', () => {
    const completeness = computeCompleteness(golden);

    expect(completeness.missing).toEqual([]);
    expect(completeness.filled).toBe(completeness.total);
  });

  it('dla 3.3 nie liczy wycofanych miejsc, a braki nazywa miejscami kontraktu', () => {
    const completeness = computeCompleteness({
      schemaVersion: '3.3',
      patient: { steps: ['Krok'] },
      therapist: { clinical_notes: 'stare', indications: ['stare'], contraindications: ['stare'] },
      equipment: ['mata'],
    });

    expect(completeness.missing.map((section) => section.id)).toEqual([
      'summary',
      'cues',
      'mistakes',
      'feel',
      'why_when',
      'safety',
      'keywords',
      'easier_harder',
      'breathing',
      'pain_rule',
      'contraindications',
      'checkpoints',
      'indications',
      'equipment_items',
    ]);
  });

  it('rekord stary liczy te same dwanaście sekcji co dotąd', () => {
    const completeness = computeCompleteness({
      $schema: 'fiziyo-exercise-v3',
      therapist: { clinical_notes: 'Notatka', indications: ['a'], contraindications: ['b'] },
      equipment: ['mata'],
    });

    expect(completeness.total).toBe(12);
    expect(completeness.filled).toBe(3);
  });
});
