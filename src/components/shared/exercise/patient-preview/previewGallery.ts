import { getMediaUrl } from '@/utils/mediaUrl';
import type { ExerciseExecutionCardData } from '../types';

/**
 * Zdjęcia podglądu ćwiczenia w kolejności, w jakiej pokazuje je podgląd: miniatura na początku,
 * jeśli nie ma jej w galerii, potem galeria. Pierwsze zdjęcie trafia też na telefon „Jak u pacjenta”.
 */
export function buildPreviewGallery(
  exercise: Pick<ExerciseExecutionCardData, 'imageUrls' | 'thumbnailUrl'> | null | undefined
): string[] {
  if (!exercise) return [];
  const imagesFromGallery = (exercise.imageUrls ?? [])
    .map((image) => getMediaUrl(image) ?? image)
    .filter((image): image is string => Boolean(image?.trim()));
  const thumbnailFallback = exercise.thumbnailUrl
    ? (getMediaUrl(exercise.thumbnailUrl) ?? exercise.thumbnailUrl)
    : null;

  if (thumbnailFallback && !imagesFromGallery.includes(thumbnailFallback)) {
    return [thumbnailFallback, ...imagesFromGallery];
  }
  return imagesFromGallery;
}
