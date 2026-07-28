/**
 * Inferuje ExerciseType dla mutacji create/update.
 *
 * Reguła timerowa (zgodna z CreateExerciseWizard / ExerciseEditor):
 * `executionTime > 0` → time (timer w aplikacji pacjenta), inaczej reps.
 */
export function inferExerciseType(executionTime: number | null | undefined): 'time' | 'reps' {
  return (executionTime ?? 0) > 0 ? 'time' : 'reps';
}
