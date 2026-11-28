import { fromBuilderExercise } from '@/components/shared/exercise/adapters';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise/types';
import type { ChatCatalogExercise } from '../useAvailableExercises';
import type { DraftItem } from './setDraft';

/**
 * Converts a chat set-draft item (with therapist's live edits) into the exact card model
 * consumed by `PatientPreviewDialog` / `PatientPreviewTab` (SPEC-070).
 */
export function draftItemToPreviewCard(
  exercise: ChatCatalogExercise,
  item: DraftItem
): ExerciseExecutionCardData {
  return fromBuilderExercise(exercise, {
    sets: item.sets,
    reps: item.reps,
    duration: item.duration,
    executionTime: item.executionTime,
    restSets: item.restSets,
    restReps: item.restReps,
    preparationTime: item.preparationTime,
    tempo: item.tempo,
    loadWeightKg: item.loadKg,
    notes: item.notes,
    exerciseSide: item.side,
  });
}

/** Converts a catalog search result into the patient phone preview model using template defaults. */
export function catalogExerciseToPreviewCard(exercise: ChatCatalogExercise): ExerciseExecutionCardData {
  return fromBuilderExercise(exercise, {});
}
