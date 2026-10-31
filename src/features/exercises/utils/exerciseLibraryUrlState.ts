import type { ExerciseLibraryTab } from '@/types/apollo';

export type ExerciseLibraryFilter = 'all' | 'organization' | 'fiziyo' | 'needsChanges';

export interface ExerciseLibraryUrlState {
  readonly filter: ExerciseLibraryFilter;
  readonly search: string;
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

export function parseExerciseLibraryUrlState(params: Pick<URLSearchParams, 'get'>): ExerciseLibraryUrlState {
  const filter = params.get('filter');
  const pageSize = Number(params.get('pageSize'));
  const page = Number(params.get('page'));

  return {
    filter: filter && Object.hasOwn(TAB_BY_FILTER, filter) ? (filter as ExerciseLibraryFilter) : 'all',
    search: params.get('q')?.trim() ?? '',
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
  if (state.page > 1) params.set('page', String(state.page));
  if (state.pageSize !== DEFAULT_EXERCISE_LIBRARY_PAGE_SIZE) params.set('pageSize', String(state.pageSize));
  return params.toString();
}
