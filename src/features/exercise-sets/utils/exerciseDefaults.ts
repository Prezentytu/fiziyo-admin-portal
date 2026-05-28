export interface ExerciseParams {
  sets: number;
  reps: number;
  duration: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
  executionTime: number;
  notes: string;
  exerciseSide: string;
  customName: string;
  customDescription: string;
  tempo: string;
  loadType: string;
  loadValue?: number;
  loadUnit: string;
  loadText: string;
}

export interface ExerciseLikeForDefaults {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  side?: string | null;
  exerciseSide?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultDuration?: number | null;
  defaultRestBetweenSets?: number | null;
  defaultRestBetweenReps?: number | null;
  defaultExecutionTime?: number | null;
}

export const EMPTY_EXERCISE_PARAMS: ExerciseParams = {
  sets: 3,
  reps: 10,
  duration: 0,
  restSets: 60,
  restReps: 0,
  preparationTime: 0,
  executionTime: 0,
  notes: '',
  exerciseSide: 'both',
  customName: '',
  customDescription: '',
  tempo: '',
  loadType: '',
  loadValue: undefined,
  loadUnit: 'kg',
  loadText: '',
};

export function getExerciseDefaultParams(exercise: ExerciseLikeForDefaults): ExerciseParams {
  const normalizedSide = exercise.side?.trim().toLowerCase();
  const normalizedExerciseSide = exercise.exerciseSide?.trim().toLowerCase();

  return {
    sets: exercise.defaultSets ?? exercise.sets ?? 3,
    reps: exercise.defaultReps ?? exercise.reps ?? 10,
    duration: exercise.defaultDuration ?? exercise.duration ?? 0,
    restSets: exercise.defaultRestBetweenSets ?? exercise.restSets ?? 60,
    restReps: exercise.defaultRestBetweenReps ?? exercise.restReps ?? 0,
    preparationTime: 0,
    executionTime: exercise.defaultExecutionTime ?? 0,
    notes: '',
    exerciseSide: normalizedSide || normalizedExerciseSide || 'both',
    customName: '',
    customDescription: '',
    tempo: '',
    loadType: '',
    loadValue: undefined,
    loadUnit: 'kg',
    loadText: '',
  };
}
