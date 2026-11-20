'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';

import {
  GET_AVAILABLE_EXERCISES_DEMO_PAGE_QUERY,
  GET_AVAILABLE_EXERCISES_PAGE_QUERY,
  GET_AVAILABLE_EXERCISES_REVIEW_PAGE_QUERY,
} from '@/graphql/queries/exercises.queries';
import type {
  AvailableExercisesPageResponse,
  ExerciseBodyRegion,
  ExerciseLibraryReviewStatus,
  ExerciseLibraryTab,
} from '@/types/apollo';

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
  /** Status weryfikacji („Do weryfikacji” / „Zatwierdzone”); null albo brak = bez zawężenia. */
  reviewStatus?: ExerciseLibraryReviewStatus | null;
  page: number;
  pageSize: number;
}

/**
 * Jedna strona biblioteki. Bez puli demo (także na API sprzed fizjo-app#388) idzie to samo zapytanie co dotąd,
 * a filtr z adresu jest pomijany. Dokument z argumentem `availability` idzie dopiero, gdy API potwierdzi pulę demo
 * i terapeuta wybierze filtr; gdy API go odrzuci, biblioteka wraca do zwykłej listy i chowa filtr.
 * Tak samo status weryfikacji: dokument z `reviewStatus` idzie tylko po wybraniu filtra, a odrzucony chowa filtr.
 */
export function useExerciseLibraryPage({
  organizationId,
  tab,
  search,
  region,
  demo,
  reviewStatus = null,
  page,
  pageSize,
}: UseExerciseLibraryPageOptions) {
  const { enabled: demoPoolEnabled, demoExerciseIds } = useDemoPoolWithIds();
  const [demoFilterRejected, setDemoFilterRejected] = useState(false);
  const demoFilterAvailable = demoPoolEnabled && !demoFilterRejected;
  const demoFilter: ExerciseLibraryDemoFilter = demoFilterAvailable ? demo : 'all';
  const availability = toExerciseAvailability(demoFilter);
  const [reviewFilterRejected, setReviewFilterRejected] = useState(false);
  const reviewFilterAvailable = !reviewFilterRejected;
  const activeReviewStatus = reviewFilterAvailable ? reviewStatus : null;

  const { data, previousData, loading, error } = useQuery<AvailableExercisesPageResponse>(
    activeReviewStatus
      ? GET_AVAILABLE_EXERCISES_REVIEW_PAGE_QUERY
      : availability
        ? GET_AVAILABLE_EXERCISES_DEMO_PAGE_QUERY
        : GET_AVAILABLE_EXERCISES_PAGE_QUERY,
    {
      variables: {
        organizationId,
        tab,
        search,
        region,
        ...(availability || activeReviewStatus ? { availability } : {}),
        ...(activeReviewStatus ? { reviewStatus: activeReviewStatus } : {}),
        page,
        pageSize,
      },
      skip: !organizationId,
      fetchPolicy: 'cache-and-network',
    }
  );

  // Tylko odrzucenie dokumentu przez walidację schematu (backend bez pola) chowa filtr. Błąd przejściowy (sieć, 5xx)
  // zostaje błędem biblioteki, a filtr wraca przy następnym wejściu.
  // Odrzucony dokument ze statusem weryfikacji chowa tylko ten filtr; filtr demo sprawdzi się w następnym zapytaniu.
  const schemaRejected = Boolean(error && isSchemaValidationError(error));
  const reviewDocumentRejected = schemaRejected && Boolean(activeReviewStatus);
  if (reviewDocumentRejected && !reviewFilterRejected) {
    setReviewFilterRejected(true);
  }
  const demoDocumentRejected = schemaRejected && !activeReviewStatus && Boolean(availability);
  if (demoDocumentRejected && !demoFilterRejected) {
    setDemoFilterRejected(true);
  }

  return {
    data,
    previousData,
    loading,
    // The rejected demo document is replaced by the plain list in the next render; its error is not the library's.
    error: demoDocumentRejected || reviewDocumentRejected ? undefined : error,
    demoFilter,
    demoFilterAvailable,
    reviewFilterAvailable,
    demoExerciseIds,
  };
}
