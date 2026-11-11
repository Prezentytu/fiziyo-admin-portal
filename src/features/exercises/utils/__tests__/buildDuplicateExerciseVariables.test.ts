import { describe, expect, it } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { buildCreateExerciseVariables } from '../buildCreateExerciseVariables';
import { buildDuplicateExerciseVariables, type DuplicateExerciseSource } from '../buildDuplicateExerciseVariables';

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

    expect(copied).toEqual(document);
    expect(copied.schemaVersion).toBe('3.3');
    expect(Object.keys(copied)).toEqual(Object.keys(document));
    expect(copied.breathing.pattern).toBeNull();
    expect(copied.classification.structures).toEqual([]);
    expect(JSON.stringify(document)).toBe(before);
  });

  it('dokument podany jako tekst JSON też trafia do kopii', () => {
    const result = duplicate({ ...columnsOnly, enrichmentData: JSON.stringify(goldenV33) });
    expect(JSON.parse(result.enrichmentDataJson ?? 'null')).toEqual(goldenV33);
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

  it('pusty albo nieczytelny dokument nie trafia do kopii', () => {
    expect(duplicate({ ...columnsOnly, enrichmentData: {} }).enrichmentDataJson).toBeNull();
    expect(duplicate({ ...columnsOnly, enrichmentData: '{zepsuty' }).enrichmentDataJson).toBeNull();
    expect(duplicate({ ...columnsOnly, enrichmentData: '[]' }).enrichmentDataJson).toBeNull();
  });
});
