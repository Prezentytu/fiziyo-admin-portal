import { describe, expect, it } from 'vitest';

import { calculateExerciseTotalSeconds } from '@/utils/exerciseTime';
import { toBuilderExercise } from '../toBuilderExercise';

/** Wektor 3 x 10, 3 s, przerwa 2 s, między seriami 30 s, przygotowanie 5 s: 3.3 = 359 s, bez wersji = 209 s. */
const exerciseOf = (record: object) =>
  ({
    id: 'ex-alt',
    name: 'Wykrok',
    type: 'REPS',
    side: 'ALTERNATING',
    defaultSets: 3,
    defaultReps: 10,
    defaultExecutionTime: 3,
    defaultRestBetweenSets: 30,
    defaultRestBetweenReps: 2,
    preparationTime: 5,
    ...record,
  }) as never;

const seconds = (record: object) => {
  const builder = toBuilderExercise(exerciseOf(record));
  return calculateExerciseTotalSeconds({
    sets: builder.sets,
    reps: builder.reps,
    executionTime: builder.executionTime,
    restSets: builder.restSets,
    restReps: builder.restReps,
    preparationTime: builder.preparationTime,
    side: builder.exerciseSide,
    type: builder.type,
    alternatingPerSide: builder.alternatingPerSide,
  }).seconds;
};

describe('toBuilderExercise: wersja rekordu z listy ćwiczeń', () => {
  it('rekord 3.3 niesie flagę „na stronę”', () => {
    expect(toBuilderExercise(exerciseOf({ enrichmentData: { schemaVersion: '3.3' } })).alternatingPerSide).toBe(true);
    expect(seconds({ enrichmentData: { schemaVersion: '3.3' } })).toBe(359);
  });

  it('rekord bez wersji liczy łącznie jak dotąd', () => {
    expect(toBuilderExercise(exerciseOf({ enrichmentData: {} })).alternatingPerSide).toBe(false);
    expect(seconds({ enrichmentData: {} })).toBe(209);
  });
});
