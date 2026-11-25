import { describe, expect, it } from 'vitest';
import { rewardExerciseOptions } from './rewardOptions';

describe('exercise choices for a reward envelope', () => {
  it('combines individual, visible set and additional exercises, preserving patient names and removing duplicates', () => {
    expect(
      rewardExerciseOptions([
        {
          exercise: { id: 'one', name: 'Marsz' },
          exerciseSet: {
            exerciseMappings: [
              { id: 'm1', exercise: { id: 'one', name: 'Marsz' }, customName: null },
              { id: 'm2', exercise: { id: 'two', name: 'Skłon' }, customName: null },
              { id: 'm3', exercise: { id: 'three', name: 'Przysiad' }, customName: null },
            ],
          },
          exerciseOverrides: JSON.stringify({
            m2: { hidden: true },
            three: { customName: 'Przysiad przy krześle' },
            __additionalExercises__: [{ exerciseId: 'four', exerciseName: 'Deska' }, null],
          }),
        },
      ])
    ).toEqual([
      { id: 'one', name: 'Marsz' },
      { id: 'three', name: 'Przysiad przy krześle' },
      { id: 'four', name: 'Deska' },
    ]);
  });

  it('retains the directly assigned exercise when historical overrides are unreadable', () => {
    expect(
      rewardExerciseOptions([
        { exercise: { id: 'one', name: 'Marsz' }, exerciseOverrides: 'invalid', exerciseSet: null },
      ])
    ).toEqual([{ id: 'one', name: 'Marsz' }]);
  });
});
