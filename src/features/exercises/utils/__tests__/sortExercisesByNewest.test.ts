import { describe, expect, it } from 'vitest';

import { sortExercisesByNewest } from '../sortExercisesByNewest';

describe('sortExercisesByNewest', () => {
  it('sorts by createdAt descending', () => {
    const exercises = [
      { id: '1', createdAt: '2026-03-01T10:00:00Z' },
      { id: '2', createdAt: '2026-03-03T10:00:00Z' },
      { id: '3', createdAt: '2026-03-02T10:00:00Z' },
    ];

    const result = sortExercisesByNewest(exercises);
    expect(result.map((exercise) => exercise.id)).toEqual(['2', '3', '1']);
  });

  it('falls back to creationTime for legacy records', () => {
    const exercises = [
      { id: '1', creationTime: '2026-03-01T10:00:00Z' },
      { id: '2', creationTime: '2026-03-03T10:00:00Z' },
      { id: '3', creationTime: '2026-03-02T10:00:00Z' },
    ];

    const result = sortExercisesByNewest(exercises);
    expect(result.map((exercise) => exercise.id)).toEqual(['2', '3', '1']);
  });

  it('keeps invalid or missing dates at the end', () => {
    const exercises = [
      { id: '1', createdAt: undefined },
      { id: '2', createdAt: 'invalid-date' },
      { id: '3', createdAt: '2026-03-02T10:00:00Z' },
    ];

    const result = sortExercisesByNewest(exercises);
    expect(result[0]?.id).toBe('3');
  });
});
