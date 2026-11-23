import type { ExerciseAvailability, ExerciseLibraryReviewStatus, ExerciseLibraryTab } from '@/types/apollo';

import { findExerciseBodyRegion } from './exerciseBodyRegions';

export type ExerciseLibraryFilter = 'all' | 'organization' | 'fiziyo' | 'needsChanges';

/** Pula demo: wszystkie ćwiczenia, bez demo albo tylko demo. */
export type ExerciseLibraryDemoFilter = 'all' | 'hide' | 'only';

/** Status weryfikacji w „Moje ćwiczenia”: wszystkie, czekające na weryfikację albo zatwierdzone. */
export type ExerciseLibraryStatusFilter = 'all' | 'pending' | 'approved';

export interface ExerciseLibraryUrlState {
  readonly filter: ExerciseLibraryFilter;
  readonly search: string;
  /** Body region slug from `EXERCISE_BODY_REGIONS`, or null for every region. */
  readonly region: string | null;
  readonly demo: ExerciseLibraryDemoFilter;
  /** Działa tylko w zakładce „Moje ćwiczenia”. */
  readonly status: ExerciseLibraryStatusFilter;
  readonly page: number;
  readonly pageSize: number;
}

export const EXERCISE_LIBRARY_PAGE_SIZES = [24, 48, 96] as const;
export const DEFAULT_EXERCISE_LIBRARY_PAGE_SIZE = EXERCISE_LIBRARY_PAGE_SIZES[0];

const TAB_BY_FILTER: Record<ExerciseLibraryFilter, ExerciseLibraryTab> = {
  all: 'ALL',
  organization: 'ORGANIZATION',
  fiziyo: 'FIZIYO',
  needsChanges: 'NEEDS_CHANGES',
};

export function toExerciseLibraryTab(filter: ExerciseLibraryFilter): ExerciseLibraryTab {
  return TAB_BY_FILTER[filter];
}

const AVAILABILITY_BY_DEMO_FILTER: Record<ExerciseLibraryDemoFilter, ExerciseAvailability | null> = {
  all: null,
  hide: 'STANDARD',
  only: 'DEMO',
};

/** null = bez zawężenia: API zwraca wszystko, co gabinet widzi (demo tylko z dostępem do puli). */
export function toExerciseAvailability(demo: ExerciseLibraryDemoFilter): ExerciseAvailability | null {
  return AVAILABILITY_BY_DEMO_FILTER[demo];
}

const REVIEW_STATUS_BY_STATUS_FILTER: Record<ExerciseLibraryStatusFilter, ExerciseLibraryReviewStatus | null> = {
  all: null,
  pending: 'PENDING',
  approved: 'APPROVED',
};

/** null = bez zawężenia. Poza zakładką „Moje ćwiczenia” filtr z adresu jest pomijany. */
export function toExerciseLibraryReviewStatus(
  filter: ExerciseLibraryFilter,
  status: ExerciseLibraryStatusFilter
): ExerciseLibraryReviewStatus | null {
  return filter === 'organization' ? REVIEW_STATUS_BY_STATUS_FILTER[status] : null;
}

export function parseExerciseLibraryUrlState(params: Pick<URLSearchParams, 'get'>): ExerciseLibraryUrlState {
  const filter = params.get('filter');
  const demo = params.get('demo');
  const status = params.get('status');
  const pageSize = Number(params.get('pageSize'));
  const page = Number(params.get('page'));

  return {
    filter: filter && Object.hasOwn(TAB_BY_FILTER, filter) ? (filter as ExerciseLibraryFilter) : 'all',
    search: params.get('q')?.trim() ?? '',
    region: findExerciseBodyRegion(params.get('region'))?.id ?? null,
    demo: demo && demo !== 'all' && Object.hasOwn(AVAILABILITY_BY_DEMO_FILTER, demo) ? (demo as ExerciseLibraryDemoFilter) : 'all',
    status: status && Object.hasOwn(REVIEW_STATUS_BY_STATUS_FILTER, status) ? (status as ExerciseLibraryStatusFilter) : 'all',
    page: Number.isInteger(page) && page > 1 ? page : 1,
    pageSize: (EXERCISE_LIBRARY_PAGE_SIZES as readonly number[]).includes(pageSize)
      ? pageSize
      : DEFAULT_EXERCISE_LIBRARY_PAGE_SIZE,
  };
}

/** Defaults stay out of the URL, so a plain /exercises link keeps meaning "first page of everything". */
export function buildExerciseLibraryQueryString(state: ExerciseLibraryUrlState): string {
  const params = new URLSearchParams();
  if (state.filter !== 'all') params.set('filter', state.filter);
  if (state.search.trim()) params.set('q', state.search.trim());
  if (state.region) params.set('region', state.region);
  if (state.demo !== 'all') params.set('demo', state.demo);
  if (state.filter === 'organization' && state.status !== 'all') params.set('status', state.status);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.pageSize !== DEFAULT_EXERCISE_LIBRARY_PAGE_SIZE) params.set('pageSize', String(state.pageSize));
  return params.toString();
}
