import { describe, expect, it } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import { readContraindicationTextsV33, writeContraindicationsV33 } from '../contentV33';
import { computeCompleteness } from '../enrichmentSkeleton';

const golden = goldenV33 as ExerciseEnrichmentData;

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
