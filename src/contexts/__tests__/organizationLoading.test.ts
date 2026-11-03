import { describe, expect, it } from 'vitest';
import { isOrganizationContextLoading } from '../OrganizationContext';

describe('isOrganizationContextLoading', () => {
  it('is loading while the query runs', () => {
    expect(isOrganizationContextLoading(true, 0, false)).toBe(true);
  });

  it('stays loading after the query until an organization is selected', () => {
    expect(isOrganizationContextLoading(false, 2, false)).toBe(true);
    expect(isOrganizationContextLoading(false, 2, true)).toBe(false);
  });

  it('is done when the user has no organizations', () => {
    expect(isOrganizationContextLoading(false, 0, false)).toBe(false);
  });
});
