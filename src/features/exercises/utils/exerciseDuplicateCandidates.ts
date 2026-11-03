import { normalizeForMatch, similarity } from '@/utils/stringSimilarity';

interface NamedExercise {
  readonly id: string;
  readonly name: string;
}

export interface PreparedExerciseName<T extends NamedExercise> {
  readonly item: T;
  readonly normalizedName: string;
}

const SIMILAR_EXERCISES_LIMIT = 5;
const TYPO_SIMILARITY_THRESHOLD = 0.7;
// The backend prompt keeps only the first 80 names (AIController.BuildExerciseSuggestionPrompt).
export const AI_DUPLICATE_NAMES_LIMIT = 80;

/** Normalize the library once, not on every keystroke (a large organization has thousands of names). */
export function prepareExerciseNames<T extends NamedExercise>(exercises: readonly T[]): PreparedExerciseName<T>[] {
  return exercises.map((item) => ({ item, normalizedName: normalizeForMatch(item.name) }));
}

/** Inline Library Guard: substring hits first, then typos (Levenshtein), without the exact name. */
export function findSimilarExercises<T extends NamedExercise>(
  name: string,
  exercises: readonly PreparedExerciseName<T>[]
): T[] {
  const normalizedInput = normalizeForMatch(name);
  if (normalizedInput.length < 2) return [];

  const substringHits: T[] = [];
  const typoHits: { item: T; score: number }[] = [];
  for (const { item, normalizedName } of exercises) {
    if (normalizedName === normalizedInput) continue;
    if (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)) {
      substringHits.push(item);
      continue;
    }
    // Levenshtein distance is at least the length difference, so most names are rejected without computing it.
    const longer = Math.max(normalizedName.length, normalizedInput.length);
    if (Math.abs(normalizedName.length - normalizedInput.length) > longer * (1 - TYPO_SIMILARITY_THRESHOLD)) continue;
    const score = similarity(normalizedInput, normalizedName);
    if (score >= TYPO_SIMILARITY_THRESHOLD) typoHits.push({ item, score });
  }

  const closestTypos = typoHits
    .sort((left, right) => right.score - left.score)
    .slice(0, SIMILAR_EXERCISES_LIMIT)
    .map(({ item }) => item);
  return [...substringHits, ...closestTypos].slice(0, SIMILAR_EXERCISES_LIMIT);
}

/** Names for AI duplicate detection, closest first, so the prompt cap does not cut the relevant ones. */
export function rankExerciseNamesForDuplicateCheck(
  name: string,
  exercises: readonly PreparedExerciseName<NamedExercise>[],
  limit: number = AI_DUPLICATE_NAMES_LIMIT
): string[] {
  const normalizedInput = normalizeForMatch(name);
  if (normalizedInput.length < 2) return [];

  return exercises
    .map(({ item, normalizedName }) => {
      const isSubstring = normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName);
      return { name: item.name, score: similarity(normalizedInput, normalizedName) + (isSubstring ? 1 : 0) };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.name);
}
