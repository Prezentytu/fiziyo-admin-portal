import { describe, expect, it } from 'vitest';

import { EMPTY_EXERCISE_PARAMS, getExerciseDefaultParams } from './exerciseDefaults';

describe('getExerciseDefaultParams', () => {
  it('uzywa wartosci defaultX gdy sa dostepne', () => {
    const defaults = getExerciseDefaultParams({
      defaultSets: 5,
      defaultReps: 15,
      defaultDuration: 45,
      defaultRestBetweenSets: 30,
      defaultRestBetweenReps: 5,
      defaultExecutionTime: 20,
      side: 'Left',
    });

    expect(defaults).toMatchObject({
      sets: 5,
      reps: 15,
      duration: 45,
      restSets: 30,
      restReps: 5,
      executionTime: 20,
      exerciseSide: 'left',
    });
  });

  it('fallbackuje do wartosci legacy gdy brak defaultX', () => {
    const defaults = getExerciseDefaultParams({
      sets: 4,
      reps: 12,
      duration: 25,
      restSets: 40,
      restReps: 2,
      exerciseSide: 'right',
    });

    expect(defaults).toMatchObject({
      sets: 4,
      reps: 12,
      duration: 25,
      restSets: 40,
      restReps: 2,
      executionTime: 0,
      exerciseSide: 'right',
    });
  });

  it('fallbackuje do wartosci pustych gdy brak danych', () => {
    const defaults = getExerciseDefaultParams({});

    expect(defaults).toEqual(EMPTY_EXERCISE_PARAMS);
  });

  it('preferuje side nad exerciseSide', () => {
    const defaults = getExerciseDefaultParams({
      side: 'Alternating',
      exerciseSide: 'both',
    });

    expect(defaults.exerciseSide).toBe('alternating');
  });

  it('nie nadpisuje duration gdy defaultDuration jest ustawione na zero', () => {
    const defaults = getExerciseDefaultParams({
      defaultDuration: 0,
      duration: 30,
    });

    expect(defaults.duration).toBe(0);
  });
});
