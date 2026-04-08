import {
  buildVerificationDetailHref,
  buildVerificationListHref,
  buildVerificationSearchParams,
  clampVerificationPageSize,
  parsePositiveInt,
  parseVerificationFilter,
  parseVerificationView,
} from '../verificationPagination';

describe('verificationPagination helpers', () => {
  it('normalizes invalid filter to pending', () => {
    expect(parseVerificationFilter(null)).toBe('pending');
    expect(parseVerificationFilter('invalid')).toBe('pending');
    expect(parseVerificationFilter('changes')).toBe('changes');
  });

  it('normalizes view mode', () => {
    expect(parseVerificationView('list')).toBe('list');
    expect(parseVerificationView('grid')).toBe('grid');
    expect(parseVerificationView('unknown')).toBe('grid');
  });

  it('parses positive ints with fallback', () => {
    expect(parsePositiveInt('4', 1)).toBe(4);
    expect(parsePositiveInt('-1', 1)).toBe(1);
    expect(parsePositiveInt('abc', 2)).toBe(2);
  });

  it('clamps page size to supported range', () => {
    expect(clampVerificationPageSize(0)).toBe(1);
    expect(clampVerificationPageSize(20)).toBe(20);
    expect(clampVerificationPageSize(120)).toBe(100);
  });

  it('builds consistent query params for list and detail links', () => {
    const state = {
      filter: 'pending' as const,
      search: 'kolano',
      page: 2,
      pageSize: 30,
      view: 'list' as const,
    };

    const params = buildVerificationSearchParams(state);
    expect(params.get('filter')).toBe('pending');
    expect(params.get('search')).toBe('kolano');
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('30');
    expect(params.get('view')).toBe('list');

    expect(buildVerificationListHref(state)).toContain('/verification?');
    expect(buildVerificationDetailHref('exercise-1', state)).toContain('/verification/exercise-1?');
  });
});
