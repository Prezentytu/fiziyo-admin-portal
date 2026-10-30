import { describe, expect, it } from 'vitest';

import { normalizeExerciseSide, normalizeExerciseType } from '../exerciseEnums';

describe('normalizeExerciseType', () => {
  it('mapuje wyjście GraphQL (REPS/TIME) i małe litery na wartości panelu', () => {
    expect(normalizeExerciseType('REPS')).toBe('reps');
    expect(normalizeExerciseType('TIME')).toBe('time');
    expect(normalizeExerciseType(' time ')).toBe('time');
  });

  it('zwraca undefined dla pustych i nieznanych wartości', () => {
    expect(normalizeExerciseType(undefined)).toBeUndefined();
    expect(normalizeExerciseType(null)).toBeUndefined();
    expect(normalizeExerciseType('')).toBeUndefined();
    expect(normalizeExerciseType('hold')).toBeUndefined();
  });
});

describe('normalizeExerciseSide', () => {
  it('mapuje każdą wartość ExerciseSide z GraphQL na małe litery', () => {
    expect(normalizeExerciseSide('NONE')).toBe('none');
    expect(normalizeExerciseSide('LEFT')).toBe('left');
    expect(normalizeExerciseSide('RIGHT')).toBe('right');
    expect(normalizeExerciseSide('BOTH')).toBe('both');
    expect(normalizeExerciseSide('ALTERNATING')).toBe('alternating');
    expect(normalizeExerciseSide('both')).toBe('both');
  });

  it('zwraca undefined dla pustych i nieznanych wartości', () => {
    expect(normalizeExerciseSide(undefined)).toBeUndefined();
    expect(normalizeExerciseSide('')).toBeUndefined();
    expect(normalizeExerciseSide('sides')).toBeUndefined();
  });
});
