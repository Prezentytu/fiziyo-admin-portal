import { describe, expect, it } from 'vitest';
import { EXERCISE_FIELD_METADATA, type ExerciseFieldKey } from '../displayRegistry';
import {
  ALL_EXERCISE_FIELD_KEYS,
  EXERCISE_FIELD_EDIT_CONFIG,
  EXERCISE_TEMPLATE_SCHEMA,
  PARAMETER_EDITOR_FIELD_KEYS,
  buildParamTestId,
  getFieldsForSurface,
  getParameterEditorFields,
} from '../fieldContract';

describe('fieldContract', () => {
  it('ma dokładnie jeden wpis edycyjny dla każdego ExerciseFieldKey', () => {
    const metadataKeys = Object.keys(EXERCISE_FIELD_METADATA).sort();
    const editKeys = Object.keys(EXERCISE_FIELD_EDIT_CONFIG).sort();
    expect(editKeys).toEqual(metadataKeys);
    expect(ALL_EXERCISE_FIELD_KEYS.sort()).toEqual(metadataKeys);
  });

  it('etykiety w kontrakcie są identyczne z EXERCISE_FIELD_METADATA', () => {
    for (const key of ALL_EXERCISE_FIELD_KEYS) {
      const metadata = EXERCISE_FIELD_METADATA[key];
      const editConfig = EXERCISE_FIELD_EDIT_CONFIG[key];
      expect(editConfig.key).toBe(metadata.key);
      // Contract does not redefine labels — consumers must use getFieldMetadata / EXERCISE_FIELD_METADATA
      expect(metadata.label.length).toBeGreaterThan(0);
      expect(metadata.tooltip.length).toBeGreaterThan(0);
    }
  });

  it('EXERCISE_TEMPLATE_SCHEMA zawiera pola template i nic spoza kontraktu (poza name/videoUrl/tags/type)', () => {
    const schemaKeys = Object.keys(EXERCISE_TEMPLATE_SCHEMA.shape).sort();
    const templateFieldKeys = (Object.keys(EXERCISE_FIELD_EDIT_CONFIG) as ExerciseFieldKey[])
      .filter((key) => EXERCISE_FIELD_EDIT_CONFIG[key].surfaces.includes('template'))
      .map((key) => (key === 'load' ? 'loadKg' : key));

    const expectedExtras = ['name', 'videoUrl', 'mainTags', 'additionalTags', 'type'];
    const expected = [...templateFieldKeys, ...expectedExtras].sort();
    expect(schemaKeys).toEqual(expected);
  });

  it('difficultyLevel używa UPPER enum zgodnego z GraphQL', () => {
    const rule = EXERCISE_FIELD_EDIT_CONFIG.difficultyLevel.rule;
    expect(rule.safeParse('EASY').success).toBe(true);
    expect(rule.safeParse('MEDIUM').success).toBe(true);
    expect(rule.safeParse('Easy').success).toBe(false);
    expect(rule.safeParse('Unknown').success).toBe(false);
  });

  it('getFieldsForSurface(mapping) pomija pola inherited (side, preparationTime)', () => {
    const mappingKeys = getFieldsForSurface('mapping').map((config) => config.key);
    expect(mappingKeys).not.toContain('side');
    expect(mappingKeys).not.toContain('preparationTime');
    expect(mappingKeys).not.toContain('difficultyLevel');
    expect(mappingKeys).toContain('sets');
    expect(mappingKeys).toContain('executionTime');
    expect(mappingKeys).toContain('duration');
    expect(mappingKeys).toContain('load');
  });

  it('każde pole PARAMETER_EDITOR ma kanoniczny data-testid', () => {
    for (const key of PARAMETER_EDITOR_FIELD_KEYS) {
      const testId = buildParamTestId(key);
      expect(testId.startsWith('exercise-param-')).toBe(true);
      expect(testId.length).toBeGreaterThan('exercise-param-'.length);
    }
    expect(buildParamTestId('load')).toBe('exercise-param-loadKg-input');
    expect(buildParamTestId('rangeOfMotion')).toBe('exercise-param-rom-input');
    expect(buildParamTestId('side', 'select')).toBe('exercise-param-side-select');
    expect(buildParamTestId('difficultyLevel', 'select')).toBe('exercise-param-difficulty-select');
  });

  it('integralność referencyjna: każde pole template z PARAMETER_EDITOR jest w getParameterEditorFields', () => {
    const renderedKeys = getParameterEditorFields('full').map((config) => config.key);
    for (const key of PARAMETER_EDITOR_FIELD_KEYS) {
      const config = EXERCISE_FIELD_EDIT_CONFIG[key];
      if (config.surfaces.includes('template')) {
        expect(renderedKeys).toContain(key);
      }
    }
  });

  it('executionTime ma etykietę „Czas powtórzenia” (blokuje rozjazd z „Czas 1 powtórzenia”)', () => {
    expect(EXERCISE_FIELD_METADATA.executionTime.label).toBe('Czas powtórzenia');
  });
});
