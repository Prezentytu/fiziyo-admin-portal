import type { ExerciseExecutionCardData } from './types';
import type { ExerciseMapping, ExerciseOverride, ExerciseLoad } from '@/components/assignment/types';
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
  const load = mapping.load ?? override?.load ?? exercise?.defaultLoad;
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
    customName: params.customName,
    customDescription: params.customDescription,
    side: (params.exerciseSide ?? exercise.side ?? exercise.exerciseSide ?? 'both')?.toLowerCase(),
    isTimeBased,
  };
}
