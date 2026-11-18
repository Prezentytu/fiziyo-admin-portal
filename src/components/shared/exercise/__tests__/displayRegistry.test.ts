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
      'side',
      'preparationTime',
      'tempo',
      'restReps',
      'restSets',
      'load',
      'equipment',
      'resistance',
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
    expect(formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.executionTime, source)).toBe('12 s');
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

  it('sprzęt nadpisany w przypisaniu albo pozycji zestawu wygrywa z dokumentem i kolumną', () => {
    const document = { schemaVersion: '3.3', equipment_items: [{ label: 'Mata' }] };
    expect(normalizeExerciseFieldValues({ enrichmentData: document, equipmentOverride: 'Krzesło' }).equipment).toBe('Krzesło');
    expect(normalizeExerciseFieldValues({ equipment: 'Guma', equipmentOverride: 'Krzesło' }).equipment).toBe('Krzesło');
    expect(normalizeExerciseFieldValues({ enrichmentData: document, equipmentOverride: ' ' }).equipment).toBe('Mata');
  });

  it('sprzęt rekordu starego pochodzi z kolumny, którą zapisuje edycja, nie z listy w dokumencie', () => {
    const legacy = { $schema: 'fiziyo-exercise-v3', equipment: ['Mata'] };
    expect(normalizeExerciseFieldValues({ equipment: 'Guma, krzesło', enrichmentData: legacy }).equipment).toBe('Guma, krzesło');
    expect(normalizeExerciseFieldValues({ equipment: 'Guma, krzesło', enrichmentData: { equipment: ['Mata'] } }).equipment).toBe(
      'Guma, krzesło'
    );
    expect(normalizeExerciseFieldValues({ equipment: null, enrichmentData: legacy }).equipment).toBeUndefined();
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
