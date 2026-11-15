import { describe, expect, it } from 'vitest';
import {
  DIALOG_EXERCISE_FIELD_ORDER,
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
      'executionTime',
      'restSets',
      'restReps',
      'preparationTime',
      'tempo',
      'load',
      'resistance',
      'equipment',
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
      defaultDuration: 300,
      defaultExecutionTime: 12,
      defaultRestBetweenSets: 60,
      side: 'LEFT',
    });

    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.sets, source)).toBe('3');
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.reps, source)).toBe('10');
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.duration, source)).toBe('5 minut');
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.executionTime, source)).toBe('12s');
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.side, source, 'Nie ustawiono')).toBe('Tylko lewa');
  });

  it('sprzęt rekordu 3.3 pochodzi z equipment_items, a kolumna jest tylko zapasem', () => {
    const document = {
      schemaVersion: '3.3',
      equipment_items: [{ label: 'Mata' }, { label: 'Taśma oporowa', qty: 2 }],
    };
    expect(normalizeExerciseFieldValues({ enrichmentData: document }).equipment).toBe('Mata, Taśma oporowa × 2');
    expect(normalizeExerciseFieldValues({ enrichmentData: document, equipment: 'Piłka' }).equipment).toBe(
      'Mata, Taśma oporowa × 2'
    );
    expect(normalizeExerciseFieldValues({ equipment: 'Piłka' }).equipment).toBe('Piłka');
    expect(normalizeExerciseFieldValues({}).equipment).toBeUndefined();
  });

  it('normalizuje etykiety difficulty i side', () => {
    expect(formatDifficultyLabel('MEDIUM')).toBe('Średni');
    expect(formatDifficultyLabel('Custom')).toBe('Custom');
    expect(formatSideLabel('none')).toBe('Razem');
    expect(formatSideLabel('both')).toBe('Na każdą stronę');
  });

  it('utrzymuje globalny feature-flag ukrycia tagów', () => {
    expect(HIDE_EXERCISE_TAGS).toBe(true);
  });
});
