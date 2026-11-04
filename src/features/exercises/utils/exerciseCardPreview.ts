import { getYouTubePosterUrl } from '@/components/shared/media/mediaItems';
import { getMediaUrl } from '@/utils/mediaUrl';

export interface ExerciseCardPreviewInput {
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  images?: (string | null | undefined)[] | null;
  videoUrl?: string | null;
}

export interface ExerciseCardPreview {
  /** Obrazek na kartę: zdjęcie ćwiczenia, a bez zdjęcia klatka z filmu YouTube. */
  imageUrl?: string;
  /** Ćwiczenie ma film, ale nie mamy z niego klatki (np. nasze filmy z Vimeo). */
  hasVideoWithoutFrame: boolean;
}

export function getExerciseCardPreview(exercise: ExerciseCardPreviewInput): ExerciseCardPreview {
  const photoUrl = getMediaUrl(exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0]);
  if (photoUrl) return { imageUrl: photoUrl, hasVideoWithoutFrame: false };

  const videoUrl = getMediaUrl(exercise.videoUrl);
  if (!videoUrl) return { hasVideoWithoutFrame: false };

  const posterUrl = getYouTubePosterUrl(videoUrl);
  return posterUrl ? { imageUrl: posterUrl, hasVideoWithoutFrame: false } : { hasVideoWithoutFrame: true };
}
