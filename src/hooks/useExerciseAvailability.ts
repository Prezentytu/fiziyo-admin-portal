'use client';

import { useQuery } from '@apollo/client/react';

import { GET_EXERCISE_AVAILABILITY_QUERY } from '@/graphql/queries/exercises.queries';

interface ExerciseAvailabilityResponse {
  exerciseById?: { id: string; availability?: string | null } | null;
}

/**
 * Dostępność ćwiczenia (`STANDARD` | `DEMO`) albo `undefined`, gdy API jej nie zna, jeszcze nie odpowiedziało
 * albo zapytanie się nie powiodło. Nigdy nie blokuje ekranu: brak odpowiedzi znaczy „zachowaj się jak dotąd”.
 */
export function useExerciseAvailability(exerciseId: string | null | undefined): string | undefined {
  const { data } = useQuery<ExerciseAvailabilityResponse>(GET_EXERCISE_AVAILABILITY_QUERY, {
    variables: { id: exerciseId ?? '' },
    skip: !exerciseId,
    errorPolicy: 'ignore',
  });
  return data?.exerciseById?.availability ?? undefined;
}
