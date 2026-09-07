import { describe, expect, it } from 'vitest';
import { computeRoleAccess } from '@/hooks/roleAccess';
import { computeSystemRoleFlags, normalizeSystemRole } from '@/hooks/systemRole';

describe('computeRoleAccess', () => {
  it('grants org management to owner and admin only', () => {
    expect(computeRoleAccess('Owner', false).canManageOrganization).toBe(true);
    expect(computeRoleAccess('admin', false).canViewBilling).toBe(true);
    expect(computeRoleAccess('therapist', false).canManageTeam).toBe(false);
  });
});

describe('system role helpers', () => {
  it('normalizes backend enum values', () => {
    expect(normalizeSystemRole('CONTENT_MANAGER')).toBe('ContentManager');
    expect(normalizeSystemRole('SiteSuperAdmin')).toBe('SiteSuperAdmin');
    expect(normalizeSystemRole('unknown')).toBeNull();
  });

  it('maps review permissions', () => {
    const flags = computeSystemRoleFlags('ContentManager', false);
    expect(flags.canReviewExercises).toBe(true);
    expect(flags.isSiteSuperAdmin).toBe(false);
  });
});
