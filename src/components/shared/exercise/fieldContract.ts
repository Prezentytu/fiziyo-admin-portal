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

export type ExerciseFieldSurface = 'template' | 'mapping' | 'patientOverride' | 'patientPlan';

export type ExerciseFieldEditor = 'number' | 'text' | 'textarea' | 'select';

export type ExerciseFieldTier = 1 | 2 | 3 | 4;

/** Mapping persistence status — some fields inherit from template until backend supports them. */
export type MappingFieldMode = 'edit' | 'inherited' | 'none';

/**
 * Where a personalized value is persisted when assigning to a patient.
 * Changing one entry moves a field between layers without UI rewrites.
 */
export type FieldPersistence = 'mapping' | 'assignmentOverride' | 'templateOnly';

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
  /** Canonical write target for patient personalization (SPEC-021). */
  persistence: FieldPersistence;
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

/**
 * Feature flag: full personalization on patientPlan surface (side/ROM/difficulty/texts via override).
 * Requires fizjo-app to ignore unknown override keys (additive JSON, SPEC-021).
 */
export const ENABLE_FULL_PATIENT_PERSONALIZATION = true;

/**
 * Fields edited on TEMPLATE set mappings via ExerciseSetMapping.overridesJson (SPEC-023).
 * Patient assign still routes these through assignmentOverride persistence.
 */
export const MAPPING_OVERRIDE_FIELD_KEYS: readonly ExerciseFieldKey[] = [
  'side',
  'rangeOfMotion',
  'difficultyLevel',
  'patientDescription',
  'clinicalDescription',
  'audioCue',
] as const;

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
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'mapping',
    min: 0,
    max: 100,
    rule: optionalNullableNumber(0, 100),
    testIdSuffix: 'sets-input',
  },
  reps: {
    key: 'reps',
    editor: 'number',
    tier: 1,
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'mapping',
    min: 0,
    max: 1000,
    rule: optionalNullableNumber(0, 1000),
    testIdSuffix: 'reps-input',
  },
  executionTime: {
    key: 'executionTime',
    editor: 'number',
    tier: 1,
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'mapping',
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
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'mapping',
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
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'mapping',
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
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'mapping',
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
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    /** Persisted on ExerciseSetMapping (mutation + exerciseSets query selection). */
    mappingMode: 'edit',
    persistence: 'mapping',
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
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'mapping',
    rule: optionalText(20),
    testIdSuffix: 'tempo-input',
  },
  side: {
    key: 'side',
    editor: 'select',
    tier: 3,
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    /** Edited on mapping via overridesJson; patient assign uses assignmentOverride JSON. */
    mappingMode: 'edit',
    persistence: 'assignmentOverride',
    options: SIDE_OPTIONS,
    rule: z.enum(SIDE_VALUES).optional().nullable(),
    testIdSuffix: 'side-select',
  },
  rangeOfMotion: {
    key: 'rangeOfMotion',
    editor: 'text',
    tier: 4,
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'assignmentOverride',
    rule: optionalText(100),
    testIdSuffix: 'rom-input',
  },
  difficultyLevel: {
    key: 'difficultyLevel',
    editor: 'select',
    tier: 3,
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'assignmentOverride',
    options: DIFFICULTY_OPTIONS,
    rule: z.enum(DIFFICULTY_VALUES).optional().nullable(),
    testIdSuffix: 'difficulty-select',
  },
  duration: {
    key: 'duration',
    editor: 'number',
    tier: 4,
    /**
     * Deprecated for editing (SPEC-023). Kept in config for read-path /
     * legacy clear (`duration: 0`). Surfaces empty → never rendered as input.
     */
    surfaces: [],
    mappingMode: 'edit',
    persistence: 'mapping',
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
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'assignmentOverride',
    rule: z.string().optional().nullable(),
    testIdSuffix: 'patientDescription-input',
  },
  clinicalDescription: {
    key: 'clinicalDescription',
    editor: 'textarea',
    tier: 4,
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'assignmentOverride',
    rule: z.string().optional().nullable(),
    testIdSuffix: 'clinicalDescription-input',
  },
  audioCue: {
    key: 'audioCue',
    editor: 'text',
    tier: 4,
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'assignmentOverride',
    rule: optionalText(200),
    testIdSuffix: 'audioCue-input',
  },
  notes: {
    key: 'notes',
    editor: 'textarea',
    tier: 3,
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
    mappingMode: 'edit',
    persistence: 'mapping',
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
  persistence: FieldPersistence;
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
    surfaces: ['mapping', 'patientOverride', 'patientPlan'],
    persistence: 'mapping',
    rule: optionalText(200),
    testIdSuffix: 'customName-input',
    label: 'Własna nazwa',
    tooltip: 'Nazwa widoczna dla pacjenta zamiast oryginalnej nazwy ćwiczenia.',
  },
  customDescription: {
    key: 'customDescription',
    editor: 'textarea',
    tier: 4,
    surfaces: ['mapping', 'patientOverride', 'patientPlan'],
    persistence: 'mapping',
    rule: z.string().optional().nullable(),
    testIdSuffix: 'customDescription-input',
    label: 'Własny opis',
    tooltip: 'Opis dla pacjenta nadpisujący opis z szablonu ćwiczenia.',
  },
};

