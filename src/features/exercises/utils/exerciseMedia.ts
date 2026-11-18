import { getMediaUrls } from '@/utils/mediaUrl';
import type { ExerciseImagePhase } from '@/types/ai.types';

export interface ExerciseMediaSources {
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  images?: (string | null | undefined)[] | null;
}

export interface ExerciseMediaChangeSetInput {
  initialExistingUrls: string[];
  keptExistingUrls: string[];
  newFiles: File[];
}

export interface ExerciseMediaChangeSet {
  removedImageUrls: string[];
  filesToUpload: File[];
}

export function getExerciseMediaGalleryUrls({ thumbnailUrl, imageUrl, images }: ExerciseMediaSources): string[] {
  return getMediaUrls([thumbnailUrl, imageUrl, ...(images ?? [])]);
}

export function buildExerciseMediaChangeSet({
  initialExistingUrls,
  keptExistingUrls,
  newFiles,
}: ExerciseMediaChangeSetInput): ExerciseMediaChangeSet {
  const initialSet = new Set(initialExistingUrls);
  const keptSet = new Set(keptExistingUrls);

  const removedImageUrls = initialExistingUrls.filter((url) => initialSet.has(url) && !keptSet.has(url));

  return {
    removedImageUrls,
    filesToUpload: newFiles,
  };
}

/** Faza ruchu na kolejnym obrazie z AI: pierwszy slot to „Start”, drugi „Koniec”, dalsze bez fazy. */
export function nextGeneratedImagePhase(existingCount: number): ExerciseImagePhase | undefined {
  if (existingCount === 0) return 'start';
  if (existingCount === 1) return 'end';
  return undefined;
}

/** Obraz „Koniec” trafia za „Start”; pozostałe wygenerowane obrazy zostają na początku galerii. */
export function insertGeneratedImage<T>(files: T[], file: T, phase: ExerciseImagePhase | undefined): T[] {
  return phase === 'end' ? [...files, file] : [file, ...files];
}

/** Ćwiczenie ma najwyżej tyle zdjęć; backend i panel trzymają ten sam limit. */
export const MAX_EXERCISE_IMAGES = 5;

/**
 * Podpowiedź przy pełnej galerii: bez niej „Dodaj zdjęcie” i „Generuj AI” są po prostu wyszarzone,
 * a fizjoterapeuta myśli, że generowania w edycji nie ma (zgłoszenie z DEV 18.11).
 */
export function imageLimitHint(imageCount: number): string | null {
  if (imageCount < MAX_EXERCISE_IMAGES) return null;
  return `Masz ${MAX_EXERCISE_IMAGES} z ${MAX_EXERCISE_IMAGES} zdjęć. Usuń jedno, żeby dodać albo wygenerować nowe.`;
}
