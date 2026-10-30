import { describe, expect, it } from 'vitest';
import { getVerificationScopes } from '../verificationScopes';

const NO_ACCESS = { canManageOrganization: false, canReviewExercises: false, isSiteSuperAdmin: false };

describe('getVerificationScopes', () => {
  it('returns no scopes for a therapist without review rights', () => {
    expect(getVerificationScopes(NO_ACCESS)).toEqual([]);
  });

  it('gives an organization admin only the organization queue', () => {
    const scopes = getVerificationScopes({ ...NO_ACCESS, canManageOrganization: true });

    expect(scopes.map((scope) => scope.href)).toEqual(['/organization/verification']);
  });

  it('gives a content manager only the global catalog queue', () => {
    const scopes = getVerificationScopes({ ...NO_ACCESS, canReviewExercises: true });

    expect(scopes.map((scope) => scope.key)).toEqual(['global']);
  });

  it('orders all three queues for a super admin who also manages an organization', () => {
    const scopes = getVerificationScopes({
      canManageOrganization: true,
      canReviewExercises: true,
      isSiteSuperAdmin: true,
    });

    expect(scopes.map((scope) => scope.key)).toEqual(['organization', 'global', 'cross-org']);
  });
});
