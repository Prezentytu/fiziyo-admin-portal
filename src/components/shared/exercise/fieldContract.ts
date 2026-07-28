import { z } from 'zod';
import {
  EXERCISE_FIELD_METADATA,
  type ExerciseFieldKey,
  type ExerciseFieldMetadata,
} from './displayRegistry';

/**
 * Single source of truth for exercise field editing semantics.
 * Surfaces derive subset + layout only — never labels, validation, or mutation mapping.
 *
 * Labels/tooltips come from EXERCISE_FIELD_METADATA (displayRegistry).
 */

export type ExerciseFieldSurface = 'template' | 'mapping' | 'patientOverride';

export type ExerciseFieldEditor = 'number' | 'text' | 'textarea' | 'select';

export type ExerciseFieldTier = 1 | 2 | 3 | 4;

/** Mapping persistence status — some fields inherit from template until backend supports them. */
export type MappingFieldMode = 'edit' | 'inherited' | 'none';

export interface ExerciseFieldOption {
  value: string;
  label: string;
}

export interface ExerciseFieldEditConfig {
  key: ExerciseFieldKey;
  editor: ExerciseFieldEditor;
  tier: ExerciseFieldTier;
  surfaces: readonly ExerciseFieldSurface[];
  /** How the field behaves on ExerciseSetMapping (side/prepTime lack backend persistence). */
  mappingMode: MappingFieldMode;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly ExerciseFieldOption[];
  rule: z.ZodTypeAny;
  /** Canonical data-testid suffix after surface prefix (e.g. sets-input → exercise-param-sets-input). */
  testIdSuffix: string;
}

/**
 * Feature flag: expose tempo / loadKg / preparationTime / rangeOfMotion on patient overrides.
 * Requires fizjo-app to read these JSON keys from exerciseOverrides (cross-repo gate, SPEC-012).
 */
export const ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS = true;

export const SIDE_OPTIONS: readonly ExerciseFieldOption[] = [
  { value: 'none', label: 'Bez podziału' },
  { value: 'left', label: 'Lewa strona' },
  { value: 'right', label: 'Prawa strona' },
  { value: 'both', label: 'Obie strony' },
  { value: 'alternating', label: 'Naprzemiennie' },
] as const;

export const DIFFICULTY_OPTIONS: readonly ExerciseFieldOption[] = [
  { value: 'UNKNOWN', label: 'Nieokreślony' },
  { value: 'EASY', label: 'Łatwy' },
  { value: 'MEDIUM', label: 'Średni' },
  { value: 'HARD', label: 'Trudny' },
  { value: 'EXPERT', label: 'Ekspert' },
] as const;

export const SIDE_VALUES = SIDE_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

export const DIFFICULTY_VALUES = DIFFICULTY_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

const optionalNullableNumber = (min: number, max: number) =>
  z.number().min(min).max(max).optional().nullable();

const optionalText = (max: number) => z.string().max(max).optional().nullable();

/**
 * Edit configs keyed by ExerciseFieldKey.
 * Every key from EXERCISE_FIELD_METADATA must have exactly one entry.
 */
