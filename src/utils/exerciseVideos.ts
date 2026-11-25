import { isSameVideoIgnoringStart, withVideoStart } from '@/utils/videoEmbed';

export const MAX_EXERCISE_VIDEOS = 10;
export const MAX_VIDEO_URL_LENGTH = 500;

export interface ExerciseVideosSource {
  videos?: ReadonlyArray<string | null | undefined> | null;
  videoUrl?: string | null;
}

/** Trimmed, non-empty, unique addresses in the given order, cut to the backend limit. */
export function normalizeVideoList(videos: ReadonlyArray<string | null | undefined> | null | undefined): string[] {
  const unique = new Set<string>();
  for (const video of videos ?? []) {
    const trimmed = video?.trim();
    if (trimmed) unique.add(trimmed);
  }
  return [...unique].slice(0, MAX_EXERCISE_VIDEOS);
}

/**
 * Videos of an exercise or a set mapping, main video first.
 * A record read before the backend had `videos` carries only `videoUrl`.
 */
export function getExerciseVideos(source: ExerciseVideosSource | null | undefined): string[] {
  const videos = normalizeVideoList(source?.videos);
  return videos.length > 0 ? videos : normalizeVideoList([source?.videoUrl]);
}

/** A set mapping with its own videos overrides the exercise's list, like `videoUrl` does. */
export function getMappingVideos(
  mapping: (ExerciseVideosSource & { exercise?: ExerciseVideosSource | null }) | null | undefined
): string[] {
  const own = getExerciseVideos(mapping);
  return own.length > 0 ? own : getExerciseVideos(mapping?.exercise);
}

export function isSameVideoList(first: ReadonlyArray<string>, second: ReadonlyArray<string>): boolean {
  const normalizedFirst = normalizeVideoList(first);
  const normalizedSecond = normalizeVideoList(second);
  return (
    normalizedFirst.length === normalizedSecond.length &&
    normalizedFirst.every((video, index) => video === normalizedSecond[index])
  );
}

/** Sets (or clears, with null) the start marker on every row showing `videoUrl`, whatever its current start (SPEC-064). */
export function setVideoStartInList(
  videos: ReadonlyArray<string>,
  videoUrl: string,
  seconds: number | null
): string[] {
  return videos.map((video) =>
    video.trim() && isSameVideoIgnoringStart(video, videoUrl) ? withVideoStart(video.trim(), seconds) : video
  );
}

export function canAddVideo(videos: ReadonlyArray<string>): boolean {
  return videos.length < MAX_EXERCISE_VIDEOS;
}

export function setVideoAt(videos: ReadonlyArray<string>, index: number, value: string): string[] {
  const next = videos.length === 0 ? [''] : [...videos];
  if (index < 0 || index >= next.length) return next;
  next[index] = value;
  return next;
}

export function addVideo(videos: ReadonlyArray<string>): string[] {
  if (!canAddVideo(videos)) return [...videos];
  // An empty list is shown as one empty row, so adding to it gives two.
  return videos.length === 0 ? ['', ''] : [...videos, ''];
}

export function removeVideoAt(videos: ReadonlyArray<string>, index: number): string[] {
  return videos.filter((_, position) => position !== index);
}

export function moveVideo(videos: ReadonlyArray<string>, from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= videos.length || to >= videos.length) return [...videos];
  const next = [...videos];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Message for the row at `index`, or null when the address can be saved as typed. */
export function getVideoUrlError(videos: ReadonlyArray<string>, index: number): string | null {
  const value = videos[index]?.trim() ?? '';
  if (!value) return null;
  if (value.length > MAX_VIDEO_URL_LENGTH) return `Adres może mieć najwyżej ${MAX_VIDEO_URL_LENGTH} znaków.`;
  if (!/^https?:\/\/\S+$/i.test(value)) return 'Podaj pełny adres zaczynający się od https://';
  if (videos.findIndex((video) => video.trim() === value) < index) return 'Ten film jest już na liście.';
  return null;
}