export function getFieldMetadata(key: ExerciseFieldKey): ExerciseFieldMetadata {
  return EXERCISE_FIELD_METADATA[key];
}

/** Contract keys editable on mapping → card EditableField names (load → loadKg). */
export function getMappingEditableCardFields(): Array<
  | 'sets'
  | 'reps'
  | 'duration'
  | 'executionTime'
  | 'restSets'
  | 'restReps'
  | 'preparationTime'
  | 'tempo'
  | 'loadKg'
  | 'notes'
  | 'side'
  | 'rangeOfMotion'
  | 'difficultyLevel'
  | 'patientDescription'
  | 'clinicalDescription'
  | 'audioCue'
  | 'customName'
  | 'customDescription'
> {
  const fromContract = getFieldsForSurface('mapping').map((config) =>
    config.key === 'load' ? ('loadKg' as const) : (config.key as 'sets')
  );
  return [
    ...fromContract,
    'customName',
    'customDescription',
  ] as Array<
    | 'sets'
    | 'reps'
    | 'duration'
    | 'executionTime'
    | 'restSets'
    | 'restReps'
    | 'preparationTime'
    | 'tempo'
    | 'loadKg'
    | 'notes'
    | 'side'
    | 'rangeOfMotion'
    | 'difficultyLevel'
    | 'patientDescription'
    | 'clinicalDescription'
    | 'audioCue'
    | 'customName'
    | 'customDescription'
  >;
}

/**
 * Fields shown as readonly inherited values on a surface.
 * mapping / patientPlan / patientOverride: empty — all personalizable fields are editable
 * (mapping via overridesJson, SPEC-023).
 */
export function getInheritedFieldKeys(
  surface: ExerciseFieldSurface = 'mapping'
): ExerciseFieldKey[] {
  if (surface === 'patientPlan' || surface === 'patientOverride' || surface === 'mapping') {
    return [];
  }
  return [];
}

/** @deprecated Prefer getInheritedFieldKeys('mapping'). Alias kept for additive-first. */
export function getMappingInheritedFieldKeys(): ExerciseFieldKey[] {
  return getInheritedFieldKeys('mapping').filter(
    (key) => EXERCISE_FIELD_EDIT_CONFIG[key].mappingMode === 'inherited'
  );
}

