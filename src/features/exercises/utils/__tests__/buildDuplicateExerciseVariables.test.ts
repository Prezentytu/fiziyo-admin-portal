import { describe, expect, it } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { buildCreateExerciseVariables } from '../buildCreateExerciseVariables';
import {
  buildDuplicateExerciseVariables,
  canDuplicateExercise,
  type DuplicateExerciseSource,
} from '../buildDuplicateExerciseVariables';

const columnsOnly: DuplicateExerciseSource = {
  name: 'Napinanie uda',
  patientDescription: 'Napnij udo i przytrzymaj.',
  clinicalDescription: 'Izometria czworogłowego',
  notes: 'Notatka',
  audioCue: 'Napnij udo',
  tempo: '2-5-2-3',
  rangeOfMotion: 'pełny',
  resistance: 'Średni',
  equipment: 'ręcznik',
  type: 'TIME',
  side: 'BOTH',
  difficultyLevel: 'EASY',
  videoUrl: 'https://vimeo.com/1',
  defaultSets: 2,
  defaultReps: 10,
  defaultDuration: null,
  defaultRestBetweenSets: 30,
  defaultRestBetweenReps: 3,
  preparationTime: 10,
  defaultExecutionTime: 7,
  defaultLoad: { loadWeightKg: 2 },
  images: ['https://example.test/a.jpg'],
  mainTags: [{ id: 'tag-1' }, 'tag-2'],
  additionalTags: [],
};

function duplicate(source: DuplicateExerciseSource) {
  return buildDuplicateExerciseVariables({ organizationId: 'org-1', source, name: 'Kopia Napinanie uda' });
}

