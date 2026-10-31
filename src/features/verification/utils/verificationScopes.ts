export type VerificationScopeKey = 'organization' | 'global' | 'cross-org';

export interface VerificationScope {
  key: VerificationScopeKey;
  label: string;
  href: string;
  testId: string;
}

export interface VerificationScopeAccess {
  canManageOrganization: boolean;
  canReviewExercises: boolean;
  isSiteSuperAdmin: boolean;
}

const VERIFICATION_SCOPES: ReadonlyArray<
  VerificationScope & { isAvailable: (access: VerificationScopeAccess) => boolean }
> = [
  {
    key: 'organization',
    label: 'Moja organizacja',
    href: '/organization/verification',
    testId: 'nav-link-organization-verification',
    isAvailable: (access) => access.canManageOrganization,
  },
  {
    key: 'global',
    label: 'Katalog FiziYo',
    href: '/verification',
    testId: 'nav-link-verification-global',
    isAvailable: (access) => access.canReviewExercises,
  },
  {
    key: 'cross-org',
    label: 'Organizacje klientów',
    href: '/verification/organizations',
    testId: 'nav-link-verification-organizations',
    isAvailable: (access) => access.isSiteSuperAdmin,
  },
];

/** Verification queues the user can open, in navigation order. */
export function getVerificationScopes(access: VerificationScopeAccess): VerificationScope[] {
  return VERIFICATION_SCOPES.filter((scope) => scope.isAvailable(access)).map(({ key, label, href, testId }) => ({
    key,
    label,
    href,
    testId,
  }));
}
