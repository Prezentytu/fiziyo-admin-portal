import type { ExerciseFormValues } from '../ExerciseForm';

interface BuildExerciseUpdateVariablesInput {
  exerciseId: string;
  values: ExerciseFormValues;
}

/**
 * Mapuje wartosci z ExerciseFormValues na zmienne mutacji UpdateExercise.
 *
 * WAZNE: Wszystkie pola obecne w UPDATE_EXERCISE_MUTATION musza byc
 * obecne tutaj, w przeciwnym razie edycja w panelu admin nie trafi do backendu
 * (a brak pola = backend zachowuje stara wartosc, co przy passthrough fields
 * z ExerciseFormValues utrzymuje integralnosc danych).
 */
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
    // Passthrough fields - przekazywane jesli sa obecne w values, w przeciwnym
    // razie undefined (Apollo nie wysle = backend zachowa istniejaca wartosc).
    mainTags: values.mainTags ?? undefined,
    additionalTags: values.additionalTags ?? undefined,
    difficultyLevel: values.difficultyLevel ?? undefined,
    loadType: values.loadType ?? undefined,
    loadValue: values.loadValue ?? undefined,
    loadUnit: values.loadUnit ?? undefined,
    loadText: values.loadText ?? undefined,
  };
}
