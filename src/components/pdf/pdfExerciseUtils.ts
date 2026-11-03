import { getMediaUrl } from '@/utils/mediaUrl';
import { preloadPdfImages } from './pdfImagePreloader';
import type { PDFExercise } from './types';
import {
  resolveEffectiveExerciseParams,
  type EffectiveMappingSource,
} from '@/components/shared/exercise/resolveEffectiveExerciseParams';
import { normalizeExerciseSide, normalizeExerciseType } from '@/utils/exerciseEnums';

export interface ExerciseImageSource {
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: string[];
}

export interface PdfImagePreloadStats {
  total: number;
  loaded: number;
}

export function resolvePdfExerciseImageUrl(exercise: ExerciseImageSource | undefined | null): string | undefined {
  if (!exercise) return undefined;
  return exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0] || undefined;
}

/**
 * Rewrites `exercise.imageUrl` in-place to preloaded base64 data URLs.
 * Failed image loads become `undefined` so PDF gracefully falls back to placeholder.
 */
export async function preloadPdfExerciseImages(exercises: PDFExercise[]): Promise<PdfImagePreloadStats> {
  const absoluteImageUrls = exercises
    .map((exercise) => getMediaUrl(exercise.imageUrl))
    .filter((url): url is string => !!url);

  const stats: PdfImagePreloadStats = { total: absoluteImageUrls.length, loaded: 0 };
  if (absoluteImageUrls.length === 0) return stats;

  const dataUrlMap = await preloadPdfImages(absoluteImageUrls);
  stats.loaded = Array.from(dataUrlMap.values()).filter(Boolean).length;

  for (const exercise of exercises) {
    const absoluteImageUrl = getMediaUrl(exercise.imageUrl);
    const dataUrl = absoluteImageUrl ? dataUrlMap.get(absoluteImageUrl) : null;
    exercise.imageUrl = dataUrl ?? undefined;
  }

  return stats;
}

export interface PdfMappingSource extends EffectiveMappingSource {
  order?: number;
  exercise?: EffectiveMappingSource['exercise'] & {
    images?: string[];
  };
}

/**
 * Jedno mapowanie mappingu zestawu na ćwiczenie w PDF.
 * Parametry, typ i strona idą przez `resolveEffectiveExerciseParams`, więc PDF pokazuje
 * te same liczby co karta zestawu, kreator przypisania i podsumowanie.
 */
export function toPdfExercise(mapping: PdfMappingSource): PDFExercise {
  const exercise = mapping.exercise;
  const effective = resolveEffectiveExerciseParams(mapping);
  const type = normalizeExerciseType(exercise?.type);
  // TIME: serie × czas utrzymania; powtórzenia tylko jawne (mapping albo ćwiczenie), bez kanonu 10.
  const reps = type === 'time' ? (mapping.reps ?? exercise?.defaultReps ?? undefined) : effective.reps;
  return {
    id: mapping.id,
    name: exercise?.name || 'Nieznane ćwiczenie',
    description: exercise?.patientDescription || exercise?.description,
    type,
    exerciseSide: normalizeExerciseSide(effective.side),
    imageUrl: resolvePdfExerciseImageUrl(exercise),
    images: exercise?.images,
    notes: mapping.notes || exercise?.notes,
    sets: effective.sets,
    reps,
    duration: effective.duration,
    executionTime: effective.executionTime,
    restSets: effective.restSets,
    restReps: effective.restReps,
    order: mapping.order,
    customName: mapping.customName,
    customDescription: mapping.customDescription,
  };
}
