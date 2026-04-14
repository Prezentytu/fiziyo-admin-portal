import { getMediaUrls } from '@/utils/mediaUrl';

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
