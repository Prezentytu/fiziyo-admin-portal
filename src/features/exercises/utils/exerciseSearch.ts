const COMBINING_MARKS = /[\u0300-\u036f]/g;
const WHITESPACE = /\s+/;

export const MIN_SEARCH_TOKEN_LENGTH = 2;
export const MAX_SEARCH_TOKENS = 8;

export type ExerciseSearchFields = {
  name?: string | null;
  description?: string | null;
  patientDescription?: string | null;
  clinicalDescription?: string | null;
  aliases?: readonly (string | null | undefined)[] | null;
  keywords?: readonly (string | null | undefined)[] | null;
  mainTags?: readonly unknown[] | null;
  additionalTags?: readonly unknown[] | null;
};

export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .replaceAll(/[łŁ]/g, (character) => (character === 'Ł' ? 'L' : 'l'))
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase();
}

export function tokenizeSearchQuery(query: string | null | undefined): string[] {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const raw of normalizeSearchText(query).split(WHITESPACE)) {
    if (raw.length < MIN_SEARCH_TOKEN_LENGTH || seen.has(raw)) {
      continue;
    }
    seen.add(raw);
    tokens.push(raw);
    if (tokens.length >= MAX_SEARCH_TOKENS) {
      break;
    }
  }

  return tokens;
}

export function matchesExerciseSearch(
  exercise: ExerciseSearchFields,
  query: string | null | undefined
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return true;
  }

  const haystacks = collectHaystacks(exercise);
  return tokens.every((token) => haystacks.some((haystack) => haystack.includes(token)));
}

/** 0 name starts with first token, 1 name contains all tokens, 2 tags/aliases, 3 descriptions. */
export function rankExerciseSearch(
  exercise: ExerciseSearchFields,
  query: string | null | undefined
): number {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return 0;
  }

  const name = normalizeSearchText(exercise.name);
  const nameHit = tokens.every((token) => name.includes(token));
  if (nameHit) {
    return name.startsWith(tokens[0] ?? '') ? 0 : 1;
  }

  const tagHaystacks = [
    ...collectTagNames(exercise.mainTags),
    ...collectTagNames(exercise.additionalTags),
    ...collectStringList(exercise.aliases),
  ].map(normalizeSearchText);

  if (tokens.every((token) => tagHaystacks.some((haystack) => haystack.includes(token)))) {
    return 2;
  }

  return 3;
}

export function filterExercisesBySearch<T extends ExerciseSearchFields>(
  exercises: readonly T[],
  query: string | null | undefined
): T[] {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return [...exercises];
  }

  return exercises
    .filter((exercise) => matchesExerciseSearch(exercise, query))
    .sort((left, right) => rankExerciseSearch(left, query) - rankExerciseSearch(right, query));
}

function collectHaystacks(exercise: ExerciseSearchFields): string[] {
  return [
    exercise.name,
    exercise.description,
    exercise.patientDescription,
    exercise.clinicalDescription,
    ...collectStringList(exercise.aliases),
    ...collectStringList(exercise.keywords),
    ...collectTagNames(exercise.mainTags),
    ...collectTagNames(exercise.additionalTags),
  ]
    .map(normalizeSearchText)
    .filter(Boolean);
}

function collectStringList(values: readonly (string | null | undefined)[] | null | undefined): string[] {
  if (!values) {
    return [];
  }
  return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

function collectTagNames(tags: readonly unknown[] | null | undefined): string[] {
  if (!tags) {
    return [];
  }

  const names: string[] = [];
  for (const tag of tags) {
    if (typeof tag === 'string' && tag.trim().length > 0) {
      names.push(tag);
      continue;
    }
    if (tag && typeof tag === 'object' && 'name' in tag) {
      const name = (tag as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim().length > 0) {
        names.push(name);
      }
    }
  }
  return names;
}
