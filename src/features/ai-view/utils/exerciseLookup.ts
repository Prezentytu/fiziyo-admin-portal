import { tokenizeWords, wordMatches } from './textMatch';

export interface SearchableExercise {
  id: string;
  name: string;
  description?: string | null;
  clinicalDescription?: string | null;
  patientDescription?: string | null;
  mainTags?: ReadonlyArray<{ name?: string | null } | string> | null;
  additionalTags?: ReadonlyArray<{ name?: string | null } | string> | null;
}

function exerciseWords(exercise: SearchableExercise): { name: string[]; rest: string[] } {
  const tagNames = [...(exercise.mainTags ?? []), ...(exercise.additionalTags ?? [])].map((tag) =>
    typeof tag === 'string' ? tag : (tag.name ?? '')
  );
  const texts = [exercise.description, exercise.clinicalDescription, exercise.patientDescription, ...tagNames];
  return {
    name: tokenizeWords(exercise.name),
    rest: tokenizeWords(texts.filter(Boolean).join(' ')),
  };
}

/**
 * Inflection-tolerant search for the non-AI path: every query word hits the name first,
 * then tags and descriptions; exercises matching only some words come last.
 */
export function searchExercises<T extends SearchableExercise>(exercises: readonly T[], query: string, limit = 8): T[] {
  const queryWords = tokenizeWords(query).filter((word) => word.length >= 3);
  if (queryWords.length === 0) return [];

  const ranked = exercises
    .map((exercise) => {
      const words = exerciseWords(exercise);
      let nameHits = 0;
      let otherHits = 0;
      for (const queryWord of queryWords) {
        if (words.name.some((word) => wordMatches(word, queryWord))) nameHits += 1;
        else if (words.rest.some((word) => wordMatches(word, queryWord))) otherHits += 1;
      }
      const hits = nameHits + otherHits;
      const allHit = hits === queryWords.length;
      return { exercise, score: (allHit ? 100 : 0) + nameHits * 2 + otherHits, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((left, right) => right.score - left.score || left.exercise.name.localeCompare(right.exercise.name, 'pl'));

  return ranked.slice(0, limit).map((entry) => entry.exercise);
}

type TagList = SearchableExercise['mainTags'];

/** The picker list carries tag ids; search and alternatives compare names, as the set wizard shows them. */
export function withTagNames<T extends Pick<SearchableExercise, 'mainTags' | 'additionalTags'>>(
  exercises: T[],
  tags: ReadonlyArray<{ id: string; name: string }>
): T[] {
  if (tags.length === 0) return exercises;
  const names = new Map(tags.map((tag) => [tag.id, tag.name]));
  const resolve = (list: TagList) =>
    list?.map((tag) => {
      const name = typeof tag === 'string' ? names.get(tag) : undefined;
      return name ? { name } : tag;
    });
  return exercises.map((exercise) => ({
    ...exercise,
    mainTags: resolve(exercise.mainTags),
    additionalTags: resolve(exercise.additionalTags),
  }));
}

export function pickExercisesById<T extends { id: string }>(exercises: readonly T[], ids: readonly string[]): T[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return ids.map((id) => byId.get(id)).filter((exercise): exercise is T => exercise !== undefined);
}
