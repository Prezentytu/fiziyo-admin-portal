/**
 * Domyślne parametry ćwiczenia według kanonu (fizjo-app/.ai/DOMAIN_MODEL.md, Exercise):
 * DefaultSets 3, DefaultRestBetweenSets 60 s, DefaultRestBetweenReps 0, PreparationTime 5 s.
 * W GraphQL te pola są niepuste (`Decimal!`), więc fallback działa tylko dla danych,
 * które ich nie pobrały. `reps: 10` to konwencja panelu (DefaultReps jest nullable).
 */
export const EXERCISE_PARAM_DEFAULTS = {
  sets: 3,
  reps: 10,
  restSets: 60,
  restReps: 0,
  preparationTime: 5,
} as const;

/** Pola szablonu ćwiczenia tak, jak zwraca je GraphQL `Exercise`. */
export interface ExerciseTemplateParamSource {
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultDuration?: number | null;
  defaultExecutionTime?: number | null;
  defaultRestBetweenSets?: number | null;
  defaultRestBetweenReps?: number | null;
  preparationTime?: number | null;
}

export interface ExerciseTemplateParams {
  sets: number;
  reps: number;
  duration?: number;
  executionTime?: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
}

function definedOr<T>(value: T | null | undefined, fallback: T): T {
  return value === undefined || value === null ? fallback : value;
}

/**
 * Jedno mapowanie `Exercise.default*` → parametry wykonania z kanonicznymi domyślnymi.
 * `Exercise` nie ma pola `sets`; czytamy wyłącznie `defaultSets`.
 */
export function readExerciseTemplateParams(
  exercise: ExerciseTemplateParamSource | null | undefined
): ExerciseTemplateParams {
  return {
    sets: definedOr(exercise?.defaultSets, EXERCISE_PARAM_DEFAULTS.sets),
    reps: definedOr(exercise?.defaultReps, EXERCISE_PARAM_DEFAULTS.reps),
    duration: exercise?.defaultDuration ?? undefined,
    executionTime: exercise?.defaultExecutionTime ?? undefined,
    restSets: definedOr(exercise?.defaultRestBetweenSets, EXERCISE_PARAM_DEFAULTS.restSets),
    restReps: definedOr(exercise?.defaultRestBetweenReps, EXERCISE_PARAM_DEFAULTS.restReps),
    preparationTime: definedOr(exercise?.preparationTime, EXERCISE_PARAM_DEFAULTS.preparationTime),
  };
}
