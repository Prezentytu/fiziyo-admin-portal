'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import { GET_AVAILABLE_EXERCISES_PICKER_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import type { fromBuilderExercise } from '@/components/shared/exercise/adapters';
import { withTagNames } from './utils/exerciseLookup';

export type ChatCatalogExercise = Parameters<typeof fromBuilderExercise>[0];

const NO_TAGS: ReadonlyArray<{ id: string; name: string }> = [];

/** Same picker and tag queries (and cache entries) as the set composer, so opening it from chat is instant. */
export function useAvailableExercises(organizationId: string, enabled: boolean) {
  const skip = !organizationId || !enabled;
  const { data, loading, error } = useQuery<{ availableExercises?: ChatCatalogExercise[] }>(
    GET_AVAILABLE_EXERCISES_PICKER_QUERY,
    { variables: { organizationId }, skip }
  );
  const { data: tagsData } = useQuery<{ exerciseTags?: Array<{ id: string; name: string }> }>(
    GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY,
    { variables: { organizationId }, skip }
  );
  const exercises = useMemo(
    () => withTagNames(data?.availableExercises ?? [], tagsData?.exerciseTags ?? NO_TAGS),
    [data, tagsData]
  );
  return { exercises, loading, error };
}
