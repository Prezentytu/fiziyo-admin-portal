import { normalizeForMatch } from '@/utils/stringSimilarity';
import { searchExercises, type SearchableExercise } from './exerciseLookup';

/** How long the therapist has to stop typing before AI is asked (each ask costs a credit). */
export const NAME_SUGGESTIONS_DELAY_MS = 1000;
/** Shorter text is still being typed: no AI yet. */
export const NAME_SUGGESTIONS_MIN_LENGTH = 4;

/** The key one asked text is cached under: case, accents and punctuation do not ask again. */
export function nameSuggestionsKey(query: string): string {
  return normalizeForMatch(query).replaceAll(/\s+/g, ' ').trim();
}

/** „Czy chodziło Ci o”: up to `limit` different names from AI, none the same as what was typed. */
export function suggestedNames(variants: ReadonlyArray<{ name: string }>, query: string, limit = 3): string[] {
  const seen = new Set([nameSuggestionsKey(query)]);
  const names: string[] = [];
  for (const { name } of variants) {
    const key = nameSuggestionsKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(name.trim());
    if (names.length === limit) break;
  }
  return names;
}

/**
 * „W katalogu są podobne”: catalog exercises the suggested names find, in their order, without the ones
 * already shown or already in the set (`exclude`).
 */
export function similarFromSuggestions<T extends SearchableExercise>(
  exercises: readonly T[],
  names: readonly string[],
  exclude: ReadonlySet<string>,
  limit = 4
): T[] {
  const found: T[] = [];
  const ids = new Set(exclude);
  for (const name of names) {
    for (const exercise of searchExercises(exercises, name, 3)) {
      if (ids.has(exercise.id)) continue;
      ids.add(exercise.id);
      found.push(exercise);
      if (found.length === limit) return found;
    }
  }
  return found;
}
