import { describe, expect, it } from 'vitest';
import { getVerificationScopes, sumPendingCounts } from '../verificationScopes';

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

  it('names the organization queue after the current organization', () => {
    const [scope] = getVerificationScopes({ ...NO_ACCESS, canManageOrganization: true }, '  Fizjo Kraków ');

    expect(scope.label).toBe('Fizjo Kraków');
  });

  it('keeps the generic label without an organization name', () => {
    const [scope] = getVerificationScopes({ ...NO_ACCESS, canManageOrganization: true }, '');

    expect(scope.label).toBe('Moja organizacja');
  });

  it('separates the own queue from FiziYo moderation queues', () => {
    const scopes = getVerificationScopes({
      canManageOrganization: true,
      canReviewExercises: true,
      isSiteSuperAdmin: true,
    });

    expect(scopes.map((scope) => scope.group)).toEqual(['own', 'moderation', 'moderation']);
  });
});

describe('sumPendingCounts', () => {
  it('sums only the queues the user can open', () => {
    const scopes = getVerificationScopes({ ...NO_ACCESS, canManageOrganization: true, canReviewExercises: true });

    expect(sumPendingCounts(scopes, { organization: 1, global: 12, 'cross-org': 3 })).toBe(13);
  });

  it('treats a missing count as zero', () => {
    const scopes = getVerificationScopes({ ...NO_ACCESS, canManageOrganization: true });

    expect(sumPendingCounts(scopes, {})).toBe(0);
  });

  it('does not count the own organization twice when the cross-org queue already includes it', () => {
    const scopes = getVerificationScopes({
      canManageOrganization: true,
      canReviewExercises: true,
      isSiteSuperAdmin: true,
    });

    expect(sumPendingCounts(scopes, { organization: 1, global: 12, 'cross-org': 3 })).toBe(15);
  });
});
