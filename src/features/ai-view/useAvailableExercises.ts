'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import { useExercisePickerLibrary } from '@/hooks/useExercisePickerLibrary';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import type { fromBuilderExercise } from '@/components/shared/exercise/adapters';
import { withTagNames } from './utils/exerciseLookup';

export type ChatCatalogExercise = Parameters<typeof fromBuilderExercise>[0];

const NO_TAGS: ReadonlyArray<{ id: string; name: string }> = [];
const NO_DETAILS: readonly string[] = [];

/**
 * Same picker and tag queries (and cache entries) as the set composer, so opening it from chat is instant.
 * `detailExerciseIds`: exercises whose content (record version) is loaded on top of the light list; the draft
 * needs it to count "naprzemiennie" like the patient app. `detailsPending` is true until all of it is here.
 */
export function useAvailableExercises(
  organizationId: string,
  enabled: boolean,
  detailExerciseIds: readonly string[] = NO_DETAILS
) {
  const skip = !organizationId || !enabled;
  const {
    exercises: listed,
    loading,
    error,
    detailsReady,
    detailsPending,
    ensureDetailsReady,
  } = useExercisePickerLibrary<ChatCatalogExercise & { updatedAt?: string | null }>({
    organizationId,
    skip,
    detailExerciseIds,
  });
  const { data: tagsData } = useQuery<{ exerciseTags?: Array<{ id: string; name: string }> }>(
    GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY,
    { variables: { organizationId }, skip }
  );
  const exercises = useMemo(
    () => withTagNames(listed, tagsData?.exerciseTags ?? NO_TAGS),
    [listed, tagsData]
  );
  return { exercises, loading, error, detailsReady, detailsPending, ensureDetailsReady };
}
