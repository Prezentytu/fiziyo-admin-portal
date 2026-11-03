'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';

import {
  GET_AVAILABLE_EXERCISES_PICKER_QUERY,
  GET_EXERCISE_ENRICHMENT_QUERY,
} from '@/graphql/queries/exercises.queries';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { findMissingEnrichmentIds, withLoadedEnrichment } from '@/utils/exercisePickerDetails';

interface UseExercisePickerLibraryOptions {
  organizationId: string | null | undefined;
  skip?: boolean;
  /** Exercises whose enrichment must be loaded before their content is edited or saved (chosen in the builder). */
  detailExerciseIds: readonly string[];
  /** Enrichment already at hand (e.g. from set mappings), so those exercises need no extra request. */
  knownEnrichment?: ReadonlyArray<{ id: string; enrichmentData?: ExerciseEnrichmentData | null }>;
}

interface ExerciseEnrichmentResponse {
  exerciseById: { id: string; updatedAt?: string | null; enrichmentData?: ExerciseEnrichmentData | null } | null;
}

interface FetchedEnrichment {
  enrichmentData: ExerciseEnrichmentData | null;
  updatedAt: string | null;
}

/**
 * Exercise library for pickers: light list for browsing, enrichment only for chosen exercises.
 * `detailsReady` is false until every chosen exercise has its enrichment; callers block saving until then,
 * because override deltas against a missing template would clear or freeze patient content.
 */
export function useExercisePickerLibrary<T extends { id: string; updatedAt?: string | null }>({
  organizationId,
  skip = false,
  detailExerciseIds,
  knownEnrichment,
}: UseExercisePickerLibraryOptions) {
  const apolloClient = useApolloClient();
  const [fetchedEnrichment, setFetchedEnrichment] = useState<ReadonlyMap<string, FetchedEnrichment>>(() => new Map());
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());

  const { data, loading, error, refetch } = useQuery<{ availableExercises?: T[] }>(
    GET_AVAILABLE_EXERCISES_PICKER_QUERY,
    {
      variables: { organizationId: organizationId ?? '' },
      skip: skip || !organizationId,
    }
  );

  const enrichmentById = useMemo(() => {
    const listUpdatedAt = new Map((data?.availableExercises ?? []).map((exercise) => [exercise.id, exercise.updatedAt ?? null]));
    const merged = new Map<string, ExerciseEnrichmentData | null>();
    for (const [exerciseId, fetched] of fetchedEnrichment) {
      // An exercise edited since its enrichment was fetched is fetched again.
      const currentUpdatedAt = listUpdatedAt.get(exerciseId);
      if (currentUpdatedAt === undefined || currentUpdatedAt === fetched.updatedAt) {
        merged.set(exerciseId, fetched.enrichmentData);
      }
    }
    for (const known of knownEnrichment ?? []) {
      if (known.enrichmentData !== undefined && !merged.has(known.id)) {
        merged.set(known.id, known.enrichmentData);
      }
    }
    return merged;
  }, [data, fetchedEnrichment, knownEnrichment]);

  const missingIds = useMemo(
    () => findMissingEnrichmentIds(detailExerciseIds, enrichmentById).filter((exerciseId) => !failedIds.has(exerciseId)),
    [detailExerciseIds, enrichmentById, failedIds]
  );
  const missingKey = missingIds.join('|');
  const listLoaded = Boolean(data?.availableExercises);

  useEffect(() => {
    if (skip || !listLoaded || missingIds.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missingIds.map((exerciseId) =>
        apolloClient
          .query<ExerciseEnrichmentResponse>({
            query: GET_EXERCISE_ENRICHMENT_QUERY,
            variables: { id: exerciseId },
            fetchPolicy: 'network-only',
          })
          .then((result) => ({ exerciseId, exercise: result.data?.exerciseById ?? null }))
          .catch(() => ({ exerciseId, exercise: undefined }))
      )
    ).then((results) => {
      if (cancelled) return;
      const loaded = results.filter((result) => result.exercise);
      const failed = results.filter((result) => !result.exercise).map((result) => result.exerciseId);
      if (loaded.length > 0) {
        setFetchedEnrichment((previous) => {
          const next = new Map(previous);
          for (const result of loaded) {
            next.set(result.exerciseId, {
              enrichmentData: result.exercise?.enrichmentData ?? null,
              updatedAt: result.exercise?.updatedAt ?? null,
            });
          }
          return next;
        });
      }
      if (failed.length > 0) {
        setFailedIds((previous) => new Set([...previous, ...failed]));
      }
    });
    return () => {
      cancelled = true;
    };
    // missingKey carries missingIds; the array itself is a fresh reference on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, listLoaded, missingKey, skip]);

  const retryDetails = useCallback(() => setFailedIds(new Set()), []);

  const exercises = useMemo(
    () => withLoadedEnrichment(data?.availableExercises ?? [], enrichmentById),
    [data, enrichmentById]
  );

  const detailsFailed = useMemo(
    () => detailExerciseIds.some((exerciseId) => failedIds.has(exerciseId)),
    [detailExerciseIds, failedIds]
  );

  const detailsReady = findMissingEnrichmentIds(detailExerciseIds, enrichmentById).length === 0;

  /** Call before saving; false means wait (button shows pending) or the content failed to load (retried). */
  const ensureDetailsReady = useCallback((): boolean => {
    if (detailsReady) return true;
    if (detailsFailed) {
      retryDetails();
      toast.error('Nie udało się wczytać treści wybranych ćwiczeń. Ponawiamy, spróbuj zapisać za chwilę.');
    }
    return false;
  }, [detailsFailed, detailsReady, retryDetails]);

  return {
    exercises,
    loading,
    error,
    refetch,
    detailsReady,
    /** Content of chosen exercises is still loading; show the save button as pending. */
    detailsPending: !detailsReady && !detailsFailed,
    ensureDetailsReady,
  };
}
