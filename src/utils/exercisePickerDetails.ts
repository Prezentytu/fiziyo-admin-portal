import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/** Enrichment fetched per exercise; `null` means loaded and empty. Missing key means not loaded yet. */
export type EnrichmentById = ReadonlyMap<string, ExerciseEnrichmentData | null>;

/** Picker list items with enrichmentData attached only where it was loaded. */
export function withLoadedEnrichment<T extends { id: string }>(
  exercises: readonly T[],
  enrichmentById: EnrichmentById
): Array<T & { enrichmentData?: ExerciseEnrichmentData | null }> {
  if (enrichmentById.size === 0) return [...exercises];
  return exercises.map((exercise) =>
    enrichmentById.has(exercise.id) ? { ...exercise, enrichmentData: enrichmentById.get(exercise.id) ?? null } : exercise
  );
}

/** Unique exercise ids whose enrichment is not loaded yet, in first-seen order. */
export function findMissingEnrichmentIds(exerciseIds: readonly string[], enrichmentById: EnrichmentById): string[] {
  return [...new Set(exerciseIds)].filter((exerciseId) => exerciseId && !enrichmentById.has(exerciseId));
}