export const EXERCISE_FIELD_EDIT_CONFIG: Record<ExerciseFieldKey, ExerciseFieldEditConfig> = {
  sets: {
    key: 'sets',
    editor: 'number',
    tier: 1,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    min: 0,
    max: 100,
    rule: optionalNullableNumber(0, 100),
    testIdSuffix: 'sets-input',
  },
  reps: {
    key: 'reps',
    editor: 'number',
    tier: 1,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    min: 0,
    max: 1000,
    rule: optionalNullableNumber(0, 1000),
    testIdSuffix: 'reps-input',
  },
  executionTime: {
    key: 'executionTime',
    editor: 'number',
    tier: 1,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    suffix: 's',
    min: 0,
    max: 300,
    step: 1,
    rule: optionalNullableNumber(0, 300),
    testIdSuffix: 'executionTime-input',
  },
  restSets: {
    key: 'restSets',
    editor: 'number',
    tier: 2,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    suffix: 's',
    min: 0,
    max: 300,
    rule: optionalNullableNumber(0, 300),
    testIdSuffix: 'restSets-input',
  },
  load: {
    key: 'load',
    editor: 'number',
    tier: 2,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    suffix: 'kg',
    min: 0,
    max: 500,
    step: 0.5,
    rule: optionalNullableNumber(0, 500),
    testIdSuffix: 'loadKg-input',
  },
  restReps: {
    key: 'restReps',
    editor: 'number',
    tier: 3,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    suffix: 's',
    min: 0,
    max: 300,
    rule: optionalNullableNumber(0, 300),
    testIdSuffix: 'restReps-input',
  },
  preparationTime: {
    key: 'preparationTime',
    editor: 'number',
    tier: 3,
    surfaces: ['template', 'patientOverride'],
    mappingMode: 'inherited',
    suffix: 's',
    min: 0,
    max: 300,
    rule: optionalNullableNumber(0, 300),
    testIdSuffix: 'preparationTime-input',
  },
  tempo: {
    key: 'tempo',
    editor: 'text',
    tier: 3,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    rule: optionalText(20),
    testIdSuffix: 'tempo-input',
  },
  side: {
    key: 'side',
    editor: 'select',
    tier: 3,
    surfaces: ['template', 'patientOverride'],
    mappingMode: 'inherited',
    options: SIDE_OPTIONS,
    rule: z.enum(SIDE_VALUES).optional().nullable(),
    testIdSuffix: 'side-select',
  },
  rangeOfMotion: {
    key: 'rangeOfMotion',
    editor: 'text',
    tier: 4,
    surfaces: ['template', 'patientOverride'],
    mappingMode: 'none',
    rule: optionalText(100),
    testIdSuffix: 'rom-input',
  },
  difficultyLevel: {
    key: 'difficultyLevel',
    editor: 'select',
    tier: 3,
    surfaces: ['template'],
    mappingMode: 'none',
    options: DIFFICULTY_OPTIONS,
    rule: z.enum(DIFFICULTY_VALUES).optional().nullable(),
    testIdSuffix: 'difficulty-select',
  },
  duration: {
    key: 'duration',
    editor: 'number',
    tier: 4,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    suffix: 's',
    min: 0,
    max: 3600,
    step: 5,
    rule: optionalNullableNumber(0, 3600),
    testIdSuffix: 'duration-input',
  },
  patientDescription: {
    key: 'patientDescription',
    editor: 'textarea',
    tier: 2,
    surfaces: ['template'],
    mappingMode: 'none',
    rule: z.string().optional().nullable(),
    testIdSuffix: 'patientDescription-input',
  },
  clinicalDescription: {
    key: 'clinicalDescription',
    editor: 'textarea',
    tier: 4,
    surfaces: ['template'],
    mappingMode: 'none',
    rule: z.string().optional().nullable(),
    testIdSuffix: 'clinicalDescription-input',
  },
  audioCue: {
    key: 'audioCue',
    editor: 'text',
    tier: 4,
    surfaces: ['template'],
    mappingMode: 'none',
    rule: optionalText(200),
    testIdSuffix: 'audioCue-input',
  },
  notes: {
    key: 'notes',
    editor: 'textarea',
    tier: 3,
    surfaces: ['template', 'mapping', 'patientOverride'],
    mappingMode: 'edit',
    rule: z.string().optional().nullable(),
    testIdSuffix: 'notes-input',
  },
};

/** Extra mapping/override-only fields (not on Exercise template entity). */
export type MappingOnlyFieldKey = 'customName' | 'customDescription';

export interface MappingOnlyFieldConfig {
  key: MappingOnlyFieldKey;
  editor: ExerciseFieldEditor;
  tier: ExerciseFieldTier;
  surfaces: readonly ExerciseFieldSurface[];
  rule: z.ZodTypeAny;
  testIdSuffix: string;
  label: string;
  tooltip: string;
}

export const MAPPING_ONLY_FIELD_CONFIG: Record<MappingOnlyFieldKey, MappingOnlyFieldConfig> = {
  customName: {
    key: 'customName',
    editor: 'text',
    tier: 4,
    surfaces: ['mapping', 'patientOverride'],
    rule: optionalText(200),
    testIdSuffix: 'customName-input',
    label: 'Własna nazwa',
    tooltip: 'Nazwa widoczna dla pacjenta zamiast oryginalnej nazwy ćwiczenia.',
  },
  customDescription: {
    key: 'customDescription',
    editor: 'textarea',
    tier: 4,
    surfaces: ['mapping', 'patientOverride'],
    rule: z.string().optional().nullable(),
    testIdSuffix: 'customDescription-input',
    label: 'Własny opis',
    tooltip: 'Opis dla pacjenta nadpisujący opis z szablonu ćwiczenia.',
  },
};

