import { sortMappingsByOrder } from '@/features/assignment/utils/sortMappingsByOrder';
import type { ExerciseLikeForDefaults } from '@/features/exercise-sets/utils/exerciseDefaults';
import { pickExercisesById } from './exerciseLookup';
import { draftItemFromExercise, draftItemFromMapping, type DraftItem } from './setDraft';

type SeedExercise = ExerciseLikeForDefaults & { id: string };
type SeedMapping = Parameters<typeof draftItemFromMapping>[0] & { order?: number | null };

interface SeedInput {
  setId?: string;
  exerciseIds: readonly string[];
  sets: ReadonlyArray<{ id: string; exerciseMappings?: readonly SeedMapping[] | null }>;
  setsReady: boolean;
  exercises: readonly SeedExercise[];
  exercisesReady: boolean;
}

/**
 * First rows of a chat draft, or null while what they come from is still loading. A draft from a
 * catalog set waits for the sets: seeding early would freeze an empty card.
 */
export function seedDraftItems(input: SeedInput): { items: DraftItem[]; missingSet: boolean } | null {
  if (!input.exercisesReady) return null;
  if (!input.setId) {
    return {
      items: pickExercisesById(input.exercises, input.exerciseIds).map((exercise) => draftItemFromExercise(exercise)),
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
