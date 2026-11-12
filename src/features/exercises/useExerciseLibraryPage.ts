'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';

import {
  GET_AVAILABLE_EXERCISES_DEMO_PAGE_QUERY,
  GET_AVAILABLE_EXERCISES_PAGE_QUERY,
} from '@/graphql/queries/exercises.queries';
import type { AvailableExercisesPageResponse, ExerciseBodyRegion, ExerciseLibraryTab } from '@/types/apollo';

import { useDemoPoolWithIds } from './demoPool';
import { isSchemaValidationError } from '@/lib/graphql/isSchemaValidationError';
import { toExerciseAvailability, type ExerciseLibraryDemoFilter } from './utils/exerciseLibraryUrlState';

interface UseExerciseLibraryPageOptions {
  organizationId: string | null | undefined;
  tab: ExerciseLibraryTab;
  search: string | null;
  region: ExerciseBodyRegion | null;
  /** Filtr puli demo z adresu; działa tylko w gabinecie z pulą demo. */
  demo: ExerciseLibraryDemoFilter;
  page: number;
  pageSize: number;
}

/**
 * Jedna strona biblioteki. Bez puli demo (także na API sprzed fizjo-app#388) idzie to samo zapytanie co dotąd,
 * a filtr z adresu jest pomijany. Dokument z argumentem `availability` idzie dopiero, gdy API potwierdzi pulę demo
 * i terapeuta wybierze filtr; gdy API go odrzuci, biblioteka wraca do zwykłej listy i chowa filtr.
 */
export function useExerciseLibraryPage({
  organizationId,
  tab,
  search,
  region,
  demo,
  page,
  pageSize,
}: UseExerciseLibraryPageOptions) {
  const { enabled: demoPoolEnabled, demoExerciseIds } = useDemoPoolWithIds();
  const [demoFilterRejected, setDemoFilterRejected] = useState(false);
  const demoFilterAvailable = demoPoolEnabled && !demoFilterRejected;
  const demoFilter: ExerciseLibraryDemoFilter = demoFilterAvailable ? demo : 'all';
  const availability = toExerciseAvailability(demoFilter);

  const { data, previousData, loading, error } = useQuery<AvailableExercisesPageResponse>(
    availability ? GET_AVAILABLE_EXERCISES_DEMO_PAGE_QUERY : GET_AVAILABLE_EXERCISES_PAGE_QUERY,
    {
      variables: {
        organizationId,
        tab,
        search,
        region,
        ...(availability ? { availability } : {}),
        page,
        pageSize,
      },
      skip: !organizationId,
      fetchPolicy: 'cache-and-network',
    }
  );

  // Tylko odrzucenie dokumentu przez walidację schematu (backend bez pola) chowa filtr. Błąd przejściowy (sieć, 5xx)
  // zostaje błędem biblioteki, a filtr wraca przy następnym wejściu.
  const demoDocumentRejected = Boolean(error && availability && isSchemaValidationError(error));
  if (demoDocumentRejected && !demoFilterRejected) {
    setDemoFilterRejected(true);
  }

  return {
    data,
    previousData,
    loading,
    // The rejected demo document is replaced by the plain list in the next render; its error is not the library's.
    error: demoDocumentRejected ? undefined : error,
    demoFilter,
    demoFilterAvailable,
    demoExerciseIds,
  };
}
