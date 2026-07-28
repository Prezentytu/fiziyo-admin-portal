import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/**
 * Buduje zmienne `updateExercise` dla zapisu enrichmentData.
 *
 * Terapeuci org NIE mają uprawnień ContentManager — nie wolno używać
 * adminowej `updateExerciseField`. Backend `UpdateExercise` przyjmuje
 * `enrichmentDataJson` i jest dostępny dla edytorów ćwiczenia.
 */
export function buildEnrichmentUpdateVariables(
  exerciseId: string,
  payload: ExerciseEnrichmentData | null | undefined
): { exerciseId: string; enrichmentDataJson: string } {
  return {
    exerciseId,
    enrichmentDataJson: JSON.stringify(payload ?? {}),
  };
}

export function isExerciseSaveAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('unauthorized') ||
    message.includes('brak uprawnień') ||
    message.includes('permission') ||
    message.includes('forbidden')
  );
}
