'use client';

import { useQuery } from '@apollo/client/react';

import { canDuplicateExercise } from '@/features/exercises/utils/buildDuplicateExerciseVariables';
import { GET_EXERCISE_AVAILABILITY_QUERY } from '@/graphql/queries/exercises.queries';
import { isSchemaValidationError } from '@/lib/graphql/isSchemaValidationError';

interface ExerciseAvailabilityResponse {
  exerciseById?: { id: string; availability?: string | null } | null;
}

/**
 * - `loading`: zapytanie trwa, dostępność nieznana.
 * - `known`: backend zna pole (`availability` może być pusta).
 * - `unsupported`: backend nie zna pola (schemat sprzed fizjo-app#388 odrzucił dokument walidacją); na takim
 *   backendzie rekordów demo nie ma, więc zachowanie jak dotąd.
 * - `error`: zapytanie padło z innego powodu (sieć, 5xx); dostępność nieznana.
 */
export type ExerciseAvailabilityState =
  | { status: 'loading' }
  | { status: 'known'; availability: string | undefined }
  | { status: 'unsupported' }
  | { status: 'error' };

/**
 * Dostępność ćwiczenia (`STANDARD` | `DEMO`) jako stan. Nie blokuje ekranu (osobne zapytanie), ale kto z niej
 * korzysta, nie może traktować `loading` ani `error` jak „nie demo”.
 */
export function useExerciseAvailability(exerciseId: string | null | undefined): ExerciseAvailabilityState {
  const { data, loading, error } = useQuery<ExerciseAvailabilityResponse>(GET_EXERCISE_AVAILABILITY_QUERY, {
    variables: { id: exerciseId ?? '' },
    skip: !exerciseId,
  });

  if (!exerciseId) return { status: 'unsupported' };
  if (loading) return { status: 'loading' };
  if (error) return isSchemaValidationError(error) ? { status: 'unsupported' } : { status: 'error' };
  return { status: 'known', availability: data?.exerciseById?.availability ?? undefined };
}

/** „Duplikuj” tylko, gdy wiemy, że to nie rekord demo: nie w trakcie ładowania i nie po błędzie sieci. */
export function isDuplicateAllowed(state: ExerciseAvailabilityState): boolean {
  if (state.status === 'unsupported') return true;
  if (state.status === 'known') return canDuplicateExercise({ availability: state.availability });
  return false;
}
