import type { ExerciseExecutionCardData } from './types';
import type { ExerciseMapping, ExerciseLoad } from '@/features/assignment/types';
import type { ExerciseOverrideFields } from './exerciseOverride';
import { resolveEffectiveExerciseParams } from './resolveEffectiveExerciseParams';
import { resolveLoadKg } from '@/utils/exerciseLoadMutation';
import { getMediaUrl, getMediaUrls } from '@/utils/mediaUrl';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickImageUrlFromUnknown(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (!isRecord(value)) return null;

  const urlCandidateKeys = ['url', 'imageUrl', 'thumbnailUrl', 'src', 'path', 'value'];
  for (const candidateKey of urlCandidateKeys) {
    const maybeUrl = value[candidateKey];
    if (typeof maybeUrl === 'string' && maybeUrl.trim().length > 0) {
      return maybeUrl.trim();
    }
  }

  return null;
}

function normalizeUnknownImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images
      .map((imageValue) => pickImageUrlFromUnknown(imageValue))
      .filter((imageUrl): imageUrl is string => imageUrl !== null);
  }

  if (typeof images === 'string') {
    const trimmedImages = images.trim();
    if (!trimmedImages) return [];

    if (trimmedImages.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmedImages) as unknown;
        return normalizeUnknownImages(parsed);
      } catch {
        return [trimmedImages];
      }
    }

    return [trimmedImages];
  }

  return [];
}

export function buildExerciseImageUrls(exercise: {
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: unknown;
}): string[] {
  const normalizedImages = normalizeUnknownImages(exercise.images);
  const first = getMediaUrl(exercise.thumbnailUrl ?? exercise.imageUrl ?? normalizedImages[0]);
  if (!first) return getMediaUrls(normalizedImages);
  const rest = getMediaUrls(normalizedImages).filter((url) => url !== first);
  return [first, ...rest];
}

function buildImageUrls(thumbnailUrl?: string, imageUrl?: string, images?: unknown): string[] {
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
  loadWeightKg?: number | null;
  loadSource?: string | null;
  type?: string;
  value?: number;
  unit?: string;
  text?: string;
}): ExerciseLoad | undefined {
  const hasAnyValue =
    load.loadWeightKg != null ||
    Boolean(load.text && load.text.trim().length > 0) ||
    load.value != null ||
    Boolean(load.type) ||
    Boolean(load.unit);
  if (!hasAnyValue) return undefined;

  const normalizedType: ExerciseLoad['type'] =
    load.type === 'band' || load.type === 'bodyweight' || load.type === 'other' ? load.type : 'weight';
  const normalizedUnit: ExerciseLoad['unit'] =
    load.unit === 'kg' || load.unit === 'lbs' || load.unit === 'level' ? load.unit : undefined;
  const textFromValue = load.value == null ? '' : `${load.value}${normalizedUnit ? ` ${normalizedUnit}` : ''}`.trim();
  const text = load.text?.trim() || textFromValue || 'Obciążenie';

  return {
    loadWeightKg: load.loadWeightKg,
    loadSource: load.loadSource,
    type: normalizedType,
    value: load.value,
    unit: normalizedUnit,
    text,
  };
}

/**
 * Maps Assignment Wizard mapping + override to ExerciseExecutionCardData.
 * Precedence: override > mapping > template (see resolveEffectiveExerciseParams).
 */
