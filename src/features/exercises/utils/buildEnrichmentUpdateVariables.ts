import type { ApolloClient } from '@apollo/client';

import { GET_EXERCISE_BY_ID_QUERY } from '@/graphql/queries/exercises.queries';
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

/**
 * Dokument treści ćwiczenia prosto z backendu, z pominięciem cache. Formularz porównuje go z wersją wczytaną,
 * zanim zapisze (`fetchCurrentEnrichment` w `useExerciseEditorForm`). Brak rekordu to błąd, nie pusty dokument.
 */
export async function fetchCurrentEnrichmentData(
  client: Pick<ApolloClient, 'query'>,
  exerciseId: string
): Promise<ExerciseEnrichmentData | string | null> {
  const { data } = await client.query({
    query: GET_EXERCISE_BY_ID_QUERY,
    variables: { id: exerciseId },
    fetchPolicy: 'network-only',
  });
  const exercise = (data as { exerciseById?: { enrichmentData?: ExerciseEnrichmentData | string | null } | null } | undefined)
    ?.exerciseById;
  if (!exercise) throw new Error('Nie udało się pobrać aktualnej wersji ćwiczenia.');
  return exercise.enrichmentData ?? null;
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
