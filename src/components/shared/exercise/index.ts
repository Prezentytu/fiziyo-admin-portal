export { ExerciseExecutionCard } from './ExerciseExecutionCard';
export { ExercisePreviewDialog } from './ExercisePreviewDialog';
export { ExerciseImageFrame } from './ExerciseImageFrame';
export { ExerciseThumbnail } from './ExerciseThumbnail';
export type { ExerciseThumbnailProps } from './ExerciseThumbnail';
export type {
  ExerciseExecutionCardProps,
  ExerciseExecutionCardData,
  ExerciseExecutionCardSurface,
  EditableField,
} from './types';
export { isTimerExercise, isFieldEditable } from './types';
export { fromExerciseMapping, fromBuilderExercise, buildExerciseImageUrls } from './adapters';
export {
  EXERCISE_OVERRIDE_CONTENT_KEYS,
  hasExerciseOverrideContent,
  listOverriddenFieldKeys,
} from './exerciseOverride';
export type { AssignmentExerciseOverride, ExerciseOverrideFields } from './exerciseOverride';
export { resolveEffectiveExerciseParams } from './resolveEffectiveExerciseParams';
export type {
  EffectiveExerciseParams,
  EffectiveMappingSource,
  EffectiveTemplateSource,
} from './resolveEffectiveExerciseParams';
export {
  DIALOG_EXERCISE_FIELD_ORDER,
  EXERCISE_FIELD_METADATA,
  INLINE_EXERCISE_FIELD_ORDER,
  formatDifficultyLabel,
  formatFieldValueWithPlaceholder,
  formatSideLabel,
  EMPTY_NUMERIC_VALUE,
  EMPTY_TEXT_VALUE,
  HIDE_EXERCISE_TAGS,
} from './displayRegistry';
export type {
  ExerciseFieldGroup,
  ExerciseFieldIconKey,
  ExerciseFieldKey,
  ExerciseFieldMetadata,
  ExerciseFieldValueSource,
} from './displayRegistry';
export { normalizeExerciseFieldValues, resolveLoadDisplayText } from './displayNormalizer';
export {
  DIFFICULTY_OPTIONS,
  ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS,
  ENABLE_FULL_PATIENT_PERSONALIZATION,
  EXERCISE_FIELD_EDIT_CONFIG,
  EXERCISE_TEMPLATE_SCHEMA,
  MAPPING_ONLY_FIELD_CONFIG,
  PARAMETER_EDITOR_FIELD_KEYS,
  SIDE_OPTIONS,
  buildParamTestId,
  getAssignmentOverrideFieldKeys,
  getFieldMetadata,
  getFieldsByTier,
  getFieldsForSurface,
  getInheritedFieldKeys,
  getMappingEditableCardFields,
  getMappingInheritedFieldKeys,
  getParameterEditorFields,
} from './fieldContract';
export type {
  ExerciseFieldEditConfig,
  ExerciseFieldEditor,
  ExerciseFieldOption,
  ExerciseFieldSurface,
  ExerciseFieldTier,
  ExerciseTemplateFormValues,
  FieldPersistence,
  MappingFieldMode,
  MappingOnlyFieldConfig,
  MappingOnlyFieldKey,
} from './fieldContract';
export {
  buildOverrideDelta,
  mergeOverrideMap,
  parseOverrideMap,
  replaceOverrideMapEntry,
  splitPersonalization,
  stringifyOverrideMap,
} from './exercisePersonalizationWriter';
export type {
  MappingMutationVariables,
  OverrideMap,
  PersonalizationPatch,
  SplitPersonalizationResult,
} from './exercisePersonalizationWriter';
