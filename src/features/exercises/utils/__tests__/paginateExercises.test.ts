import { describe, expect, it } from 'vitest';

import { paginateExercises } from '../paginateExercises';

const exercises = Array.from({ length: 50 }, (_, index) => ({ id: String(index + 1) }));

describe('paginateExercises', () => {
  it('returns only one page of a long exercise list', () => {
    const result = paginateExercises(exercises, 1, 24);

    expect(result.items).toHaveLength(24);
    expect(result.items[0]?.id).toBe('1');
    expect(result.totalCount).toBe(50);
    expect(result.totalPages).toBe(3);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.hasNextPage).toBe(true);
  });

  it('returns the remainder on the last page', () => {
    const result = paginateExercises(exercises, 3, 24);

    expect(result.items.map((exercise) => exercise.id)).toEqual(['49', '50']);
    expect(result.hasPreviousPage).toBe(true);
    expect(result.hasNextPage).toBe(false);
  });

  it('clamps a page that no longer exists after the list shrinks', () => {
    const result = paginateExercises(exercises.slice(0, 5), 4, 24);

    expect(result.page).toBe(1);
    expect(result.items).toHaveLength(5);
  });

  it('handles an empty list', () => {
    const result = paginateExercises([], 1, 24);

    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
  });
});
