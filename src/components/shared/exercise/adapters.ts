import type { ExerciseExecutionCardData } from './types';
import type { ExerciseMapping, ExerciseOverride, ExerciseLoad } from '@/features/assignment/types';
import { formatLoad } from '@/utils/loadParser';
import { getMediaUrl, getMediaUrls } from '@/utils/mediaUrl';

export function buildExerciseImageUrls(exercise: {
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: string[];
}): string[] {
  const first = getMediaUrl(exercise.thumbnailUrl ?? exercise.imageUrl ?? exercise.images?.[0]);
  if (!first) return getMediaUrls(exercise.images ?? []);
  const rest = getMediaUrls(exercise.images ?? []).filter((url) => url !== first);
  return [first, ...rest];
}

function buildImageUrls(thumbnailUrl?: string, imageUrl?: string, images?: string[]): string[] {
  return buildExerciseImageUrls({ thumbnailUrl, imageUrl, images });
}

function resolveDisplayName(primaryName?: string, fallbackName?: string): string {
  const normalizedPrimary = primaryName?.trim();
  if (normalizedPrimary) return normalizedPrimary;
  const normalizedFallback = fallbackName?.trim();
  if (normalizedFallback) return normalizedFallback;
  return 'Ćwiczenie';
}

function buildLoadFromScalars(load: {
  type?: string;
  value?: number;
  unit?: string;
  text?: string;
}): ExerciseLoad | undefined {
  const hasAnyValue =
    Boolean(load.text && load.text.trim().length > 0) || load.value != null || Boolean(load.type) || Boolean(load.unit);
  if (!hasAnyValue) return undefined;

  const normalizedType: ExerciseLoad['type'] =
    load.type === 'band' || load.type === 'bodyweight' || load.type === 'other' ? load.type : 'weight';
  const normalizedUnit: ExerciseLoad['unit'] =
    load.unit === 'kg' || load.unit === 'lbs' || load.unit === 'level' ? load.unit : undefined;
  const textFromValue = load.value == null ? '' : `${load.value}${normalizedUnit ? ` ${normalizedUnit}` : ''}`.trim();
  const text = load.text?.trim() || textFromValue || 'Obciążenie';

  return {
    type: normalizedType,
    value: load.value,
    unit: normalizedUnit,
    text,
  };
}

/**
 * Maps Assignment Wizard mapping + override to ExerciseExecutionCardData.
 */
export function fromExerciseMapping(
  mapping: ExerciseMapping,
  override?: ExerciseOverride
): ExerciseExecutionCardData {
  const exercise = mapping.exercise;
  const sets = mapping.sets ?? override?.sets ?? exercise?.defaultSets ?? 3;
  const reps = mapping.reps ?? override?.reps ?? exercise?.defaultReps ?? 10;
  const executionTime =
    mapping.executionTime ?? override?.executionTime ?? exercise?.defaultExecutionTime;
  const exerciseType = exercise?.type?.toLowerCase();
  const isTimeBased = exerciseType === 'time';
  const load =
    mapping.load ??
    buildLoadFromScalars({
      type: mapping.loadType,
      value: mapping.loadValue,
      unit: mapping.loadUnit,
      text: mapping.loadText,
    }) ??
    override?.load ??
    exercise?.defaultLoad ??
    buildLoadFromScalars({
      type: exercise?.loadType,
      value: exercise?.loadValue,
      unit: exercise?.loadUnit,
      text: exercise?.loadText,
    });
  const loadKg = load?.unit === 'kg' ? load.value : undefined;
  const loadDisplayText = formatLoad(load);

  const thumb = exercise?.thumbnailUrl ?? exercise?.imageUrl ?? exercise?.images?.[0];
  return {
    id: mapping.id,
    displayName: resolveDisplayName(mapping.customName, exercise?.name),
    thumbnailUrl: thumb ?? undefined,
    imageUrls: buildImageUrls(exercise?.thumbnailUrl, exercise?.imageUrl, exercise?.images),
    sets,
    reps,
    duration: mapping.duration ?? override?.duration ?? exercise?.defaultDuration,
    executionTime,
    restSets: mapping.restSets ?? override?.restSets ?? exercise?.defaultRestBetweenSets ?? 60,
    restReps: mapping.restReps ?? override?.restReps ?? exercise?.defaultRestBetweenReps,
    preparationTime: mapping.preparationTime ?? override?.preparationTime ?? exercise?.preparationTime,
    tempo: mapping.tempo ?? override?.tempo ?? exercise?.tempo,
    loadKg,
    loadDisplayText: loadDisplayText || undefined,
    notes: mapping.notes ?? override?.notes ?? '',
    patientDescription:
      mapping.customDescription ?? exercise?.patientDescription ?? exercise?.description ?? undefined,
    clinicalDescription: exercise?.clinicalDescription,
    audioCue: exercise?.audioCue,
    rangeOfMotion: exercise?.rangeOfMotion,
    difficultyLevel: exercise?.difficultyLevel,
    mainTags: exercise?.mainTags,
    additionalTags: exercise?.additionalTags,
    customName: mapping.customName ?? override?.customName,
    customDescription: mapping.customDescription ?? override?.customDescription,
    side: (exercise?.side ?? exercise?.exerciseSide ?? 'none')?.toString().toLowerCase(),
    isTimeBased,
  };
}

