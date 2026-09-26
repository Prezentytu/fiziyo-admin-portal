import { buildMappingOverridesJson } from '@/components/shared/exercise/mappingOverrides';
import type { BuilderExercise } from '@/contexts/ExerciseBuilderContext';
import type { ExerciseMappingSubmitInput } from '@/features/exercise-sets/utils/createSetSubmit';

/**
 * Sidebar → create-set adapter. Dosage stays on mapping columns;
 * side (and only side, which the sidebar card can change) goes to overridesJson
 * against the catalog `side` baseline — same contract as CreateSetWizard.
 */
export function buildBuilderExerciseMapping(exercise: BuilderExercise): ExerciseMappingSubmitInput {
  const catalogSide = exercise.side;
  const desiredSide = exercise.exerciseSide ?? exercise.side;
  const overridesJson = buildMappingOverridesJson(
    { side: catalogSide, exerciseSide: catalogSide },
    { exerciseSide: desiredSide }
  );

  return {
    exerciseId: exercise.id,
    sets: exercise.sets,
    reps: exercise.reps,
    duration: exercise.duration,
    restSets: exercise.restSets,
    restReps: exercise.restReps,
    preparationTime: exercise.preparationTime,
    executionTime: exercise.executionTime,
    notes: exercise.notes,
    customName: exercise.customName,
    customDescription: exercise.customDescription,
    tempo: exercise.tempo,
    loadWeightKg: exercise.loadWeightKg,
    loadValue: exercise.loadValue,
    overridesJson: overridesJson ?? '',
  };
}
