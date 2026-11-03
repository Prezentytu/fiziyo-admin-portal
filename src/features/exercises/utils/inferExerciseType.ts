/**
 * Zgaduje ExerciseType dla SZKICU bez zapisanego typu (kreator tworzenia).
 * `executionTime > 0` → time, inaczej reps.
 *
 * Dla zapisanego ćwiczenia typ jest wprost w `Exercise.type` i wygrywa
 * (`normalizeExerciseType` z `@/utils/exerciseEnums`); nie wołaj tej funkcji.
 */
export function inferExerciseType(executionTime: number | null | undefined): 'time' | 'reps' {
  return (executionTime ?? 0) > 0 ? 'time' : 'reps';
}
