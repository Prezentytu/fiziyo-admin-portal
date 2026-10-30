import { describe, expect, it } from 'vitest';

import { EXERCISE_PARAM_DEFAULTS, readExerciseTemplateParams } from '../exerciseParamDefaults';

describe('readExerciseTemplateParams', () => {
  it('stosuje kanon dla brakujących pól: serie 3, przerwa 60, przerwa między powtórzeniami 0, przygotowanie 5', () => {
    expect(readExerciseTemplateParams(undefined)).toEqual({
      sets: 3,
      reps: EXERCISE_PARAM_DEFAULTS.reps,
      duration: undefined,
      executionTime: undefined,
      restSets: 60,
      restReps: 0,
      preparationTime: 5,
    });
  });

  it('czyta Exercise.defaultSets i pozostałe pola default*, łącznie z zerami', () => {
    expect(
      readExerciseTemplateParams({
        defaultSets: 4,
        defaultReps: 8,
        defaultDuration: 30,
        defaultExecutionTime: 3,
        defaultRestBetweenSets: 0,
        defaultRestBetweenReps: 2,
        preparationTime: 0,
      })
    ).toEqual({
      sets: 4,
      reps: 8,
      duration: 30,
      executionTime: 3,
      restSets: 0,
      restReps: 2,
      preparationTime: 0,
    });
  });

  it('nie czyta pola `sets`, którego Exercise w GraphQL nie ma', () => {
    const legacy = { sets: 7, restSets: 15 } as unknown as Parameters<typeof readExerciseTemplateParams>[0];
    const result = readExerciseTemplateParams(legacy);
    expect(result.sets).toBe(3);
    expect(result.restSets).toBe(60);
  });
});
