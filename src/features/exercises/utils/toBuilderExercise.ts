import type { BuilderExercise } from '@/contexts/ExerciseBuilderContext';
import { getExerciseDefaultParams } from '@/features/exercise-sets/utils/exerciseDefaults';
import type { Exercise } from '@/features/exercises/ExerciseCard';
import { isV33ExerciseRecord } from '@/utils/exerciseRecordVersion';

/** Ćwiczenie z listy biblioteki jako pozycja buildera zestawu; niesie wersję rekordu do czasu i dawki. */
export function toBuilderExercise(exercise: Exercise): BuilderExercise {
  const defaults = getExerciseDefaultParams(exercise);
  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    patientDescription: exercise.patientDescription ?? exercise.description,
    clinicalDescription: exercise.clinicalDescription,
    audioCue: exercise.audioCue,
    notes: exercise.notes,
    tempo: exercise.tempo,
    side: exercise.side,
    exerciseSide: defaults.exerciseSide,
    alternatingPerSide: isV33ExerciseRecord(exercise),
    preparationTime: exercise.preparationTime,
    thumbnailUrl: exercise.thumbnailUrl,
    imageUrl: exercise.imageUrl,
    images: exercise.images,
    defaultSets: exercise.defaultSets,
    defaultReps: exercise.defaultReps,
    defaultDuration: exercise.defaultDuration,
    defaultExecutionTime: exercise.defaultExecutionTime,
    defaultRestBetweenSets: exercise.defaultRestBetweenSets,
    defaultRestBetweenReps: exercise.defaultRestBetweenReps,
    sets: defaults.sets,
    reps: defaults.reps,
    duration: defaults.duration,
    executionTime: defaults.executionTime,
    restSets: defaults.restSets,
    restReps: defaults.restReps,
    customName: defaults.customName,
    customDescription: defaults.customDescription,
    loadType: defaults.loadType,
    loadValue: defaults.loadValue,
    loadUnit: defaults.loadUnit,
    loadText: defaults.loadText,
    type: exercise.type,
  };
}
