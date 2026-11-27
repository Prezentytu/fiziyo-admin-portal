import { fromBuilderExercise, type ExerciseExecutionCardData } from '@/components/shared/exercise';
import type { ChatCatalogExercise } from '../useAvailableExercises';
import type { DraftItem } from './setDraft';

/**
 * The exercise preview from a set proposal: the catalog exercise with the parameters this proposal gives it,
 * so the preview shows what the patient would get, not the catalog defaults.
 */
export function draftPreviewData(exercise: ChatCatalogExercise, item: DraftItem): ExerciseExecutionCardData {
  return fromBuilderExercise(exercise, {
    sets: item.sets,
    reps: item.reps,
    duration: item.duration,
    executionTime: item.executionTime,
    restSets: item.restSets,
    restReps: item.restReps,
    preparationTime: item.preparationTime,
    tempo: item.tempo,
    notes: item.notes,
    loadWeightKg: item.loadKg,
    exerciseSide: item.side,
  });
}
