/**
 * Exercise image fallback chain for PDF generation.
 *
 * Single source of truth used by GeneratePDFDialog. Mirrors the lesson
 * "thumbnail-first detail preview" - admin/PDF must use the same chain
 * that mobile and exercise detail views use.
 */
export interface ExerciseImageSource {
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: string[];
}

export function resolveExerciseImageUrl(exercise: ExerciseImageSource | undefined | null): string | undefined {
  if (!exercise) return undefined;
  return exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0] || undefined;
}
