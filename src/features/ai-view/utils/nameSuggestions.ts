import { normalizeForMatch } from '@/utils/stringSimilarity';
import type { SearchableExercise } from './exerciseLookup';
import { tokenizeWords, wordMatches } from './textMatch';

/** How long the therapist has to stop typing before AI is asked (each ask costs a credit). */
export const NAME_SUGGESTIONS_DELAY_MS = 2000;
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

// A name shorter than this is no movement word („z”, „na”, „w”).
const MIN_WORD_LENGTH = 3;
// The first words name the movement („mostek biodrowy”, „cofanie brody”); position and equipment come after.
const CORE_WORDS = 2;
// Exercises the E2E suite leaves on DEV („E2E-<uuid> …”) are nobody's catalog.
export function isTestExercise(name: string): boolean {
  return /^e2e-/i.test(name.trim());
}

/**
 * Share of the suggested name's words found in the catalog exercise's name (closest first), or 0 when the
 * catalog name misses the movement itself: a shared „na jednej nodze” or „leżenie tyłem” is not a similar
 * exercise, while a plain „Mostek biodrowy” is one for „Mostek biodrowy na jednej nodze”.
 */
export function nameSimilarity(catalogName: string, suggestedName: string): number {
  if (isTestExercise(catalogName)) return 0;
  const words = tokenizeWords(suggestedName).filter((word) => word.length >= MIN_WORD_LENGTH);
  if (words.length === 0) return 0;
  const nameWords = tokenizeWords(catalogName);
  const hit = (word: string) => nameWords.some((candidate) => wordMatches(candidate, word));
  if (!words.slice(0, CORE_WORDS).every(hit)) return 0;
  return words.filter(hit).length / words.length;
}

/**
 * „W katalogu są podobne”: catalog exercises that do the movement the suggested names describe, closest
 * first, without the ones already shown or already in the set (`exclude`). Nothing close: an empty list,
 * so the therapist creates the new exercise instead of reading unrelated ones.
 */
export function similarFromSuggestions<T extends SearchableExercise>(
  exercises: readonly T[],
  names: readonly string[],
  exclude: ReadonlySet<string>,
  limit = 4
): T[] {
  if (names.length === 0) return [];
  return (
    exercises
      .filter((exercise) => !exclude.has(exercise.id))
      .map((exercise) => {
        const scores = names.map((name) => nameSimilarity(exercise.name, name));
        const score = Math.max(...scores);
        return { exercise, score, nameIndex: scores.indexOf(score) };
      })
      .filter((entry) => entry.score > 0)
      // Equally close: in the order AI suggested the names.
      .sort((left, right) => right.score - left.score || left.nameIndex - right.nameIndex)
      .slice(0, limit)
      .map((entry) => entry.exercise)
  );
}
