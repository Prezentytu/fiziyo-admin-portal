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
