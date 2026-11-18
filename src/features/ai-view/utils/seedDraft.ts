import { sortMappingsByOrder } from '@/features/assignment/utils/sortMappingsByOrder';
import type { ExerciseLikeForDefaults } from '@/features/exercise-sets/utils/exerciseDefaults';
import { pickExercisesById } from './exerciseLookup';
import { applyDose, draftItemFromExercise, draftItemFromMapping, type DraftDose, type DraftItem } from './setDraft';

type SeedExercise = ExerciseLikeForDefaults & { id: string };
type SeedMapping = Parameters<typeof draftItemFromMapping>[0] & { order?: number | null };

interface SeedInput {
  setId?: string;
  exerciseIds: readonly string[];
  /** Per exercise id; numbers from a visit note or document. */
  doses?: Readonly<Record<string, DraftDose>>;
  /** Rows of the proposal this one continues, as the therapist left them; they win over defaults and doses. */
  items?: readonly DraftItem[];
  sets: ReadonlyArray<{ id: string; exerciseMappings?: readonly SeedMapping[] | null }>;
  setsReady: boolean;
  exercises: readonly SeedExercise[];
  exercisesReady: boolean;
  /**
   * Proponowane id, których nie ma w `exercises`, są już dociągnięte albo nie istnieją. Do tego czasu szkic czeka,
   * bo zasiany za wcześnie zamarzłby bez ćwiczeń spoza pierwszej strony katalogu (P-4).
   */
  missingSettled?: boolean;
}

/**
 * First rows of a chat draft, or null while what they come from is still loading. A draft from a
 * catalog set waits for the sets: seeding early would freeze an empty card.
 */
export function seedDraftItems(input: SeedInput): { items: DraftItem[]; missingSet: boolean } | null {
  if (!input.exercisesReady) return null;
  if (!input.setId) {
    const known = new Set(input.exercises.map((exercise) => exercise.id));
    if (!input.missingSettled && input.exerciseIds.some((exerciseId) => !known.has(exerciseId))) return null;
    const kept = new Map((input.items ?? []).map((item) => [item.exerciseId, item]));
    return {
      items: pickExercisesById(input.exercises, input.exerciseIds).map(
        (exercise) => kept.get(exercise.id) ?? applyDose(draftItemFromExercise(exercise), input.doses?.[exercise.id])
      ),
      missingSet: false,
    };
  }
  if (!input.setsReady) return null;
  const set = input.sets.find((candidate) => candidate.id === input.setId);
  if (!set) return { items: [], missingSet: true };
  const byId = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));
  return {
    items: sortMappingsByOrder(set.exerciseMappings ?? []).map((mapping) =>
      draftItemFromMapping(mapping, byId.get(mapping.exerciseId))
    ),
    missingSet: false,
  };
}
