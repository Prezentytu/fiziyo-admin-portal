import { describe, expect, it } from 'vitest';
import { isNavigationHrefActive, matchesNavigationHref } from '../navigationActive';

describe('navigationActive helpers', () => {
  const navigationHrefs = ['/', '/organization', '/organization/verification', '/verification'];

  it('matches root only for exact slash pathname', () => {
    expect(matchesNavigationHref('/', '/')).toBe(true);
    expect(matchesNavigationHref('/organization', '/')).toBe(false);
  });

  it('prefers the longest matching href for nested organization verification path', () => {
    const pathname = '/organization/verification';

    expect(isNavigationHrefActive(pathname, '/organization', navigationHrefs)).toBe(false);
    expect(isNavigationHrefActive(pathname, '/organization/verification', navigationHrefs)).toBe(true);
  });

  it('keeps parent inactive for organization verification details route', () => {
    const pathname = '/organization/verification/exercise-1';

    expect(isNavigationHrefActive(pathname, '/organization', navigationHrefs)).toBe(false);
    expect(isNavigationHrefActive(pathname, '/organization/verification', navigationHrefs)).toBe(true);
  });
});
