import { appendQueueOrderingParams, type VerificationQueueOrdering } from './queueOrdering';

export type OrganizationVerificationFilter = 'pending' | 'changes' | 'verified' | 'archived';
export type OrganizationVerificationViewMode = 'grid' | 'list';

export interface OrganizationVerificationListState {
  /** Sortowanie i zakres dat (T-0024); brak = domyślna kolejka. */
  ordering?: VerificationQueueOrdering;
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

/** Kolejka wszystkich gabinetów (zespół FiziYo) ma dodatkowo poprawki wewnętrzne; właściciel gabinetu ich nie widzi. */
export type CrossOrgVerificationFilter = OrganizationVerificationFilter | 'internal';

export function parseCrossOrgVerificationFilter(value: string | null): CrossOrgVerificationFilter {
  return value === 'internal' ? value : parseOrganizationVerificationFilter(value);
}

/** Parametr URL z wybranymi organizacjami w kolejce wszystkich gabinetów; brak = wszystkie. */
export const CROSS_ORG_ORGANIZATIONS_PARAM = 'orgs';

export function parseCrossOrgOrganizationIds(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .split(',')
        .map((organizationId) => organizationId.trim())
        .filter(Boolean)
    )
  );
}

export function appendCrossOrgOrganizationIds(
  params: URLSearchParams,
  organizationIds: readonly string[]
): URLSearchParams {
  if (organizationIds.length > 0) {
    params.set(CROSS_ORG_ORGANIZATIONS_PARAM, organizationIds.join(','));
  }
  return params;
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
  return appendQueueOrderingParams(params, state.ordering);
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
