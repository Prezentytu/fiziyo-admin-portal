'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';

import { GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY } from '@/graphql/queries/exercises.queries';
import type { ExerciseSourceFilter } from '@/utils/exerciseSourceFilter';
import { EXERCISE_PICKER_PAGE_SIZE, flattenPickerPages, toPickerLibraryTab } from '@/utils/exercisePickerPages';

export interface ExercisePickerCounts {
  all: number;
  organization: number;
  fiziyo: number;
}

interface PickerPageResponse<T> {
  availableExercisesPage?: {
    items: T[];
    totalCount: number;
    page: number;
    hasNextPage: boolean;
    counts: ExercisePickerCounts;
  };
}

interface UseExercisePickerPagesOptions {
  organizationId: string | null | undefined;
  skip?: boolean;
  /** Already debounced and trimmed. */
  search: string;
  sourceFilter: ExerciseSourceFilter;
}

interface PagesState<T> {
  key: string;
  organizationId: string;
  page: number;
  pages: ReadonlyMap<number, readonly T[]>;
  hasNextPage: boolean;
  totalCount: number;
  counts: ExercisePickerCounts | null;
  /** Grows when an already loaded page came back changed (the library changed after a write). */
  refreshes: number;
}

function emptyState<T>(key: string, organizationId: string, counts: ExercisePickerCounts | null): PagesState<T> {
  return { key, organizationId, page: 1, pages: new Map(), hasNextPage: false, totalCount: 0, counts, refreshes: 0 };
}

/**
 * Picker library in server pages: search, source tab and order come from the API, like the library list.
 * "Show more" appends the next page; a new search, tab or organization starts again from page 1.
 * Apollo keeps each page as its own cache entry and refetches only the last asked one after a write,
 * so when that page comes back changed the earlier pages are asked again as well.
 */
export function useExercisePickerPages<T extends { id: string }>({
  organizationId,
  skip = false,
  search,
  sourceFilter,
}: UseExercisePickerPagesOptions) {
  const client = useApolloClient();
  const orgId = organizationId ?? '';
  const key = `${orgId}|${sourceFilter}|${search}`;
  const [state, setState] = useState<PagesState<T>>(() => emptyState<T>(key, orgId, null));

  let current = state;
  if (state.key !== key) {
    // Tab counts do not depend on the search or the tab, so they stay while the new first page loads.
    current = emptyState<T>(key, orgId, state.organizationId === orgId ? state.counts : null);
    setState(current);
  }

  const tab = toPickerLibraryTab(sourceFilter);
  const { data, loading, error, refetch } = useQuery<PickerPageResponse<T>>(GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY, {
    variables: {
      organizationId: orgId,
      tab,
      search: search || null,
      page: current.page,
      pageSize: EXERCISE_PICKER_PAGE_SIZE,
    },
    skip: skip || !orgId,
    fetchPolicy: 'cache-and-network',
  });

  const result = data?.availableExercisesPage;
  if (result && current.pages.get(result.page) !== result.items) {
    const isLastPage = result.page >= Math.max(0, ...current.pages.keys());
    current = {
      ...current,
      pages: new Map(current.pages).set(result.page, result.items),
      hasNextPage: isLastPage ? result.hasNextPage : current.hasNextPage,
      totalCount: result.totalCount,
      counts: result.counts,
      refreshes: current.pages.has(result.page) ? current.refreshes + 1 : current.refreshes,
    };
    setState(current);
  }

  const refreshes = current.refreshes;
  const activePage = current.page;
  const loadedPageNumbers = [...current.pages.keys()].sort((left, right) => left - right).join('|');
  useEffect(() => {
    if (refreshes === 0 || skip || !orgId) return;
    let cancelled = false;
    const stalePages = loadedPageNumbers.split('|').map(Number).filter((page) => page > 0 && page !== activePage);
    for (const page of stalePages) {
      void client
        .query<PickerPageResponse<T>>({
          query: GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY,
          variables: { organizationId: orgId, tab, search: search || null, page, pageSize: EXERCISE_PICKER_PAGE_SIZE },
          fetchPolicy: 'network-only',
        })
        .then((response) => {
          const refreshed = response.data?.availableExercisesPage;
          if (cancelled || !refreshed) return;
          setState((previous) =>
            previous.key === key && previous.pages.has(page) && previous.pages.get(page) !== refreshed.items
              ? { ...previous, pages: new Map(previous.pages).set(page, refreshed.items) }
              : previous
          );
        })
        // A failed refresh keeps the page as it was; the next search or write asks again.
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
    // Runs once per refresh of the active page; the loaded page numbers are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshes, key]);

  const loadedPages = current.pages;
  const items = useMemo(() => flattenPickerPages(loadedPages), [loadedPages]);
  const canLoadMore = current.hasNextPage && !loading;
  // The asked page is not loaded when its request failed; asking for the same page number again changes
  // nothing, so "show more" repeats the request instead.
  const failedPage = Boolean(error) && !loadedPages.has(current.page);
  const loadMore = useCallback(() => {
    if (!canLoadMore) return;
    if (failedPage) {
      void refetch().catch(() => undefined);
      return;
    }
    setState((previous) => ({ ...previous, page: Math.max(0, ...previous.pages.keys()) + 1 }));
  }, [canLoadMore, failedPage, refetch]);

  return {
    items,
    counts: current.counts,
    totalCount: current.totalCount,
    /** Exercises matching the search and tab that are not loaded yet. */
    remaining: Math.max(current.totalCount - items.length, 0),
    hasNextPage: current.hasNextPage,
    /** First page of this search or tab is loading (nothing to show yet). */
    loading: loading && items.length === 0,
    loadingMore: loading && items.length > 0,
    error,
    loadMore,
  };
}
