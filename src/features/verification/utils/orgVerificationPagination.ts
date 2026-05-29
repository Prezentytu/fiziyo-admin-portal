export type OrganizationVerificationFilter = 'pending' | 'changes' | 'verified' | 'archived';
export type OrganizationVerificationViewMode = 'grid' | 'list';

export interface OrganizationVerificationListState {
  filter: OrganizationVerificationFilter;
  search: string;
  page: number;
  pageSize: number;
  view: OrganizationVerificationViewMode;
}

export function parseOrganizationVerificationFilter(value: string | null): OrganizationVerificationFilter {
  if (value === 'changes' || value === 'verified' || value === 'archived') {
    return value;
  }
  return 'pending';
}

export function parseOrganizationVerificationView(value: string | null): OrganizationVerificationViewMode {
  return value === 'list' ? 'list' : 'grid';
}

export function buildOrganizationVerificationSearchParams(state: OrganizationVerificationListState): URLSearchParams {
  const params = new URLSearchParams();
  params.set('filter', state.filter);
  if (state.search.trim()) {
    params.set('search', state.search.trim());
  }
  params.set('page', String(Math.max(state.page, 1)));
  params.set('pageSize', String(Math.min(Math.max(state.pageSize, 1), 100)));
  params.set('view', state.view);
  return params;
}

export function buildOrganizationVerificationListHref(state: OrganizationVerificationListState): string {
  return `/organization/verification?${buildOrganizationVerificationSearchParams(state).toString()}`;
}

export function buildOrganizationVerificationDetailHref(
  exerciseId: string,
  state: OrganizationVerificationListState
): string {
  return `/organization/verification/${exerciseId}?${buildOrganizationVerificationSearchParams(state).toString()}`;
}
