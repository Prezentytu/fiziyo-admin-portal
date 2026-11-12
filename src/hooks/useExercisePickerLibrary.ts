'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';

import {
  GET_EXERCISE_PICKER_DETAILS_QUERY,
  GET_EXERCISE_PICKER_RECORD_QUERY,
  GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY,
} from '@/graphql/queries/exercises.queries';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useExercisePickerPages, type ExercisePickerCounts } from '@/hooks/useExercisePickerPages';
import { findMissingEnrichmentIds, withLoadedEnrichment } from '@/utils/exercisePickerDetails';
import {
  mergeKnownExercises,
  POPULAR_CANDIDATE_LIMIT,
  topPopularExerciseIds,
  visiblePopularExerciseIds,
} from '@/utils/exercisePickerPages';
import type { ExerciseSourceFilter } from '@/utils/exerciseSourceFilter';

interface UseExercisePickerLibraryOptions {
  organizationId: string | null | undefined;
  skip?: boolean;
  /** Exercises whose record and enrichment must be loaded before their content is edited or saved (chosen in the builder). */
  detailExerciseIds: readonly string[];
  /** Enrichment already at hand (e.g. from set mappings), so those exercises need no enrichment request. */
  knownEnrichment?: ReadonlyArray<{ id: string; enrichmentData?: ExerciseEnrichmentData | null }>;
  /**
   * Exercises already in the set, shown but not edited: their records load by id, without blocking saving.
   * Loading by id skips the library's visibility rule, so these records are never offered for adding.
   */
  recordExerciseIds?: readonly string[];
  /** Usage count per exercise id; the most used ones the library still shows are "Popularne" above the list. */
  popularity?: Readonly<Record<string, number>>;
}

/** Browsing state of the picker list, rendered by ExerciseSetBuilder. Records are resolved from `exercises`. */
export interface ExercisePickerLibraryView {
  itemIds: readonly string[];
  popularIds: readonly string[];
  counts: ExercisePickerCounts | null;
  loading: boolean;
  loadingMore: boolean;
  remaining: number;
  loadMore: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  sourceFilter: ExerciseSourceFilter;
  onSourceFilterChange: (sourceFilter: ExerciseSourceFilter) => void;
}

interface FetchedDetails<T> {
  record: T;
  enrichmentData: ExerciseEnrichmentData | null;
  updatedAt: string | null;
}

type DetailsRecord<T> = T & { updatedAt?: string | null; enrichmentData?: ExerciseEnrichmentData | null };

interface ExerciseByIdResponse<T> {
  exerciseById: DetailsRecord<T> | null;
}

interface VisibleRecordsResponse<T> {
  firstWindow?: T[] | null;
  secondWindow?: T[] | null;
}

function toFetchedDetails<T>(exercise: DetailsRecord<T>): FetchedDetails<T> {
  const { enrichmentData, ...record } = exercise;
  return { record: record as T, enrichmentData: enrichmentData ?? null, updatedAt: exercise.updatedAt ?? null };
}

/**
 * Exercise library for pickers: server pages for browsing, records by id for exercises already chosen,
 * enrichment only for chosen ones. Everything offered for adding (pages, "Popularne") comes through the
 * library's visibility rule; a record fetched by id is known but never offered. `exercises` holds every record the picker knows, so callers can look up
 * chosen exercises even when they are on no loaded page (a set opened for editing, a search changed since).
 * `detailsReady` is false until every chosen exercise has its record and enrichment; callers block saving
 * until then, because override deltas against a missing template would clear or freeze patient content.
 */
