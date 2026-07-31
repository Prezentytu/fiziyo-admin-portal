import { describe, expect, it } from 'vitest';
import { EXERCISE_FIELD_METADATA, type ExerciseFieldKey } from '../displayRegistry';
import {
  ALL_EXERCISE_FIELD_KEYS,
  DEPRECATED_FIELD_KEYS,
  EXERCISE_FIELD_EDIT_CONFIG,
  EXERCISE_TEMPLATE_SCHEMA,
  PARAMETER_EDITOR_FIELD_KEYS,
  PARAMETER_SECTIONS,
  buildParamTestId,
  getFieldsForSurface,
  getParameterEditorFields,
  getParameterSections,
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

  it('getFieldsForSurface(mapping) zawiera dawkowanie + side/ROM/difficulty/treści (overridesJson)', () => {
    const mappingKeys = getFieldsForSurface('mapping').map((config) => config.key);
    expect(mappingKeys).toContain('side');
    expect(mappingKeys).toContain('difficultyLevel');
    expect(mappingKeys).toContain('rangeOfMotion');
    expect(mappingKeys).toContain('patientDescription');
    expect(mappingKeys).toContain('preparationTime');
    expect(mappingKeys).toContain('sets');
    expect(mappingKeys).toContain('executionTime');
    expect(mappingKeys).not.toContain('duration');
    expect(mappingKeys).toContain('load');
  });

  it('duration jest wycofane z edycji (surfaces puste, DEPRECATED_FIELD_KEYS)', () => {
    expect(DEPRECATED_FIELD_KEYS).toContain('duration');
    expect(EXERCISE_FIELD_EDIT_CONFIG.duration.surfaces).toEqual([]);
    expect(PARAMETER_EDITOR_FIELD_KEYS).not.toContain('duration');
  });

  it('getFieldsForSurface(patientPlan) zawiera side/ROM/difficulty i dawkowanie', () => {
    const patientPlanKeys = getFieldsForSurface('patientPlan').map((config) => config.key);
    expect(patientPlanKeys).toContain('sets');
    expect(patientPlanKeys).toContain('side');
    expect(patientPlanKeys).toContain('rangeOfMotion');
    expect(patientPlanKeys).toContain('difficultyLevel');
    expect(patientPlanKeys).toContain('patientDescription');
  });

  it('każde pole ma persistence mapping|assignmentOverride|templateOnly', () => {
    for (const key of ALL_EXERCISE_FIELD_KEYS) {
      expect(['mapping', 'assignmentOverride', 'templateOnly']).toContain(
        EXERCISE_FIELD_EDIT_CONFIG[key].persistence
      );
    }
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

  it('każde nie-deprecated ExerciseFieldKey należy do dokładnie jednej PARAMETER_SECTION', () => {
    const deprecated = new Set<ExerciseFieldKey>(DEPRECATED_FIELD_KEYS);
    const seen = new Map<ExerciseFieldKey, string>();
    for (const section of PARAMETER_SECTIONS) {
      for (const key of section.keys) {
        expect(deprecated.has(key)).toBe(false);
        expect(seen.has(key)).toBe(false);
        seen.set(key, section.id);
      }
    }
    const expected = ALL_EXERCISE_FIELD_KEYS.filter((key) => !deprecated.has(key)).sort();
    expect([...seen.keys()].sort()).toEqual(expected);
  });

  it('PARAMETER_SECTIONS mają stabilną kolejność id', () => {
    expect(PARAMETER_SECTIONS.map((section) => section.id)).toEqual([
      'basic',
      'timing',
      'classification',
      'content',
    ]);
  });

  it('getParameterSections(template) zwraca basic + advanced bez content domyślnie', () => {
    const sections = getParameterSections('template');
    expect(sections.map((section) => section.id)).toEqual(['basic', 'timing', 'classification']);
    expect(sections.every((section) => section.fields.every((field) => field.role === 'editable'))).toBe(
      true
    );
  });

  it('getParameterSections(mapping) edytuje side/difficulty i content (bez inherited)', () => {
    const sections = getParameterSections('mapping', { includeContent: true });
    const classification = sections.find((section) => section.id === 'classification');
    expect(classification).toBeDefined();
    expect(classification?.fields.map((field) => field.key)).toContain('side');
    expect(classification?.fields.find((field) => field.key === 'side')?.role).toBe('editable');
    expect(sections.some((section) => section.id === 'content')).toBe(true);

    const timing = sections.find((section) => section.id === 'timing');
    expect(timing?.fields.map((field) => field.key)).not.toContain('duration');
  });

  it('getParameterSections respektuje omitFields i includeContent', () => {
    const withoutSets = getParameterSections('patientPlan', {
      omitFields: ['sets', 'reps'],
      includeContent: true,
    });
    const basic = withoutSets.find((section) => section.id === 'basic');
    expect(basic?.fields.map((field) => field.key)).not.toContain('sets');
    expect(basic?.fields.map((field) => field.key)).not.toContain('reps');
    expect(withoutSets.some((section) => section.id === 'content')).toBe(true);
  });
});