export function getFieldsForSurface(surface: ExerciseFieldSurface): ExerciseFieldEditConfig[] {
  return (Object.keys(EXERCISE_FIELD_EDIT_CONFIG) as ExerciseFieldKey[])
    .map((key) => EXERCISE_FIELD_EDIT_CONFIG[key])
    .filter((config) => {
      if (!config.surfaces.includes(surface)) return false;
      if (surface === 'mapping' && config.mappingMode !== 'edit') return false;
      if (
        (surface === 'patientOverride' || surface === 'patientPlan') &&
        !ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS &&
        (config.key === 'tempo' ||
          config.key === 'load' ||
          config.key === 'preparationTime' ||
          config.key === 'rangeOfMotion')
      ) {
        return false;
      }
      if (
        (surface === 'patientOverride' || surface === 'patientPlan') &&
        !ENABLE_FULL_PATIENT_PERSONALIZATION &&
        (config.key === 'difficultyLevel' ||
          config.key === 'patientDescription' ||
          config.key === 'clinicalDescription' ||
          config.key === 'audioCue')
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => left.tier - right.tier || left.key.localeCompare(right.key));
}

/** Fields with assignmentOverride persistence (JSON exerciseOverrides keys). */
export function getAssignmentOverrideFieldKeys(): ExerciseFieldKey[] {
  return (Object.keys(EXERCISE_FIELD_EDIT_CONFIG) as ExerciseFieldKey[]).filter(
    (key) => EXERCISE_FIELD_EDIT_CONFIG[key].persistence === 'assignmentOverride'
  );
}

export function getFieldsByTier(
  surface: ExerciseFieldSurface,
  tiers: readonly ExerciseFieldTier[]
): ExerciseFieldEditConfig[] {
  const tierSet = new Set(tiers);
  return getFieldsForSurface(surface).filter((config) => tierSet.has(config.tier));
}

/**
 * Fields withdrawn from edit UI but still present in metadata / read-path.
 * Excluded from PARAMETER_SECTIONS completeness checks.
 */
export const DEPRECATED_FIELD_KEYS: readonly ExerciseFieldKey[] = ['duration'] as const;

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
] as const;

export type ParameterSectionId = 'basic' | 'timing' | 'classification' | 'content';

export interface ParameterSectionDefinition {
  id: ParameterSectionId;
  title: string;
  /** Declared field order for this section (SSOT for layout across surfaces). */
  keys: readonly ExerciseFieldKey[];
  /**
   * When true, section sits inside the advanced collapsible.
   * `basic` is always visible; `content` is opt-in via showContentSection.
   */
  advanced: boolean;
}

/**
 * Canonical section model for exercise parameter presentation.
 * Surfaces derive subset via getParameterSections — never redefine order/labels locally.
 */
export const PARAMETER_SECTIONS: readonly ParameterSectionDefinition[] = [
  {
    id: 'basic',
    title: 'Podstawowe parametry',
    keys: ['sets', 'reps', 'executionTime', 'load', 'restSets'],
    advanced: false,
  },
  {
    id: 'timing',
    title: 'Tempo, przerwy i zakres ruchu',
    keys: ['restReps', 'preparationTime', 'tempo', 'rangeOfMotion'],
    advanced: true,
  },
  {
    id: 'classification',
    title: 'Pozycja i klasyfikacja',
    keys: ['side', 'difficultyLevel'],
    advanced: true,
  },
  {
    id: 'content',
    title: 'Treść dla pacjenta',
    keys: ['patientDescription', 'notes', 'clinicalDescription', 'audioCue'],
    advanced: false,
  },
] as const;

export type ParameterFieldRole = 'editable' | 'inherited';

export interface ResolvedParameterField {
  key: ExerciseFieldKey;
  config: ExerciseFieldEditConfig;
  role: ParameterFieldRole;
}

export interface ResolvedParameterSection {
  id: ParameterSectionId;
  title: string;
  advanced: boolean;
  fields: ResolvedParameterField[];
}

/**
 * Resolve parameter sections for a surface.
 * Editable fields come from getFieldsForSurface; inherited/none mapping fields
 * appear as role=inherited so UI can show a readonly block instead of hiding them.
 */
export function getParameterSections(
  surface: ExerciseFieldSurface,
  options?: { includeContent?: boolean; omitFields?: readonly ExerciseFieldKey[] }
): ResolvedParameterSection[] {
  const omitSet = new Set(options?.omitFields ?? []);
  const editableKeys = new Set(getFieldsForSurface(surface).map((config) => config.key));
  const inheritedKeys = new Set(getInheritedFieldKeys(surface));

  return PARAMETER_SECTIONS.filter((section) => {
    if (section.id === 'content' && !options?.includeContent) return false;
    return true;
  })
    .map((section) => {
      const fields: ResolvedParameterField[] = [];
      for (const key of section.keys) {
        if (omitSet.has(key)) continue;
        if (editableKeys.has(key)) {
          fields.push({
            key,
            config: EXERCISE_FIELD_EDIT_CONFIG[key],
            role: 'editable',
          });
        } else if (inheritedKeys.has(key)) {
          fields.push({
            key,
            config: EXERCISE_FIELD_EDIT_CONFIG[key],
            role: 'inherited',
          });
        }
      }
      return {
        id: section.id,
        title: section.title,
        advanced: section.advanced,
        fields,
      };
    })
    .filter((section) => section.fields.length > 0);
}

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