export function getFieldMetadata(key: ExerciseFieldKey): ExerciseFieldMetadata {
  return EXERCISE_FIELD_METADATA[key];
}

export function getFieldsForSurface(surface: ExerciseFieldSurface): ExerciseFieldEditConfig[] {
  return (Object.keys(EXERCISE_FIELD_EDIT_CONFIG) as ExerciseFieldKey[])
    .map((key) => EXERCISE_FIELD_EDIT_CONFIG[key])
    .filter((config) => {
      if (!config.surfaces.includes(surface)) return false;
      if (surface === 'mapping' && config.mappingMode !== 'edit') return false;
      if (
        surface === 'patientOverride' &&
        !ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS &&
        (config.key === 'tempo' ||
          config.key === 'load' ||
          config.key === 'preparationTime' ||
          config.key === 'rangeOfMotion')
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => left.tier - right.tier || left.key.localeCompare(right.key));
}

export function getFieldsByTier(
  surface: ExerciseFieldSurface,
  tiers: readonly ExerciseFieldTier[]
): ExerciseFieldEditConfig[] {
  const tierSet = new Set(tiers);
  return getFieldsForSurface(surface).filter((config) => tierSet.has(config.tier));
}

/** Parameter fields rendered by ExerciseParametersEditor (basic params / execution / classification). */
export const PARAMETER_EDITOR_FIELD_KEYS: readonly ExerciseFieldKey[] = [
  'sets',
  'reps',
  'executionTime',
  'load',
  'restSets',
  'restReps',
  'preparationTime',
  'tempo',
  'rangeOfMotion',
  'side',
  'difficultyLevel',
  'duration',
] as const;

export function getParameterEditorFields(
  variant: 'full' | 'create' = 'full'
): ExerciseFieldEditConfig[] {
  const keys =
    variant === 'create'
      ? PARAMETER_EDITOR_FIELD_KEYS
      : PARAMETER_EDITOR_FIELD_KEYS;

  return keys
    .map((key) => EXERCISE_FIELD_EDIT_CONFIG[key])
    .filter((config) => config.surfaces.includes('template'));
}

export function buildParamTestId(fieldKey: ExerciseFieldKey, kind: 'input' | 'select' | 'info' = 'input'): string {
  const config = EXERCISE_FIELD_EDIT_CONFIG[fieldKey];
  if (kind === 'info') {
    return `exercise-param-${fieldKey}-info`;
  }
  if (config.editor === 'select' || kind === 'select') {
    return `exercise-param-${fieldKey === 'difficultyLevel' ? 'difficulty' : fieldKey}-select`;
  }
  // Preserve existing testids: load → loadKg, rangeOfMotion → rom
  if (fieldKey === 'load') return 'exercise-param-loadKg-input';
  if (fieldKey === 'rangeOfMotion') return 'exercise-param-rom-input';
  if (fieldKey === 'tempo') return 'exercise-param-tempo-input';
  return `exercise-param-${fieldKey}-input`;
}

const templateSchemaShape: Record<string, z.ZodTypeAny> = {};
for (const key of Object.keys(EXERCISE_FIELD_EDIT_CONFIG) as ExerciseFieldKey[]) {
  const config = EXERCISE_FIELD_EDIT_CONFIG[key];
  if (config.surfaces.includes('template')) {
    // Form draft uses loadKg for the load field
    const schemaKey = key === 'load' ? 'loadKg' : key;
    templateSchemaShape[schemaKey] = config.rule;
  }
}

templateSchemaShape.name = z
  .string()
  .min(2, 'Nazwa musi mieć min. 2 znaki')
  .max(200, 'Nazwa może mieć max. 200 znaków');
templateSchemaShape.videoUrl = z.string().url('Podaj prawidłowy URL').optional().or(z.literal(''));
templateSchemaShape.mainTags = z.array(z.string()).optional().nullable();
templateSchemaShape.additionalTags = z.array(z.string()).optional().nullable();
templateSchemaShape.type = z.enum(['reps', 'time']).optional();

export const EXERCISE_TEMPLATE_SCHEMA = z.object(templateSchemaShape);

export type ExerciseTemplateFormValues = z.infer<typeof EXERCISE_TEMPLATE_SCHEMA>;

/** All ExerciseFieldKey values — used by contract completeness tests. */
export const ALL_EXERCISE_FIELD_KEYS = Object.keys(EXERCISE_FIELD_METADATA) as ExerciseFieldKey[];
