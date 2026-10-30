import {
  resolveEffectiveExerciseParams,
  type EffectiveMappingSource,
} from '@/components/shared/exercise/resolveEffectiveExerciseParams';

export interface OverrideInheritedParams {
  sets: number;
  reps: number;
  duration: number;
  executionTime: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
  exerciseSide: string;
}

/**
 * Wartości, które pacjent dostaje bez nadpisania przypisania:
 * mapping.overridesJson → kolumny mappingu → domyślne ćwiczenia (kanon).
 * Dialog nadpisań porównuje z nimi stan formularza i zapisuje tylko różnice.
 */
export function resolveOverrideInheritedParams(mapping: EffectiveMappingSource): OverrideInheritedParams {
  const effective = resolveEffectiveExerciseParams(mapping);
  return {
    sets: effective.sets,
    reps: effective.reps,
    duration: effective.duration ?? 0,
    executionTime: effective.executionTime ?? 0,
    restSets: effective.restSets,
    restReps: effective.restReps,
    preparationTime: effective.preparationTime,
    exerciseSide: effective.side ?? 'none',
  };
}