export function useExercisePickerLibrary<T extends { id: string; updatedAt?: string | null }>({
  organizationId,
  skip = false,
  detailExerciseIds,
  knownEnrichment,
  recordExerciseIds,
  popularity,
}: UseExercisePickerLibraryOptions) {
  const apolloClient = useApolloClient();
  const [searchInput, setSearchInput] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ExerciseSourceFilter>('all');
  const search = useDebouncedValue(searchInput.trim());
  const pages = useExercisePickerPages<T>({ organizationId, skip, search, sourceFilter });

  // Records seen on any page stay known after the search or tab changes, so chosen exercises do not vanish.
  const [seen, setSeen] = useState<{ organizationId: string; items: readonly T[]; byId: ReadonlyMap<string, T> }>(
    () => ({ organizationId: organizationId ?? '', items: [], byId: new Map() })
  );
  let seenById = seen.byId;
  if (seen.items !== pages.items || seen.organizationId !== (organizationId ?? '')) {
    const next = new Map(seen.organizationId === (organizationId ?? '') ? seen.byId : undefined);
    for (const item of pages.items) next.set(item.id, item);
    seenById = next;
    setSeen({ organizationId: organizationId ?? '', items: pages.items, byId: next });
  }

  const [fetchedDetails, setFetchedDetails] = useState<ReadonlyMap<string, FetchedDetails<T>>>(() => new Map());
  const [extraRecords, setExtraRecords] = useState<ReadonlyMap<string, T>>(() => new Map());
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [failedRecordIds, setFailedRecordIds] = useState<ReadonlySet<string>>(() => new Set());

  // "Popularne": the most used exercises, asked from the library list narrowed to their ids, so the library's
  // visibility rule decides what can be offered. A failed or pending request offers none.
  const popularCandidateIds = useMemo(() => topPopularExerciseIds(popularity, POPULAR_CANDIDATE_LIMIT), [popularity]);
  const { data: visiblePopularData } = useQuery<VisibleRecordsResponse<T>>(GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY, {
    variables: { organizationId: organizationId ?? '', ids: popularCandidateIds },
    skip: skip || !organizationId || popularCandidateIds.length === 0,
    fetchPolicy: 'cache-and-network',
  });
  const visiblePopularById = useMemo(() => {
    const byId = new Map<string, T>();
    for (const record of [...(visiblePopularData?.firstWindow ?? []), ...(visiblePopularData?.secondWindow ?? [])]) {
      byId.set(record.id, record);
    }
    return byId;
  }, [visiblePopularData]);
  const popularIds = useMemo(
    () =>
      visiblePopularExerciseIds(
        popularCandidateIds,
        new Set([...seenById.keys(), ...visiblePopularById.keys()])
      ),
    [popularCandidateIds, seenById, visiblePopularById]
  );

  const knownRecords = useMemo(() => {
    const byId = new Map(visiblePopularById);
    for (const [exerciseId, record] of extraRecords) byId.set(exerciseId, record);
    for (const [exerciseId, fetched] of fetchedDetails) byId.set(exerciseId, fetched.record);
    return mergeKnownExercises([...seenById.values()], byId);
  }, [fetchedDetails, extraRecords, seenById, visiblePopularById]);
  const knownIds = useMemo(() => new Set(knownRecords.map((exercise) => exercise.id)), [knownRecords]);

  const enrichmentById = useMemo(() => {
    const merged = new Map<string, ExerciseEnrichmentData | null>();
    for (const [exerciseId, fetched] of fetchedDetails) {
      // An exercise edited since its enrichment was fetched is fetched again.
      const pageUpdatedAt = seenById.get(exerciseId)?.updatedAt;
      if (pageUpdatedAt === undefined || pageUpdatedAt === fetched.updatedAt) {
        merged.set(exerciseId, fetched.enrichmentData);
      }
    }
    for (const known of knownEnrichment ?? []) {
      if (known.enrichmentData !== undefined && !merged.has(known.id)) {
        merged.set(known.id, known.enrichmentData);
      }
    }
    return merged;
  }, [fetchedDetails, knownEnrichment, seenById]);

  const incompleteIds = useMemo(
    () =>
      [
        ...new Set([
          ...findMissingEnrichmentIds(detailExerciseIds, enrichmentById),
          ...detailExerciseIds.filter((exerciseId) => exerciseId && !knownIds.has(exerciseId)),
        ]),
      ],
    [detailExerciseIds, enrichmentById, knownIds]
  );
  const missingIds = useMemo(
    () => incompleteIds.filter((exerciseId) => !failedIds.has(exerciseId)),
    [incompleteIds, failedIds]
  );
  const missingKey = missingIds.join('|');

  // exerciseById does not return personal-scope exercises, which the library lists for their author;
  // such a chosen exercise comes from the library list narrowed to its id.
  const fetchVisibleDetails = useCallback(
    (exerciseId: string) =>
      apolloClient
        .query<VisibleRecordsResponse<DetailsRecord<T>>>({
          query: GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY,
          variables: { organizationId: organizationId ?? '', ids: [exerciseId], withEnrichment: true },
          fetchPolicy: 'network-only',
        })
        .then((result) => result.data?.firstWindow?.[0] ?? result.data?.secondWindow?.[0] ?? null),
    [apolloClient, organizationId]
  );

  const fetchDetails = useCallback(
    (exerciseId: string) =>
      apolloClient
        .query<ExerciseByIdResponse<T>>({
          query: GET_EXERCISE_PICKER_DETAILS_QUERY,
          variables: { id: exerciseId },
          fetchPolicy: 'network-only',
        })
        .then((result) => result.data?.exerciseById ?? (organizationId ? fetchVisibleDetails(exerciseId) : null))
        .catch(() => null),
    [apolloClient, fetchVisibleDetails, organizationId]
  );

  useEffect(() => {
    if (skip || missingIds.length === 0) return;
    let cancelled = false;
    void Promise.all(missingIds.map((exerciseId) => fetchDetails(exerciseId).then((exercise) => ({ exerciseId, exercise })))).then(
      (results) => {
        if (cancelled) return;
        const loaded = results.filter((result) => result.exercise);
        const failed = results.filter((result) => !result.exercise).map((result) => result.exerciseId);
        if (loaded.length > 0) {
          setFetchedDetails((previous) => {
            const next = new Map(previous);
            for (const result of loaded) {
              if (result.exercise) next.set(result.exerciseId, toFetchedDetails(result.exercise));
            }
            return next;
          });
        }
        if (failed.length > 0) {
          setFailedIds((previous) => new Set([...previous, ...failed]));
        }
      }
    );
    return () => {
      cancelled = true;
    };
    // missingKey carries missingIds; the array itself is a fresh reference on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDetails, missingKey, skip]);

  const missingRecordKey = [...new Set(recordExerciseIds ?? [])]
    .filter((exerciseId) => exerciseId && !knownIds.has(exerciseId) && !failedRecordIds.has(exerciseId))
    .join('|');

  useEffect(() => {
    if (skip || !missingRecordKey) return;
    let cancelled = false;
    const exerciseIds = missingRecordKey.split('|');
    void Promise.all(
      exerciseIds.map((exerciseId) =>
        apolloClient
          .query<ExerciseByIdResponse<T>>({ query: GET_EXERCISE_PICKER_RECORD_QUERY, variables: { id: exerciseId } })
          .then((result) => ({ exerciseId, exercise: result.data?.exerciseById ?? null }))
          .catch(() => ({ exerciseId, exercise: null }))
      )
    ).then((results) => {
      if (cancelled) return;
      setExtraRecords((previous) => {
        const next = new Map(previous);
        for (const result of results) {
          if (result.exercise) next.set(result.exerciseId, result.exercise);
        }
        return next;
      });
      const failed = results.filter((result) => !result.exercise).map((result) => result.exerciseId);
      if (failed.length > 0) setFailedRecordIds((previous) => new Set([...previous, ...failed]));
    });
    return () => {
      cancelled = true;
    };
  }, [apolloClient, missingRecordKey, skip]);

  /** Record and enrichment of one exercise straight from the API (e.g. just created); null when not available. */
  const loadExercise = useCallback(
    async (exerciseId: string): Promise<T | null> => {
      const exercise = await fetchDetails(exerciseId);
      if (!exercise) return null;
      const fetched = toFetchedDetails(exercise);
      setFetchedDetails((previous) => new Map(previous).set(exerciseId, fetched));
      return fetched.record;
    },
    [fetchDetails]
  );

  const retryDetails = useCallback(() => setFailedIds(new Set()), []);

  const exercises = useMemo(() => withLoadedEnrichment(knownRecords, enrichmentById), [knownRecords, enrichmentById]);

  const detailsFailed = useMemo(
    () => detailExerciseIds.some((exerciseId) => failedIds.has(exerciseId)),
    [detailExerciseIds, failedIds]
  );

  const detailsReady = incompleteIds.length === 0;

  /** Call before saving; false means wait (button shows pending) or the content failed to load (retried). */
  const ensureDetailsReady = useCallback((): boolean => {
    if (detailsReady) return true;
    if (detailsFailed) {
      retryDetails();
      toast.error('Nie udało się wczytać treści wybranych ćwiczeń. Ponawiamy, spróbuj zapisać za chwilę.');
    }
    return false;
  }, [detailsFailed, detailsReady, retryDetails]);

  const itemIds = useMemo(() => pages.items.map((exercise) => exercise.id), [pages.items]);
  const library: ExercisePickerLibraryView = {
    itemIds,
    popularIds,
    counts: pages.counts,
    loading: pages.loading,
    loadingMore: pages.loadingMore,
    remaining: pages.remaining,
    loadMore: pages.loadMore,
    search: searchInput,
    onSearchChange: setSearchInput,
    sourceFilter,
    onSourceFilterChange: setSourceFilter,
  };

  return {
    exercises,
    library,
    loading: pages.loading,
    error: pages.error,
    loadExercise,
    detailsReady,
    /** Content of chosen exercises is still loading; show the save button as pending. */
    detailsPending: !detailsReady && !detailsFailed,
    ensureDetailsReady,
  };
}
