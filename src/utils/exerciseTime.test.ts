import { describe, expect, it } from 'vitest';
import { calculateExerciseTotalSeconds, formatExerciseDuration, parseTempo } from './exerciseTime';

describe('parseTempo', () => {
  it('zwraca sume segmentow dla poprawnego tempa', () => {
    expect(parseTempo('3-1-2-0')).toBe(6);
  });

  it('zwraca null dla niepoprawnego tempa', () => {
    expect(parseTempo('3-x-2-0')).toBeNull();
  });
});

describe('calculateExerciseTotalSeconds', () => {
  it('liczy czas na podstawie executionTime', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 10,
      executionTime: 8,
    });

    expect(result).toEqual({
      seconds: 240,
      isEstimate: false,
    });
  });

  it('liczy czas na podstawie tempa gdy brak executionTime', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 2,
      reps: 6,
      tempo: '2-1-2-0',
    });

    expect(result).toEqual({
      seconds: 60,
      isEstimate: false,
    });
  });

  it('uzywa fallback 3s na powtorzenie gdy brak executionTime i tempa', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 2,
      reps: 10,
    });

    expect(result).toEqual({
      seconds: 60,
      isEstimate: true,
    });
  });

  it('podwaja efektywne powtorzenia dla side=both', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 1,
      reps: 10,
      executionTime: 5,
      side: 'both',
    });

    expect(result).toEqual({
      seconds: 100,
      isEstimate: false,
    });
  });

  it('daje priorytet executionTime nad duration', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 10,
      executionTime: 10,
      duration: 40,
    });

    expect(result).toEqual({
      seconds: 300,
      isEstimate: false,
    });
  });

  it('uzywa duration jako fallback gdy brak executionTime', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 10,
      duration: 40,
    });

    expect(result).toEqual({
      seconds: 120,
      isEstimate: false,
    });
  });

  it('dodaje preparationTime jednorazowo oraz restSets i restReps', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 4,
      executionTime: 5,
      restReps: 2,
      restSets: 30,
      preparationTime: 10,
    });

    // 3 * (4*5 + 3*2) + 2*30 + 10 = 148
    expect(result).toEqual({
      seconds: 148,
      isEstimate: false,
    });
  });
});

describe('formatExerciseDuration', () => {
  it('formatuje dokladny czas bez estymacji', () => {
    expect(formatExerciseDuration(150, false)).toBe('2 min 30 s');
  });

  it('formatuje czas estymowany z prefiksem', () => {
    expect(formatExerciseDuration(150, true)).toBe('~3 min');
  });
});
