import type { SetDraftReturn } from './setDraft';
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

/** The form keeps the destination draft until the regular catalog save returns its exercise ID. */
export function newExerciseForSet(name: string | undefined, addToSet: SetDraftReturn) {
  return {
    text: 'Sprawdź nazwę i przygotuj opis oraz parametry ćwiczenia. Po zapisaniu ćwiczenie pojawi się w szkicu zestawu.',
    spec: { component: 'CreateExercise' as const, name, addToSet },
  };
}
