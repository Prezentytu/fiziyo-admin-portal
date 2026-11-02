export type VerificationScopeKey = 'organization' | 'global' | 'cross-org';

export type VerificationScopeGroup = 'own' | 'moderation';

export interface VerificationScope {
  key: VerificationScopeKey;
  label: string;
  /** Who sees an exercise once it is approved in this queue. */
  audience: string;
  description: string;
  group: VerificationScopeGroup;
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
    audience: 'Widzi tylko Twój zespół',
    description:
      'Ćwiczenia dodane przez terapeutów Twojej organizacji. Po zatwierdzeniu przypisuje je tylko Twój zespół.',
    group: 'own',
    href: '/organization/verification',
    testId: 'nav-link-organization-verification',
    isAvailable: (access) => access.canManageOrganization,
  },
  {
    key: 'global',
    label: 'Katalog FiziYo',
    audience: 'Widzą wszystkie gabinety',
    description: 'Kandydaci do katalogu FiziYo. Opublikowane ćwiczenie widzą wszystkie gabinety.',
    group: 'moderation',
    href: '/verification',
    testId: 'nav-link-verification-global',
    isAvailable: (access) => access.canReviewExercises,
  },
  {
    key: 'cross-org',
    label: 'Organizacje klientów',
    audience: 'Widzi tylko dany klient',
    description:
      'Ćwiczenia czekające na zatwierdzenie w organizacjach klientów. Zostają w swojej organizacji i nie trafiają do katalogu FiziYo.',
    group: 'moderation',
    href: '/verification/organizations',
    testId: 'nav-link-verification-organizations',
    isAvailable: (access) => access.isSiteSuperAdmin,
  },
];

/** Verification queues the user can open, in navigation order. */
export function getVerificationScopes(
  access: VerificationScopeAccess,
  organizationName?: string | null
): VerificationScope[] {
  const ownLabel = organizationName?.trim();
  return VERIFICATION_SCOPES.filter((scope) => scope.isAvailable(access)).map(
    ({ key, label, audience, description, group, href, testId }) => ({
      key,
      label: key === 'organization' && ownLabel ? ownLabel : label,
      audience,
      description,
      group,
      href,
      testId,
    })
  );
}

export type VerificationPendingCounts = Partial<Record<VerificationScopeKey, number>>;

/** Pending items across the queues the user can open; drives the navigation badge. */
export function sumPendingCounts(scopes: ReadonlyArray<VerificationScope>, counts: VerificationPendingCounts): number {
  return scopes.reduce((total, scope) => total + (counts[scope.key] ?? 0), 0);
}
