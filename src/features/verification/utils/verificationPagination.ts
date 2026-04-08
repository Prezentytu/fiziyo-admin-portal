export type VerificationFilter = 'pending' | 'changes' | 'published' | 'archived' | 'reported';
export type VerificationViewMode = 'grid' | 'list';

export interface VerificationListState {
  filter: VerificationFilter;
  search: string;
  page: number;
  pageSize: number;
  view: VerificationViewMode;
}

export function parseVerificationFilter(value: string | null): VerificationFilter {
  if (value === 'changes' || value === 'published' || value === 'archived' || value === 'reported') {
    return value;
  }
  return 'pending';
}

export function parseVerificationView(value: string | null): VerificationViewMode {
  return value === 'list' ? 'list' : 'grid';
}

export function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

export function clampVerificationPageSize(value: number): number {
  return Math.min(Math.max(value, 1), 100);
}

export function buildVerificationSearchParams(state: VerificationListState): URLSearchParams {
  const params = new URLSearchParams();
  params.set('filter', state.filter);
  if (state.search.trim()) {
    params.set('search', state.search.trim());
  }
  params.set('page', String(Math.max(state.page, 1)));
  params.set('pageSize', String(clampVerificationPageSize(state.pageSize)));
  params.set('view', state.view);
  return params;
}

export function buildVerificationListHref(state: VerificationListState): string {
  return `/verification?${buildVerificationSearchParams(state).toString()}`;
}

export function buildVerificationDetailHref(exerciseId: string, state: VerificationListState): string {
  return `/verification/${exerciseId}?${buildVerificationSearchParams(state).toString()}`;
}
