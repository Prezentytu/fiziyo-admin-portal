import { formatLoad } from '@/utils/loadParser';
import type { ExerciseLoad } from '@/features/assignment/types';
import type { ExerciseFieldValueSource } from './displayRegistry';

interface ExerciseSourceLike {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  side?: string | null;
  exerciseSide?: string | null;
  preparationTime?: number | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  difficultyLevel?: string | null;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  audioCue?: string | null;
  notes?: string | null;
  loadText?: string | null;
  defaultLoad?: ExerciseLoad | null;
  loadType?: string | null;
  loadValue?: number | null;
  loadUnit?: string | null;
}

interface ExerciseDefaultSourceLike extends ExerciseSourceLike {
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultDuration?: number | null;
  defaultExecutionTime?: number | null;
  defaultRestBetweenSets?: number | null;
  defaultRestBetweenReps?: number | null;
}

function toOptionalNumber(value?: number | null): number | undefined {
  return value == null ? undefined : value;
}

function toOptionalString(value?: string | null): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function buildScalarLoad(source: ExerciseSourceLike): ExerciseLoad | undefined {
  const hasScalarLoad = source.loadValue != null || source.loadType != null || source.loadUnit != null || source.loadText != null;
  if (!hasScalarLoad) return undefined;

  const normalizedType: ExerciseLoad['type'] =
    source.loadType === 'band' || source.loadType === 'bodyweight' || source.loadType === 'other'
      ? source.loadType
      : 'weight';
  const normalizedUnit: ExerciseLoad['unit'] =
    source.loadUnit === 'kg' || source.loadUnit === 'lbs' || source.loadUnit === 'level'
      ? source.loadUnit
      : undefined;
  const loadTextFromValue =
    source.loadValue == null ? '' : `${source.loadValue}${normalizedUnit ? ` ${normalizedUnit}` : ''}`.trim();

  return {
    type: normalizedType,
    value: source.loadValue ?? undefined,
    unit: normalizedUnit,
    text: source.loadText?.trim() || loadTextFromValue || 'Obciążenie',
  };
}

export function resolveLoadDisplayText(source: ExerciseSourceLike): string | undefined {
  const normalizedLoadText = toOptionalString(source.loadText);
  if (normalizedLoadText) return normalizedLoadText;

  const parsedLoad = source.defaultLoad ?? buildScalarLoad(source);
  const formattedLoad = parsedLoad ? formatLoad(parsedLoad) : '';
  return formattedLoad || undefined;
}

export function normalizeExerciseFieldValues(source: ExerciseDefaultSourceLike): ExerciseFieldValueSource {
  return {
    sets: toOptionalNumber(source.defaultSets ?? source.sets),
    reps: toOptionalNumber(source.defaultReps ?? source.reps),
    duration: toOptionalNumber(source.defaultDuration ?? source.duration),
    executionTime: toOptionalNumber(source.defaultExecutionTime ?? source.executionTime),
    restSets: toOptionalNumber(source.defaultRestBetweenSets ?? source.restSets),
    restReps: toOptionalNumber(source.defaultRestBetweenReps ?? source.restReps),
    preparationTime: toOptionalNumber(source.preparationTime),
    tempo: toOptionalString(source.tempo),
    loadDisplayText: resolveLoadDisplayText(source),
    side: toOptionalString(source.side ?? source.exerciseSide),
    rangeOfMotion: toOptionalString(source.rangeOfMotion),
    difficultyLevel: toOptionalString(source.difficultyLevel),
    patientDescription: toOptionalString(source.patientDescription ?? source.description),
    clinicalDescription: toOptionalString(source.clinicalDescription),
    audioCue: toOptionalString(source.audioCue),
    notes: toOptionalString(source.notes),
  };
}
