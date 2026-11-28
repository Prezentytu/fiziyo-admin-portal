import { sortMappingsByOrder } from '@/features/assignment/utils/sortMappingsByOrder';
import type { ExerciseLikeForDefaults } from '@/features/exercise-sets/utils/exerciseDefaults';
import { pickExercisesById } from './exerciseLookup';
import { applyDose, draftItemFromExercise, draftItemFromMapping, type DraftDose, type DraftItem } from './setDraft';

type SeedExercise = ExerciseLikeForDefaults & { id: string; type?: string | null };
type SeedMapping = Parameters<typeof draftItemFromMapping>[0] & { order?: number | null };

interface SeedInput {
  setId?: string;
  /** SPEC-068 (K1): zestaw bazowy przy jawnej liście `exerciseIds` — zachowane pozycje dziedziczą jego parametry. */
  baseSetId?: string;
  exerciseIds: readonly string[];
  /** Per exercise id; numbers from a visit note or document. */
  doses?: Readonly<Record<string, DraftDose>>;
  /** Rows of the proposal this one continues, as the therapist left them; they win over defaults and doses. */
  items?: readonly DraftItem[];
  /** SPEC-061: proposed warm-up among `exerciseIds`; rows the therapist already left keep their own flag. */
  warmupExerciseIds?: readonly string[];
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
 * First rows of a chat draft, or null while what they come from is still loading.
 * SPEC-068 (K1): jawna lista `exerciseIds` ZAWSZE wygrywa z `setId`/`baseSetId`, dziedzicząc z zestawu
 * bazowego wyłącznie parametry ćwiczeń, które zostały na liście.
 */
export function seedDraftItems(input: SeedInput): { items: DraftItem[]; missingSet: boolean } | null {
  if (!input.exercisesReady) return null;
  const sourceSetId = input.baseSetId ?? input.setId;

  if (input.exerciseIds.length > 0) {
    if (sourceSetId && !input.setsReady) return null;
    const sourceSet = sourceSetId ? input.sets.find((candidate) => candidate.id === sourceSetId) : undefined;
    const mappingByExerciseId = new Map(
      (sourceSet?.exerciseMappings ?? []).map((mapping) => [mapping.exerciseId, mapping])
    );
    const byId = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));
    const missingFromPool = input.exerciseIds.some(
      (exerciseId) => !byId.has(exerciseId) && !mappingByExerciseId.get(exerciseId)?.exercise
    );
    if (!input.missingSettled && missingFromPool) return null;

    const kept = new Map((input.items ?? []).map((item) => [item.exerciseId, item]));
    const warmup = new Set(input.warmupExerciseIds ?? []);
    const items: DraftItem[] = [];
    const seen = new Set<string>();
    for (const exerciseId of input.exerciseIds) {
      if (seen.has(exerciseId)) continue;
      seen.add(exerciseId);
      const retained = kept.get(exerciseId);
      if (retained) {
        items.push(retained);
        continue;
      }
      const mapping = mappingByExerciseId.get(exerciseId);
      const exercise = byId.get(exerciseId) ?? mapping?.exercise ?? undefined;
      if (mapping) {
        const mapped = draftItemFromMapping(mapping, exercise);
        const withDose = applyDose(mapped, input.doses?.[exerciseId]);
        items.push(warmup.has(exerciseId) ? { ...withDose, isWarmup: true } : withDose);
        continue;
      }
      if (!exercise) continue;
      const fresh = applyDose(draftItemFromExercise(exercise), input.doses?.[exercise.id]);
      items.push(warmup.has(exercise.id) ? { ...fresh, isWarmup: true } : fresh);
    }
    return { items, missingSet: false };
  }

  if (!input.setId) {
    return {
      items: pickExercisesById(input.exercises, input.exerciseIds).map((exercise) =>
        applyDose(draftItemFromExercise(exercise), input.doses?.[exercise.id])
      ),
      missingSet: false,
    };
  }
  if (!input.setsReady) return null;
  // A version the therapist returns to: its rows as they were left, not the set's mapping again.
  if (input.items) return { items: [...input.items], missingSet: false };
  const set = input.sets.find((candidate) => candidate.id === input.setId);
  if (!set) return { items: [], missingSet: true };
  const byId = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));
  return {
    items: sortMappingsByOrder(set.exerciseMappings ?? []).map((mapping) =>
      draftItemFromMapping(mapping, byId.get(mapping.exerciseId) ?? mapping.exercise ?? undefined)
    ),
    missingSet: false,
  };
}
