import { resolveLoadKg } from '@/utils/exerciseLoadMutation';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import type { ExerciseOverrideFields } from './exerciseOverride';
import { applyEnrichmentOverride, hasEnrichmentOverrideContent } from './enrichmentOverride';
import {
  mergeOverrideLayers,
  parseMappingOverridesJson,
} from './mappingOverrides';

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
  /** Template enrichment v3 (SPEC-024 baseline). */
  enrichmentData?: ExerciseEnrichmentData | null;
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
  /** Template-set personalization JSON (SPEC-023). */
  overridesJson?: string | ExerciseOverrideFields | null;
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
  /**
   * Effective enrichment after mapping + assignment path overrides (SPEC-024).
   * Therapist/ai/equipment always come from template.
   */
  effectiveEnrichment: ExerciseEnrichmentData;
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
  layered?: ExerciseOverrideFields,
  exercise?: EffectiveTemplateSource
): string {
  const fromOverride = layered?.exerciseSide?.toString().toLowerCase();
  if (fromOverride) return fromOverride;
  const fromExercise = (exercise?.side ?? exercise?.exerciseSide)?.toString().toLowerCase();
  return fromExercise || 'none';
}

/**
 * Precedence: assignment override > mapping.overridesJson > mapping columns > template.
 * `undefined` on override means "not overridden" (do not coerce to 0).
 */
export function resolveEffectiveExerciseParams(
  mapping: EffectiveMappingSource,
  override?: ExerciseOverrideFields | null
): EffectiveExerciseParams {
  const exercise = mapping.exercise;
  const mappingOverrides = parseMappingOverridesJson(mapping.overridesJson);
  const layered = mergeOverrideLayers(mappingOverrides, override);
  const overriddenKeys = Object.keys(layered ?? {}).filter((key) => {
    if (key === 'exerciseMappingId') return false;
    const value = layered?.[key as keyof ExerciseOverrideFields];
    if (value === undefined) return false;
    if (key === 'customImages' && Array.isArray(value) && value.length === 0) return false;
    if (key === 'hidden' && value === false) return false;
    if (key === 'enrichment') return hasEnrichmentOverrideContent(layered?.enrichment);
    return true;
  });
  const effectiveEnrichment = applyEnrichmentOverride(exercise?.enrichmentData, layered?.enrichment);

  const sets = pickDefined(layered?.sets, mapping.sets, exercise?.defaultSets, exercise?.sets) ?? 3;
  const reps = pickDefined(layered?.reps, mapping.reps, exercise?.defaultReps, exercise?.reps) ?? 10;
  const duration = pickDefined(
    layered?.duration,
    mapping.duration,
    exercise?.defaultDuration,
    exercise?.duration
  );
  const executionTime = pickDefined(
    layered?.executionTime,
    mapping.executionTime,
    exercise?.defaultExecutionTime
  );
  const restSets =
    pickDefined(layered?.restSets, mapping.restSets, exercise?.defaultRestBetweenSets) ?? 60;
  const restReps = pickDefined(
    layered?.restReps,
    mapping.restReps,
    exercise?.defaultRestBetweenReps
  );
  const preparationTime = pickDefined(
    layered?.preparationTime,
    mapping.preparationTime,
    exercise?.preparationTime
  );
  const tempo = pickDefined(layered?.tempo, mapping.tempo, exercise?.tempo);
  const loadKg = pickDefined(
    resolveOverrideLoadKg(layered),
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

  const customName = pickDefined(layered?.customName, mapping.customName);
  const customDescription = pickDefined(layered?.customDescription, mapping.customDescription);
  const notes = pickDefined(layered?.notes, mapping.notes, exercise?.notes) ?? '';
  const rangeOfMotion = pickDefined(layered?.rangeOfMotion, exercise?.rangeOfMotion);
  const side = resolveSide(layered, exercise);
  const difficultyLevel = pickDefined(layered?.difficultyLevel, exercise?.difficultyLevel);
  const patientDescription = pickDefined(
    layered?.patientDescription,
    customDescription,
    exercise?.patientDescription,
    exercise?.description
  );
  const clinicalDescription = pickDefined(
    layered?.clinicalDescription,
    exercise?.clinicalDescription
  );
  const audioCue = pickDefined(layered?.audioCue, exercise?.audioCue);
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
    customImages: layered?.customImages,
    hidden: layered?.hidden ?? false,
    isTimeBased,
    overriddenKeys,
    effectiveEnrichment,
  };
}
