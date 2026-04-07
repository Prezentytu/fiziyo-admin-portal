import { describe, expect, it } from 'vitest';
import {
  DIALOG_EXERCISE_FIELD_ORDER,
  EMPTY_NUMERIC_VALUE,
  EXERCISE_FIELD_METADATA,
  HIDE_EXERCISE_TAGS,
  formatDifficultyLabel,
  formatFieldValueWithPlaceholder,
  formatSideLabel,
} from '../displayRegistry';
import { normalizeExerciseFieldValues } from '../displayNormalizer';

describe('displayRegistry', () => {
  it('utrzymuje kanoniczną kolejność pól dialogu', () => {
    expect(DIALOG_EXERCISE_FIELD_ORDER).toEqual([
      'sets',
      'reps',
      'duration',
      'executionTime',
      'restSets',
      'restReps',
      'preparationTime',
      'tempo',
      'load',
      'side',
      'rangeOfMotion',
      'difficultyLevel',
      'patientDescription',
      'clinicalDescription',
      'audioCue',
      'notes',
    ]);
  });

  it('formatuje wartości i placeholdery zgodnie z kontraktem', () => {
    const source = normalizeExerciseFieldValues({
      defaultSets: 3,
      defaultReps: 10,
      defaultDuration: null,
      defaultExecutionTime: 12,
      defaultRestBetweenSets: 60,
      side: 'LEFT',
    });

    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.sets, source)).toBe('3');
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.reps, source)).toBe('10');
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.duration, source)).toBe(EMPTY_NUMERIC_VALUE);
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.executionTime, source)).toBe('12s');
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.side, source, 'Nie ustawiono')).toBe('Lewa strona');
  });

  it('normalizuje etykiety difficulty i side', () => {
    expect(formatDifficultyLabel('MEDIUM')).toBe('Średni');
    expect(formatDifficultyLabel('Custom')).toBe('Custom');
    expect(formatSideLabel('none')).toBe('Bez podziału');
  });

  it('utrzymuje globalny feature-flag ukrycia tagów', () => {
    expect(HIDE_EXERCISE_TAGS).toBe(true);
  });
});
