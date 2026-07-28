import { describe, expect, it } from 'vitest';

import {
  ALL_EXERCISE_FIELD_KEYS,
  EXERCISE_FIELD_EDIT_CONFIG,
  getAssignmentOverrideFieldKeys,
  getFieldsForSurface,
  getInheritedFieldKeys,
} from '../fieldContract';
import {
  buildOverrideDelta,
  mergeOverrideMap,
  parseOverrideMap,
  splitPersonalization,
} from '../exercisePersonalizationWriter';

describe('fieldContract persistence routing', () => {
  it('każde ExerciseFieldKey ma persistence', () => {
    for (const key of ALL_EXERCISE_FIELD_KEYS) {
      expect(EXERCISE_FIELD_EDIT_CONFIG[key].persistence).toBeDefined();
    }
  });

  it('patientPlan zawiera mapping + assignmentOverride, bez templateOnly', () => {
    const keys = getFieldsForSurface('patientPlan').map((config) => config.key);
    expect(keys).toContain('sets');
    expect(keys).toContain('side');
    expect(keys).toContain('rangeOfMotion');
    expect(keys).toContain('difficultyLevel');
    expect(keys).toContain('patientDescription');
    expect(keys).toContain('clinicalDescription');
    expect(keys).toContain('audioCue');
  });

  it('getInheritedFieldKeys(patientPlan) jest puste', () => {
    expect(getInheritedFieldKeys('patientPlan')).toEqual([]);
    expect(getInheritedFieldKeys('patientOverride')).toEqual([]);
  });

  it('getInheritedFieldKeys(mapping) zawiera side/ROM/difficulty', () => {
    const keys = getInheritedFieldKeys('mapping');
    expect(keys).toContain('side');
    expect(keys).toContain('rangeOfMotion');
    expect(keys).toContain('difficultyLevel');
  });

  it('assignmentOverride keys match routing table', () => {
    expect(getAssignmentOverrideFieldKeys().sort()).toEqual(
      [
        'audioCue',
        'clinicalDescription',
        'difficultyLevel',
        'patientDescription',
        'rangeOfMotion',
        'side',
      ].sort()
    );
  });
});

describe('splitPersonalization', () => {
  it('routinguje dawkowanie do mappingVariables, pola kliniczne do overrideDelta', () => {
    const result = splitPersonalization({
      sets: 4,
      reps: 12,
      loadKg: 10,
      tempo: '2-0-2-0',
      side: 'left',
      rangeOfMotion: '90°',
      difficultyLevel: 'HARD',
      patientDescription: 'Opis pacjenta',
      clinicalDescription: 'Kliniczny',
      audioCue: 'Wdech',
    });

    expect(result.mappingVariables).toEqual(
      expect.objectContaining({
        sets: 4,
        reps: 12,
        loadWeightKg: 10,
        tempo: '2-0-2-0',
      })
    );
    expect(result.mappingVariables).not.toHaveProperty('side');
    expect(result.overrideDelta).toEqual({
      exerciseSide: 'left',
      rangeOfMotion: '90°',
      difficultyLevel: 'HARD',
      patientDescription: 'Opis pacjenta',
      clinicalDescription: 'Kliniczny',
      audioCue: 'Wdech',
    });
  });

  it('normalizuje side do lowercase i difficulty do UPPER', () => {
    const result = splitPersonalization({
      exerciseSide: 'BOTH',
      difficultyLevel: 'easy',
    });
    expect(result.overrideDelta.exerciseSide).toBe('both');
    expect(result.overrideDelta.difficultyLevel).toBe('EASY');
  });
});

describe('buildOverrideDelta', () => {
  it('nie tworzy klucza gdy wartość równa dziedziczonej', () => {
    const delta = buildOverrideDelta(
      { side: 'both', rangeOfMotion: 'pełny', difficultyLevel: 'MEDIUM' },
      { side: 'both', rangeOfMotion: 'pełny', difficultyLevel: 'MEDIUM' }
    );
    expect(delta).toEqual({});
  });

  it('zapisuje jawne czyszczenie jako sentinele, nie null', () => {
    const delta = buildOverrideDelta(
      { side: 'left', rangeOfMotion: '90°', difficultyLevel: 'HARD', patientDescription: 'X' },
      { side: 'none', rangeOfMotion: '', difficultyLevel: 'UNKNOWN', patientDescription: '' }
    );
    expect(delta.exerciseSide).toBe('none');
    expect(delta.rangeOfMotion).toBe('');
    expect(delta.difficultyLevel).toBe('UNKNOWN');
    expect(delta.patientDescription).toBe('');
  });

  it('tworzy deltę tylko dla zmienionych pól', () => {
    const delta = buildOverrideDelta(
      { sets: 3, side: 'both', tempo: '2-0-2-0' },
      { sets: 5, side: 'both', tempo: '1-0-1-0' }
    );
    expect(delta).toEqual({ sets: 5, tempo: '1-0-1-0' });
  });
});

describe('mergeOverrideMap', () => {
  it('merguje deltę pod mappingId i usuwa przy pustej delcie', () => {
    const withDelta = mergeOverrideMap('{}', 'm1', { exerciseSide: 'left' });
    expect(parseOverrideMap(withDelta)).toEqual({ m1: { exerciseSide: 'left' } });

    const cleared = mergeOverrideMap(withDelta, 'm1', {});
    expect(parseOverrideMap(cleared)).toEqual({});
  });

  it('zachowuje istniejące klucze przy częściowej delcie', () => {
    const existing = JSON.stringify({ m1: { sets: 4, exerciseSide: 'left' } });
    const merged = mergeOverrideMap(existing, 'm1', { difficultyLevel: 'HARD' });
    expect(parseOverrideMap(merged).m1).toEqual({
      sets: 4,
      exerciseSide: 'left',
      difficultyLevel: 'HARD',
    });
  });
});

describe('replaceOverrideMapEntry', () => {
  it('zastępuje cały wpis mappingu (nie merguje ze starymi kluczami)', async () => {
    const { replaceOverrideMapEntry } = await import('../exercisePersonalizationWriter');
    const existing = JSON.stringify({ m1: { sets: 4, exerciseSide: 'left' } });
    const replaced = replaceOverrideMapEntry(existing, 'm1', { difficultyLevel: 'HARD' });
    expect(parseOverrideMap(replaced).m1).toEqual({ difficultyLevel: 'HARD' });
  });
});