export function fromExerciseMapping(
  mapping: ExerciseMapping,
  override?: ExerciseOverrideFields | null
): ExerciseExecutionCardData {
  const effective = resolveEffectiveExerciseParams(mapping, override);
  const exercise = mapping.exercise;
  const imageUrls = buildImageUrls(exercise?.thumbnailUrl, exercise?.imageUrl, exercise?.images);
  const overrideImages = override?.customImages?.length
    ? getMediaUrls(override.customImages)
    : [];

  return {
    id: mapping.id,
    sourceExerciseId: exercise?.id ?? mapping.exerciseId,
    displayName: effective.displayName,
    thumbnailUrl: overrideImages[0] ?? imageUrls[0] ?? effective.thumbnailUrl,
    imageUrls: overrideImages.length > 0 ? overrideImages : imageUrls,
    videoUrl: effective.videoUrl,
    sets: effective.sets,
    reps: effective.reps,
    duration: effective.duration,
    executionTime: effective.executionTime,
    restSets: effective.restSets,
    restReps: effective.restReps,
    preparationTime: effective.preparationTime,
    tempo: effective.tempo,
    loadKg: effective.loadKg,
    loadDisplayText: effective.loadDisplayText,
    notes: effective.notes,
    patientDescription: effective.patientDescription,
    clinicalDescription: effective.clinicalDescription,
    audioCue: effective.audioCue,
    rangeOfMotion: effective.rangeOfMotion,
    difficultyLevel: effective.difficultyLevel,
    mainTags: effective.mainTags,
    additionalTags: effective.additionalTags,
    customName: effective.customName,
    customDescription: effective.customDescription,
    side: effective.side,
    isTimeBased: effective.isTimeBased,
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
    patientDescription?: string;
    description?: string;
    clinicalDescription?: string;
    audioCue?: string;
    rangeOfMotion?: string;
    difficultyLevel?: string;
    thumbnailUrl?: string;
    imageUrl?: string;
    images?: unknown;
    videoUrl?: string;
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    defaultExecutionTime?: number;
    defaultRestBetweenSets?: number;
    defaultRestBetweenReps?: number;
    preparationTime?: number;
    side?: string;
    exerciseSide?: string;
    mainTags?: Array<{ name?: string } | string>;
    additionalTags?: Array<{ name?: string } | string>;
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
    rangeOfMotion?: string;
    difficultyLevel?: string;
    patientDescription?: string;
    clinicalDescription?: string;
    audioCue?: string;
    loadWeightKg?: number;
    loadSource?: string;
    loadType?: string;
    loadValue?: number;
    loadUnit?: string;
    loadText?: string;
    load?: ExerciseLoad | {
      loadWeightKg?: number | null;
      loadSource?: string | null;
      type: string;
      value?: number;
      unit?: string;
      text: string;
    };
  }
): ExerciseExecutionCardData {
  const isTimeBased = exercise.type?.toLowerCase() === 'time';
  const load =
    params.load ??
    buildLoadFromScalars({
      loadWeightKg: params.loadWeightKg,
      loadSource: params.loadSource,
      type: params.loadType,
      value: params.loadValue,
      unit: params.loadUnit,
      text: params.loadText,
    });
  const loadKg = resolveLoadKg(load) ?? params.loadValue ?? params.loadWeightKg;
  const loadDisplayText =
    (load && 'text' in load ? load.text : params.loadText) ??
    (loadKg == null ? undefined : `${loadKg} kg`);

  const thumb = buildImageUrls(exercise.thumbnailUrl, exercise.imageUrl, exercise.images)[0];
  return {
    id: exercise.id,
    sourceExerciseId: exercise.id,
    displayName: resolveDisplayName(params.customName, exercise.name),
    thumbnailUrl: thumb ?? undefined,
    imageUrls: buildImageUrls(exercise.thumbnailUrl, exercise.imageUrl, exercise.images),
    videoUrl: exercise.videoUrl,
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
    patientDescription:
      params.patientDescription ?? exercise.patientDescription ?? exercise.description,
    clinicalDescription: params.clinicalDescription ?? exercise.clinicalDescription,
    audioCue: params.audioCue ?? exercise.audioCue,
    rangeOfMotion: params.rangeOfMotion ?? exercise.rangeOfMotion,
    difficultyLevel: params.difficultyLevel ?? exercise.difficultyLevel,
    mainTags: exercise.mainTags
      ?.map((tag) => (typeof tag === 'string' ? tag : tag.name))
      .filter((tag): tag is string => Boolean(tag)),
    additionalTags: exercise.additionalTags
      ?.map((tag) => (typeof tag === 'string' ? tag : tag.name))
      .filter((tag): tag is string => Boolean(tag)),
    customName: params.customName,
    customDescription: params.customDescription,
    side: (params.exerciseSide ?? exercise.side ?? exercise.exerciseSide ?? 'both')?.toLowerCase(),
    isTimeBased,
  };
}
