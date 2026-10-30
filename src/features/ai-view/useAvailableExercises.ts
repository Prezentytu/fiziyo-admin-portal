'use client';

import { useQuery } from '@apollo/client/react';

import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import type { fromBuilderExercise } from '@/components/shared/exercise/adapters';

export type ChatCatalogExercise = Parameters<typeof fromBuilderExercise>[0];

/** Same query and cache entry as the set composer, so opening it from chat is instant. */
export function useAvailableExercises(organizationId: string, enabled: boolean) {
  const { data, loading, error } = useQuery<{ availableExercises?: ChatCatalogExercise[] }>(
    GET_AVAILABLE_EXERCISES_QUERY,
    { variables: { organizationId }, skip: !organizationId || !enabled }
  );
  return { exercises: data?.availableExercises ?? [], loading, error };
}
