import { afterEach, describe, expect, it } from 'vitest';
import { LAST_ORG_KEY, getLastOrganizationId, setLastOrganizationId } from '../organizationStorage';

describe('organizationStorage', () => {
  afterEach(() => {
    localStorage.removeItem(LAST_ORG_KEY);
  });

  it('returns null when no organization is stored', () => {
    expect(getLastOrganizationId()).toBeNull();
  });

  it('persists and reads last organization id', () => {
    setLastOrganizationId('org-123');
    expect(getLastOrganizationId()).toBe('org-123');
    expect(localStorage.getItem(LAST_ORG_KEY)).toBe('org-123');
  });
});
