import { resolveLoadKg } from '@/utils/exerciseLoadMutation';
import type { ExerciseOverrideFields } from './exerciseOverride';

export interface EffectiveTemplateSource {
  name?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultExecutionTime?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  preparationTime?: number;
  tempo?: string;
  side?: string;
  exerciseSide?: string;
  rangeOfMotion?: string;
  difficultyLevel?: string;
  patientDescription?: string;
  description?: string;
  clinicalDescription?: string;
  audioCue?: string;
  notes?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: unknown;
  videoUrl?: string;
  mainTags?: string[];
  additionalTags?: string[];
  type?: string;
  defaultLoad?: {
    loadWeightKg?: number | null;
    loadSource?: string | null;
    type?: string;
    value?: number;
    unit?: string;
    text?: string;
  };
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
  sets?: number;
  reps?: number;
  duration?: number;
}

export interface EffectiveMappingSource {
  id: string;
  sets?: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  notes?: string;
  customName?: string;
  customDescription?: string;
  videoUrl?: string;
  load?: {
    loadWeightKg?: number | null;
    loadSource?: string | null;
    type?: string;
    value?: number;
    unit?: string;
    text?: string;
  };
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
  exercise?: EffectiveTemplateSource;
}

export interface EffectiveExerciseParams {
  mappingId: string;
  displayName: string;
  sets: number;
  reps: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  loadKg?: number;
  loadDisplayText?: string;
  notes?: string;
  customName?: string;
  customDescription?: string;
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  rangeOfMotion?: string;
  difficultyLevel?: string;
  side?: string;
  mainTags?: string[];
  additionalTags?: string[];
  thumbnailUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  customImages?: string[];
  hidden: boolean;
  isTimeBased: boolean;
  /** Field keys present on the override object (for per-field badges). */
  overriddenKeys: string[];
}

function pickDefined<T>(...candidates: Array<T | null | undefined>): T | undefined {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }
  return undefined;
}

function resolveOverrideLoadKg(override?: ExerciseOverrideFields): number | undefined {
  if (!override) return undefined;
  if (override.loadWeightKg != null && !Number.isNaN(override.loadWeightKg)) {
    return override.loadWeightKg;
  }
  if (override.load) {
    return resolveLoadKg(override.load) ?? undefined;
  }
  return undefined;
}

function resolveMappingLoadKg(mapping?: EffectiveMappingSource): number | undefined {
  if (!mapping) return undefined;
  if (mapping.load) {
    return resolveLoadKg(mapping.load) ?? undefined;
  }
  return resolveLoadKg({
    value: mapping.loadValue,
    unit: mapping.loadUnit,
  });
}

function resolveTemplateLoadKg(exercise?: EffectiveTemplateSource): number | undefined {
  if (!exercise) return undefined;
  if (exercise.defaultLoad) {
    return resolveLoadKg(exercise.defaultLoad) ?? undefined;
  }
  return resolveLoadKg({
    value: exercise.loadValue,
    unit: exercise.loadUnit,
  });
}

function resolveSide(
  override?: ExerciseOverrideFields,
  exercise?: EffectiveTemplateSource
): string {
  const fromOverride = override?.exerciseSide?.toString().toLowerCase();
  if (fromOverride) return fromOverride;
  const fromExercise = (exercise?.side ?? exercise?.exerciseSide)?.toString().toLowerCase();
  return fromExercise || 'none';
}

/**
 * Precedence: override > mapping > template for every overridable field.
 * `undefined` on override means "not overridden" (do not coerce to 0).
 */
export function resolveEffectiveExerciseParams(
  mapping: EffectiveMappingSource,
  override?: ExerciseOverrideFields | null
): EffectiveExerciseParams {
  const exercise = mapping.exercise;
  const overriddenKeys = Object.keys(override ?? {}).filter((key) => {
    if (key === 'exerciseMappingId') return false;
    const value = override?.[key as keyof ExerciseOverrideFields];
    if (value === undefined) return false;
    if (key === 'customImages' && Array.isArray(value) && value.length === 0) return false;
    if (key === 'hidden' && value === false) return false;
    return true;
  });

  const sets = pickDefined(override?.sets, mapping.sets, exercise?.defaultSets, exercise?.sets) ?? 3;
  const reps = pickDefined(override?.reps, mapping.reps, exercise?.defaultReps, exercise?.reps) ?? 10;
  const duration = pickDefined(
    override?.duration,
    mapping.duration,
    exercise?.defaultDuration,
    exercise?.duration
  );
  const executionTime = pickDefined(
    override?.executionTime,
    mapping.executionTime,
    exercise?.defaultExecutionTime
  );
  const restSets =
    pickDefined(override?.restSets, mapping.restSets, exercise?.defaultRestBetweenSets) ?? 60;
  const restReps = pickDefined(
    override?.restReps,
    mapping.restReps,
    exercise?.defaultRestBetweenReps
  );
  const preparationTime = pickDefined(
    override?.preparationTime,
    mapping.preparationTime,
    exercise?.preparationTime
  );
  const tempo = pickDefined(override?.tempo, mapping.tempo, exercise?.tempo);
  const loadKg = pickDefined(
    resolveOverrideLoadKg(override ?? undefined),
    resolveMappingLoadKg(mapping),
    resolveTemplateLoadKg(exercise)
  );

  const loadForDisplay = mapping.load ?? exercise?.defaultLoad;
  const loadDisplayText =
    loadKg != null
      ? `${loadKg} kg`
      : loadForDisplay?.text?.trim() ||
        mapping.loadText?.trim() ||
        exercise?.loadText?.trim() ||
        undefined;

  const customName = pickDefined(override?.customName, mapping.customName);
  const customDescription = pickDefined(override?.customDescription, mapping.customDescription);
  const notes = pickDefined(override?.notes, mapping.notes, exercise?.notes) ?? '';
  const rangeOfMotion = pickDefined(override?.rangeOfMotion, exercise?.rangeOfMotion);
  const side = resolveSide(override ?? undefined, exercise);
  const difficultyLevel = pickDefined(override?.difficultyLevel, exercise?.difficultyLevel);
  const patientDescription = pickDefined(
    override?.patientDescription,
    customDescription,
    exercise?.patientDescription,
    exercise?.description
  );
  const clinicalDescription = pickDefined(
    override?.clinicalDescription,
    exercise?.clinicalDescription
  );
  const audioCue = pickDefined(override?.audioCue, exercise?.audioCue);
  const displayName = (customName?.trim() || exercise?.name?.trim() || 'Ćwiczenie') as string;
  const exerciseType = exercise?.type?.toLowerCase();
  const isTimeBased = exerciseType === 'time';

  return {
    mappingId: mapping.id,
    displayName,
    sets,
    reps,
    duration,
    executionTime,
    restSets,
    restReps,
    preparationTime,
    tempo,
    loadKg,
    loadDisplayText,
    notes,
    customName,
    customDescription,
    patientDescription,
    clinicalDescription,
    audioCue,
    rangeOfMotion,
    difficultyLevel,
    side,
    mainTags: exercise?.mainTags,
    additionalTags: exercise?.additionalTags,
    thumbnailUrl: exercise?.thumbnailUrl ?? exercise?.imageUrl,
    videoUrl: mapping.videoUrl ?? exercise?.videoUrl,
    customImages: override?.customImages,
    hidden: override?.hidden ?? false,
    isTimeBased,
    overriddenKeys,
  };
}
