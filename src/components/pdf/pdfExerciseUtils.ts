import { getMediaUrl } from '@/utils/mediaUrl';
import { preloadPdfImages } from './pdfImagePreloader';
import type { PDFExercise } from './types';

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
