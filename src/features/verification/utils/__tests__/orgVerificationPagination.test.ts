import { describe, expect, it } from 'vitest';

import {
  buildOrganizationVerificationDetailHref,
  buildOrganizationVerificationListHref,
  appendCrossOrgOrganizationIds,
  parseCrossOrgOrganizationIds,
  parseCrossOrgVerificationFilter,
  parseOrganizationVerificationFilter,
} from '@/features/verification/utils/orgVerificationPagination';

describe('orgVerificationPagination', () => {
  it('returns pending as default filter', () => {
    expect(parseOrganizationVerificationFilter(null)).toBe('pending');
    expect(parseOrganizationVerificationFilter('unknown')).toBe('pending');
  });

  it('only the all-clinics queue accepts the internal fixes filter', () => {
    expect(parseCrossOrgVerificationFilter('internal')).toBe('internal');
    expect(parseCrossOrgVerificationFilter('verified')).toBe('verified');
    expect(parseCrossOrgVerificationFilter('published')).toBe('pending');
    expect(parseCrossOrgVerificationFilter(null)).toBe('pending');
    expect(parseOrganizationVerificationFilter('internal')).toBe('pending');
  });

  it('reads selected organizations from the URL; empty means all', () => {
    expect(parseCrossOrgOrganizationIds(null)).toEqual([]);
    expect(parseCrossOrgOrganizationIds('')).toEqual([]);
    expect(parseCrossOrgOrganizationIds('org-1, org-2,,org-1')).toEqual(['org-1', 'org-2']);
  });

  it('writes the organizations param only when some are selected', () => {
    expect(appendCrossOrgOrganizationIds(new URLSearchParams(), []).has('orgs')).toBe(false);
    expect(appendCrossOrgOrganizationIds(new URLSearchParams(), ['org-1', 'org-2']).get('orgs')).toBe('org-1,org-2');
  });

  it('builds list href with pagination params', () => {
    const href = buildOrganizationVerificationListHref({
      filter: 'changes',
      search: 'kolano',
      page: 2,
      pageSize: 20,
      view: 'grid',
    });

    expect(href).toContain('/organization/verification?');
    expect(href).toContain('filter=changes');
    expect(href).toContain('search=kolano');
  });

  it('builds detail href for selected exercise', () => {
    const href = buildOrganizationVerificationDetailHref('exercise-1', {
      filter: 'verified',
      search: '',
      page: 1,
      pageSize: 30,
      view: 'list',
    });

    expect(href).toContain('/organization/verification/exercise-1?');
    expect(href).toContain('filter=verified');
  });
});
