import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import type { AiExerciseVariant } from '@/features/exercises/utils/aiFullExercise';

/** AI ideas for new exercises, without those the catalog already has under the same name. */
export function freshIdeas(ideas: readonly AiExerciseVariant[], catalogNames: readonly string[]): AiExerciseVariant[] {
  const known = new Set(catalogNames.map((name) => normalizeSearchText(name).trim()));
  const seen = new Set<string>();
  return ideas.filter((idea) => {
    const key = normalizeSearchText(idea.name).trim();
    if (!key || known.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
