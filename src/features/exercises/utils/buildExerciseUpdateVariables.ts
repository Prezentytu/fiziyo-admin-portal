import { inferExerciseType } from './inferExerciseType';

/**
 * Legacy shape used by buildExerciseUpdateVariables tests and any residual callers.
 * New edit surfaces use useExerciseEditorForm → buildChangedCoreVariables (dirty-diff).
 */
export interface ExerciseUpdateFormValues {
  name: string;
  description?: string;
  type?: 'reps' | 'time';
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  executionTime?: number | null;
  exerciseSide?: 'none' | 'left' | 'right' | 'both' | 'alternating';
  videoUrl?: string;
  notes?: string;
  tempo?: string;
  clinicalDescription?: string;
  audioCue?: string;
  rangeOfMotion?: string;
  mainTags?: string[] | null;
  additionalTags?: string[] | null;
  difficultyLevel?: string | null;
  loadType?: string | null;
  loadValue?: number | null;
  loadUnit?: string | null;
  loadText?: string | null;
  loadWeightKg?: number | null;
  loadSource?: string | null;
}

interface BuildExerciseUpdateVariablesInput {
  exerciseId: string;
  values: ExerciseUpdateFormValues;
}

/**
 * Mapuje pełny snapshot formularza na zmienne mutacji UpdateExercise.
 * Preferowany write-path edycji: buildChangedCoreVariables (tylko dirty fields).
 */
export function buildExerciseUpdateVariables({ exerciseId, values }: BuildExerciseUpdateVariablesInput) {
  return {
    exerciseId,
    name: values.name,
    description: values.description || '',
    type: values.type ?? inferExerciseType(values.executionTime),
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
    mainTags: values.mainTags ?? undefined,
    additionalTags: values.additionalTags ?? undefined,
    difficultyLevel: values.difficultyLevel ?? undefined,
    loadType: values.loadType ?? undefined,
    loadValue: values.loadValue ?? undefined,
    loadUnit: values.loadUnit ?? undefined,
    loadText: values.loadText ?? undefined,
    loadWeightKg: values.loadWeightKg ?? undefined,
    loadSource: values.loadSource ?? undefined,
  };
}
