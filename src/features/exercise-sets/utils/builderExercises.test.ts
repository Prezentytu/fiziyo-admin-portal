import { describe, expect, it } from 'vitest';

import { countExerciseUsage, toBuilderExercises } from './builderExercises';

describe('toBuilderExercises', () => {
  it('keeps content fields the set editor needs and normalizes side and description', () => {
    const enrichmentData = { $schema: 'fiziyo-exercise-v3', patient: { steps: ['Krok 1'] } };

    const [exercise] = toBuilderExercises(
      [
        {
          id: 'e1',
          name: 'Przysiad',
          side: 'Left',
          description: 'Opis',
          clinicalDescription: 'Dla terapeuty',
          audioCue: 'Wdech',
          tempo: '2-1-2',
          enrichmentData,
        },
      ],
      new Map()
    );

    expect(exercise).toMatchObject({
      clinicalDescription: 'Dla terapeuty',
      audioCue: 'Wdech',
      tempo: '2-1-2',
      enrichmentData,
      patientDescription: 'Opis',
      exerciseSide: 'left',
    });
  });

  it('does not offer inactive exercises', () => {
    expect(toBuilderExercises([{ id: 'e1', name: 'A', isActive: false }], new Map())).toEqual([]);
  });
});

describe('countExerciseUsage', () => {
  it('counts each mapping of an exercise across sets', () => {
    expect(
      countExerciseUsage([
        { exerciseMappings: [{ exerciseId: 'a' }, { exerciseId: 'b' }] },
        { exerciseMappings: [{ exerciseId: 'a' }, { exerciseId: null }] },
        { exerciseMappings: null },
      ])
    ).toEqual({ a: 2, b: 1 });
  });
});
