/**
 * Pure helpers for filtering exercises by source (scope).
 * Used by ExerciseSetBuilder and exercises page for "Wszystkie" / "Moje ćwiczenia" / "FiziYo".
 */

export type ExerciseSourceFilter = 'all' | 'organization' | 'fiziyo';

export interface ExerciseWithScope {
  scope?: string;
}

/**
 * Filters exercises by source filter.
 * - all: return all
 * - organization: ORGANIZATION or PERSONAL
 * - fiziyo: GLOBAL
 */
export function filterExercisesBySource<T extends ExerciseWithScope>(
  exercises: T[],
  sourceFilter: ExerciseSourceFilter
): T[] {
  if (sourceFilter === 'all') return exercises;
  if (sourceFilter === 'organization') {
    return exercises.filter((ex) => ex.scope === 'ORGANIZATION' || ex.scope === 'PERSONAL');
  }
  if (sourceFilter === 'fiziyo') {
    return exercises.filter((ex) => ex.scope === 'GLOBAL');
  }
  return exercises;
}

export function countBySource(exercises: ExerciseWithScope[]): {
  total: number;
  organization: number;
  fiziyo: number;
} {
  const organization = exercises.filter(
    (ex) => ex.scope === 'ORGANIZATION' || ex.scope === 'PERSONAL'
  ).length;
  const fiziyo = exercises.filter((ex) => ex.scope === 'GLOBAL').length;
  return {
    total: exercises.length,
    organization,
    fiziyo,
  };
}
