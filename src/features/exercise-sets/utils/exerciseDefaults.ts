import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import { EXERCISE_PARAM_DEFAULTS } from '@/components/shared/exercise/exerciseParamDefaults';
import { normalizeExerciseSide } from '@/utils/exerciseEnums';

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
  loadWeightKg?: number;
  loadSource?: string;
  rangeOfMotion?: string;
  difficultyLevel?: string;
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  customImages?: string[];
  enrichment?: ExerciseEnrichmentData;
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
  preparationTime?: number | null;
  tempo?: string | null;
  notes?: string | null;
  rangeOfMotion?: string | null;
  difficultyLevel?: string | null;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  audioCue?: string | null;
  enrichmentData?: ExerciseEnrichmentData | null;
}

export const EMPTY_EXERCISE_PARAMS: ExerciseParams = {
  sets: EXERCISE_PARAM_DEFAULTS.sets,
  reps: EXERCISE_PARAM_DEFAULTS.reps,
  duration: 0,
  restSets: EXERCISE_PARAM_DEFAULTS.restSets,
  restReps: EXERCISE_PARAM_DEFAULTS.restReps,
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
  loadWeightKg: undefined,
  loadSource: undefined,
  rangeOfMotion: '',
  difficultyLevel: 'UNKNOWN',
  patientDescription: '',
  clinicalDescription: '',
  audioCue: '',
  customImages: undefined,
  enrichment: toV3(null),
};

/**
 * Parametry startowe nowego mappingu w kreatorze zestawu. Wynik trafia do mutacji
 * dodania ćwiczenia, więc legacy `sets`/`restSets` z lokalnych obiektów buildera zostają
 * jako fallback, a `preparationTime` i strona zachowują dotychczasowe wartości zapisu.
 */
export function getExerciseDefaultParams(exercise: ExerciseLikeForDefaults): ExerciseParams {
  return {
    sets: exercise.defaultSets ?? exercise.sets ?? EXERCISE_PARAM_DEFAULTS.sets,
    reps: exercise.defaultReps ?? exercise.reps ?? EXERCISE_PARAM_DEFAULTS.reps,
    duration: exercise.defaultDuration ?? exercise.duration ?? 0,
    restSets: exercise.defaultRestBetweenSets ?? exercise.restSets ?? EXERCISE_PARAM_DEFAULTS.restSets,
    restReps: exercise.defaultRestBetweenReps ?? exercise.restReps ?? EXERCISE_PARAM_DEFAULTS.restReps,
    preparationTime: exercise.preparationTime ?? 0,
    executionTime: exercise.defaultExecutionTime ?? 0,
    notes: exercise.notes ?? '',
    exerciseSide: normalizeExerciseSide(exercise.side) ?? normalizeExerciseSide(exercise.exerciseSide) ?? 'both',
    customName: '',
    customDescription: '',
    tempo: exercise.tempo ?? '',
    loadType: '',
    loadValue: undefined,
    loadUnit: 'kg',
    loadText: '',
    loadWeightKg: undefined,
    loadSource: undefined,
    rangeOfMotion: exercise.rangeOfMotion ?? '',
    difficultyLevel: exercise.difficultyLevel ?? 'UNKNOWN',
    patientDescription: exercise.patientDescription ?? exercise.description ?? '',
    clinicalDescription: exercise.clinicalDescription ?? '',
    audioCue: exercise.audioCue ?? '',
    customImages: undefined,
    enrichment: exercise.enrichmentData === undefined ? undefined : toV3(exercise.enrichmentData),
  };
}