describe('buildDuplicateExerciseVariables', () => {
  it('kopia dostaje cały dokument treści v3.3, razem z kluczami, których panel nie zna', () => {
    const document = { ...goldenV33, klucz_z_przyszlosci: { a: [1, null, ''] } };
    const before = JSON.stringify(document);

    const result = duplicate({ ...columnsOnly, enrichmentData: document as ExerciseEnrichmentData });
    const copied = JSON.parse(result.enrichmentDataJson ?? 'null');

    // Wszystko poza kluczem źródła i statusem weryfikacji (osobny test niżej).
    const { key: _key, ...expected } = { ...document, lifecycle: { ...document.lifecycle } } as Record<string, unknown> & {
      lifecycle: Record<string, unknown>;
    };
    delete expected.lifecycle.status;
    expect(copied).toEqual(expected);
    expect(copied.schemaVersion).toBe('3.3');
    expect(Object.keys(copied)).toEqual(Object.keys(document).filter((name) => name !== 'key'));
    expect(copied.breathing.pattern).toBeNull();
    expect(copied.classification.structures).toEqual([]);
    expect(JSON.stringify(document)).toBe(before);
  });

  it('dokument podany jako tekst JSON też trafia do kopii', () => {
    const result = duplicate({ ...columnsOnly, enrichmentData: JSON.stringify({ patient: { steps: ['Krok'] } }) });
    expect(JSON.parse(result.enrichmentDataJson ?? 'null')).toEqual({ patient: { steps: ['Krok'] } });
  });

  it('kopia nie przenosi klucza źródła ani statusu weryfikacji z dokumentu', () => {
    expect(goldenV33.key).toBe('fx-0073');
    expect(goldenV33.lifecycle.status).toBe('ai_audited');
    const before = JSON.stringify(goldenV33);

    const copied = JSON.parse(
      duplicate({ ...columnsOnly, enrichmentData: goldenV33 as unknown as ExerciseEnrichmentData }).enrichmentDataJson ?? 'null'
    );

    expect(copied).not.toHaveProperty('key');
    expect(copied.lifecycle).not.toHaveProperty('status');
    // Reszta cyklu życia i pochodzenie treści zostają: mówią, skąd są media i co wolno z nimi zrobić.
    expect(copied.lifecycle.availability).toBe(goldenV33.lifecycle.availability);
    expect(copied.lifecycle.quality).toEqual(goldenV33.lifecycle.quality);
    expect(copied.provenance).toEqual(goldenV33.provenance);
    expect(copied.relations).toEqual(goldenV33.relations);
    expect(JSON.stringify(goldenV33)).toBe(before);
  });

  it('dokument bez klucza i cyklu życia kopiuje się bez dopisywania pustych sekcji', () => {
    const copied = JSON.parse(
      duplicate({ ...columnsOnly, enrichmentData: { patient: { steps: ['Krok'] }, lifecycle: null } as ExerciseEnrichmentData })
        .enrichmentDataJson ?? 'null'
    );

    expect(copied).toEqual({ patient: { steps: ['Krok'] }, lifecycle: null });
  });

  it('zmienne kopii nie niosą klucza źródła, statusu ani pól weryfikacji', () => {
    const variables = duplicate({
      ...columnsOnly,
      ...({
        sourceResearchId: 'fx-0073',
        source: 'research',
        status: 'PUBLISHED',
        organizationVerificationStatus: 'ORG_VERIFIED',
        reviewedBy: 'user-1',
      } as Partial<DuplicateExerciseSource>),
    });

    const names = Object.keys(variables);
    expect(
      names.filter((name) => /^source|sourceResearch|status|review|verif|publish/i.test(name))
    ).toEqual([]);
  });

  it('ćwiczenie bez dokumentu treści kopiuje się jak dotąd, z samych kolumn', () => {
    const expected = buildCreateExerciseVariables({
      organizationId: 'org-1',
      draft: {
        name: 'Kopia Napinanie uda',
        patientDescription: 'Napnij udo i przytrzymaj.',
        clinicalDescription: 'Izometria czworogłowego',
        notes: 'Notatka',
        audioCue: 'Napnij udo',
        tempo: '2-5-2-3',
        rangeOfMotion: 'pełny',
        resistance: 'Średni',
        equipment: 'ręcznik',
        type: 'TIME',
        side: 'BOTH',
        difficultyLevel: 'EASY',
        videoUrl: 'https://vimeo.com/1',
        sets: 2,
        reps: 10,
        duration: null,
        restSets: 30,
        restReps: 3,
        preparationTime: 10,
        executionTime: 7,
        loadKg: 2,
        images: ['https://example.test/a.jpg'],
        mainTags: ['tag-1', 'tag-2'],
        additionalTags: null,
      },
    });

    expect(duplicate(columnsOnly)).toEqual(expected);
    expect(duplicate(columnsOnly).enrichmentDataJson).toBeNull();
    expect(duplicate({ ...columnsOnly, enrichmentData: null })).toEqual(expected);
  });

  it('kopia niesie też pojedyncze adresy obrazu i animacji, nie tylko listę zdjęć', () => {
    const variables = duplicate({
      ...columnsOnly,
      imageUrl: 'https://example.test/main.jpg',
      gifUrl: 'https://example.test/move.gif',
    });

    expect(variables.imageUrl).toBe('https://example.test/main.jpg');
    expect(variables.gifUrl).toBe('https://example.test/move.gif');
  });

  it('pusty albo nieczytelny dokument nie trafia do kopii', () => {
    expect(duplicate({ ...columnsOnly, enrichmentData: {} }).enrichmentDataJson).toBeNull();
    expect(duplicate({ ...columnsOnly, enrichmentData: '{zepsuty' }).enrichmentDataJson).toBeNull();
    expect(duplicate({ ...columnsOnly, enrichmentData: '[]' }).enrichmentDataJson).toBeNull();
    expect(duplicate({ ...columnsOnly, enrichmentData: '{"key":"fx-0001"}' }).enrichmentDataJson).toBeNull();
  });
});

describe('canDuplicateExercise', () => {
  it('rekordu demo nie da się zduplikować: ma cudze media z licencją tylko na pulę demo', () => {
    expect(canDuplicateExercise({ availability: 'DEMO' })).toBe(false);
  });

  it('zwykły rekord i rekord bez pola dostępności (API sprzed puli demo) duplikują się jak dotąd', () => {
    expect(canDuplicateExercise({ availability: 'STANDARD' })).toBe(true);
    expect(canDuplicateExercise({ availability: null })).toBe(true);
    expect(canDuplicateExercise({})).toBe(true);
    expect(canDuplicateExercise(null)).toBe(true);
  });
});
