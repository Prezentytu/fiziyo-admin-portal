import { describe, expect, it } from 'vitest';

import * as exerciseQueries from '../queries/exercises.queries';

describe('admin exercise query surface', () => {
  it('does not re-export the withdrawn unscoped GetExercises probe', () => {
    expect(exerciseQueries).not.toHaveProperty('GET_EXERCISES_QUERY');
    expect(exerciseQueries).not.toHaveProperty('GET_EXERCISES_WITH_FILTER_QUERY');
  });
});
