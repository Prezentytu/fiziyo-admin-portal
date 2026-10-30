/**
 * Enumy ćwiczenia na granicy GraphQL.
 *
 * Wyjście GraphQL: `type: ExerciseType!` (REPS | TIME), `side: ExerciseSide!`
 * (NONE | LEFT | RIGHT | BOTH | ALTERNATING). Wejście createExercise/updateExercise
 * przyjmuje stringi, backend parsuje je bez rozróżniania wielkości liter.
 * W panelu trzymamy wartości małymi literami.
 */

export type ExerciseTypeValue = 'reps' | 'time';
export type ExerciseSideValue = 'none' | 'left' | 'right' | 'both' | 'alternating';

const EXERCISE_SIDES: readonly ExerciseSideValue[] = ['none', 'left', 'right', 'both', 'alternating'];

/** `REPS` / `reps` → `reps`, `TIME` / `time` → `time`; nieznane albo puste → `undefined`. */
export function normalizeExerciseType(value: string | null | undefined): ExerciseTypeValue | undefined {
  const normalized = value?.toString().trim().toLowerCase();
  if (normalized === 'reps' || normalized === 'time') return normalized;
  return undefined;
}

/** `LEFT` / `left` → `left` itd.; nieznane albo puste → `undefined`. */
export function normalizeExerciseSide(value: string | null | undefined): ExerciseSideValue | undefined {
  const normalized = value?.toString().trim().toLowerCase();
  return EXERCISE_SIDES.find((side) => side === normalized);
}
