import { describe, expect, it } from 'vitest';

import {
  buildOrganizationVerificationDetailHref,
  buildOrganizationVerificationListHref,
  parseOrganizationVerificationFilter,
} from '@/features/verification/utils/orgVerificationPagination';

describe('orgVerificationPagination', () => {
  it('returns pending as default filter', () => {
    expect(parseOrganizationVerificationFilter(null)).toBe('pending');
    expect(parseOrganizationVerificationFilter('unknown')).toBe('pending');
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