/**
 * Maps Set Builder exercise + params to ExerciseExecutionCardData.
 */
export function fromBuilderExercise(
  exercise: {
    id: string;
    name: string;
    type?: string;
    thumbnailUrl?: string;
    imageUrl?: string;
    images?: string[];
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    defaultExecutionTime?: number;
    defaultRestBetweenSets?: number;
    defaultRestBetweenReps?: number;
    preparationTime?: number;
    side?: string;
    exerciseSide?: string;
  },
  params: {
    sets?: number;
    reps?: number;
    duration?: number;
    executionTime?: number;
    restSets?: number;
    restReps?: number;
    preparationTime?: number;
    tempo?: string;
    customName?: string;
    customDescription?: string;
    notes?: string;
    exerciseSide?: string;
    loadValue?: number;
    loadUnit?: string;
    loadText?: string;
    load?: ExerciseLoad | { type: string; value?: number; unit?: string; text: string };
  }
): ExerciseExecutionCardData {
  const isTimeBased = exercise.type?.toLowerCase() === 'time';
  const load =
    params.load ??
    (params.loadValue == null
      ? undefined
      : { type: 'weight' as const, value: params.loadValue, unit: (params.loadUnit as 'kg') ?? 'kg', text: params.loadText ?? `${params.loadValue} kg` });
  const loadKg =
    load && 'unit' in load && load.unit === 'kg' ? load.value : params.loadValue;
  const loadDisplayText =
    (load && 'text' in load ? load.text : params.loadText) ??
    (loadKg == null ? undefined : `${loadKg} kg`);

  const thumb = exercise.thumbnailUrl ?? exercise.imageUrl ?? exercise.images?.[0];
  return {
    id: exercise.id,
    displayName: resolveDisplayName(params.customName, exercise.name),
    thumbnailUrl: thumb ?? undefined,
    imageUrls: buildImageUrls(exercise.thumbnailUrl, exercise.imageUrl, exercise.images),
    sets: params.sets ?? exercise.defaultSets ?? 3,
    reps: params.reps ?? exercise.defaultReps ?? 10,
    duration: params.duration ?? exercise.defaultDuration,
    executionTime: params.executionTime ?? exercise.defaultExecutionTime,
    restSets: params.restSets ?? exercise.defaultRestBetweenSets ?? 60,
    restReps: params.restReps ?? exercise.defaultRestBetweenReps,
    preparationTime: params.preparationTime ?? exercise.preparationTime,
    tempo: params.tempo,
    loadKg,
    loadDisplayText: loadDisplayText ?? (loadKg == null ? undefined : `${loadKg} kg`),
    notes: params.notes ?? '',
    patientDescription: exercise.patientDescription ?? exercise.description,
    clinicalDescription: (exercise as { clinicalDescription?: string }).clinicalDescription,
    audioCue: (exercise as { audioCue?: string }).audioCue,
    rangeOfMotion: (exercise as { rangeOfMotion?: string }).rangeOfMotion,
    difficultyLevel: (exercise as { difficultyLevel?: string }).difficultyLevel,
    mainTags: (exercise as { mainTags?: Array<{ name?: string } | string> }).mainTags
      ?.map((tag) => (typeof tag === 'string' ? tag : tag.name))
      .filter((tag): tag is string => Boolean(tag)),
    additionalTags: (exercise as { additionalTags?: Array<{ name?: string } | string> }).additionalTags
      ?.map((tag) => (typeof tag === 'string' ? tag : tag.name))
      .filter((tag): tag is string => Boolean(tag)),
    customName: params.customName,
    customDescription: params.customDescription,
    side: (params.exerciseSide ?? exercise.side ?? exercise.exerciseSide ?? 'both')?.toLowerCase(),
    isTimeBased,
  };
}
