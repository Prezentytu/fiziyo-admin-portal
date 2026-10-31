import { findSimilar, normalizeForMatch, similarity } from '@/utils/stringSimilarity';

interface NamedExercise {
  readonly id: string;
  readonly name: string;
}

const SIMILAR_EXERCISES_LIMIT = 5;
// The backend prompt keeps only the first 80 names (AIController.BuildExerciseSuggestionPrompt).
export const AI_DUPLICATE_NAMES_LIMIT = 80;

/** Inline Library Guard: substring hits first, then typos (Levenshtein), without the exact name. */
export function findSimilarExercises<T extends NamedExercise>(name: string, exercises: readonly T[]): T[] {
  const normalizedInput = normalizeForMatch(name);
  if (normalizedInput.length < 2) return [];

  const substringHits = exercises.filter((item) => {
    const normalizedName = normalizeForMatch(item.name);
    return (
      normalizedName !== normalizedInput &&
      (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName))
    );
  });
  const fuzzyHits = findSimilar(name, [...exercises], (item) => item.name, {
    limit: SIMILAR_EXERCISES_LIMIT,
    threshold: 0.7,
  });

  const seen = new Set<string>();
  const merged: T[] = [];
  for (const item of [...substringHits, ...fuzzyHits]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged.slice(0, SIMILAR_EXERCISES_LIMIT);
}

/** Names for AI duplicate detection, closest first, so the prompt cap does not cut the relevant ones. */
export function rankExerciseNamesForDuplicateCheck(
  name: string,
  exercises: readonly NamedExercise[],
  limit: number = AI_DUPLICATE_NAMES_LIMIT
): string[] {
  const normalizedInput = normalizeForMatch(name);
  if (normalizedInput.length < 2) return [];

  return exercises
    .map((item) => {
      const normalizedName = normalizeForMatch(item.name);
      const isSubstring = normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName);
      return { name: item.name, score: similarity(normalizedInput, normalizedName) + (isSubstring ? 1 : 0) };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.name);
}
