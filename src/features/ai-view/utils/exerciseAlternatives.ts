interface AlternativeCandidate {
  id: string;
  name: string;
  mainTags?: Array<{ name?: string } | string>;
  additionalTags?: Array<{ name?: string } | string>;
}

function tagNames(tags: AlternativeCandidate['mainTags']): string[] {
  return (tags ?? [])
    .map((tag) => (typeof tag === 'string' ? tag : (tag.name ?? '')).trim().toLocaleLowerCase('pl-PL'))
    .filter(Boolean);
}

/**
 * Catalog exercises to swap in for one row of a draft: the most shared main tags first (same body
 * part or goal), then shared additional tags; exercises already in the draft never come back.
 */
export function findAlternatives<T extends AlternativeCandidate>(
  exercise: AlternativeCandidate,
  pool: readonly T[],
  excludeIds: readonly string[],
  limit = 3
): T[] {
  const mainTags = new Set(tagNames(exercise.mainTags));
  const additionalTags = new Set(tagNames(exercise.additionalTags));
  if (mainTags.size === 0 && additionalTags.size === 0) return [];
  const excluded = new Set([exercise.id, ...excludeIds]);
  return pool
    .filter((candidate) => !excluded.has(candidate.id))
    .map((candidate) => {
      const mainScore = tagNames(candidate.mainTags).filter((tag) => mainTags.has(tag)).length;
      const additionalScore = tagNames(candidate.additionalTags).filter((tag) => additionalTags.has(tag)).length;
      return { candidate, score: mainScore * 3 + additionalScore };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name, 'pl'))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
