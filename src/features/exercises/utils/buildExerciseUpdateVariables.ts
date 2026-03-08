import type { ExerciseFormValues } from '../ExerciseForm';

interface BuildExerciseUpdateVariablesInput {
  exerciseId: string;
  values: ExerciseFormValues;
}

export function buildExerciseUpdateVariables({ exerciseId, values }: BuildExerciseUpdateVariablesInput) {
  return {
    exerciseId,
    name: values.name,
    description: values.description || '',
    type: values.type,
    sets: values.sets,
    reps: values.reps,
    duration: values.duration,
    restSets: values.restSets,
    restReps: values.restReps,
    preparationTime: values.preparationTime,
    executionTime: values.executionTime,
    videoUrl: values.videoUrl || null,
    notes: values.notes || null,
    exerciseSide: values.exerciseSide === 'none' ? null : values.exerciseSide,
    tempo: values.tempo || null,
    clinicalDescription: values.clinicalDescription || null,
    audioCue: values.audioCue || null,
    rangeOfMotion: values.rangeOfMotion || null,
  };
}
