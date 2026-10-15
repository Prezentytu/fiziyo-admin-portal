import { describe, expect, it } from 'vitest';
import { formatExerciseCount, polishPlural } from './polishPlural';

describe('polishPlural', () => {
  it('picks one / few / many forms', () => {
    const forms = (count: number) => polishPlural(count, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń');
    expect([0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 24, 25, 112, 122].map(forms)).toEqual([
      'ćwiczeń',
      'ćwiczenie',
      'ćwiczenia',
      'ćwiczenia',
      'ćwiczeń',
      'ćwiczeń',
      'ćwiczeń',
      'ćwiczeń',
      'ćwiczeń',
      'ćwiczenia',
      'ćwiczenia',
      'ćwiczeń',
      'ćwiczeń',
      'ćwiczenia',
    ]);
  });

  it('formats exercise counts', () => {
    expect(formatExerciseCount(1)).toBe('1 ćwiczenie');
    expect(formatExerciseCount(3)).toBe('3 ćwiczenia');
    expect(formatExerciseCount(8)).toBe('8 ćwiczeń');
  });
});
