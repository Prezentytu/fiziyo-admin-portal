'use client';

import { useMemo } from 'react';

import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useOrganizationVerificationAccess } from '@/hooks/useOrganizationVerificationAccess';
import { useVerificationScopes } from '@/features/verification/useVerificationScopes';
import { buildAccountNavigationItems, buildNavigationItems, type NavigationItem } from './navigationConfig';

/** Role-filtered sidebar items shared by the desktop and mobile sidebars. */
export function useNavigationItems(): { items: NavigationItem[]; matchHrefs: string[] } {
  const verificationScopes = useVerificationScopes();
  const { pendingCount } = useOrganizationVerificationAccess();

  return useMemo(() => {
    const items = buildNavigationItems({ verificationScopes, verificationPendingCount: pendingCount });
    return { items, matchHrefs: items.flatMap((item) => item.matchHrefs) };
  }, [verificationScopes, pendingCount]);
}

/** Organization admin links for the account menu (desktop footer and mobile sheet). */
export function useAccountNavigationItems(): NavigationItem[] {
  const { canManageOrganization } = useRoleAccess();

  return useMemo(() => buildAccountNavigationItems(canManageOrganization), [canManageOrganization]);
}
