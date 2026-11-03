import {
  Building2,
  Dumbbell,
  FileText,
  FolderKanban,
  LayoutGrid,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import type { VerificationScope } from '@/features/verification/utils/verificationScopes';

export interface NavigationItem {
  name: string;
  href: string;
  /** Paths that keep this item active; the first is `href`. */
  matchHrefs: string[];
  icon: LucideIcon;
  testId: string;
  mobileTestId: string;
  badge?: number;
  hasAiAccent?: boolean;
}

interface NavigationAccess {
  verificationScopes: VerificationScope[];
  verificationPendingCount: number;
}

function navigationItem(item: Omit<NavigationItem, 'matchHrefs'>): NavigationItem {
  return { ...item, matchHrefs: [item.href] };
}

/** Verification entry for any navigation surface; callers render it only when `scopes` is non-empty. */
export function verificationItem(scopes: VerificationScope[], pendingCount: number): NavigationItem {
  return {
    name: 'Weryfikacja',
    href: scopes[0].href,
    matchHrefs: scopes.map((scope) => scope.href),
    icon: ShieldCheck,
    testId: 'nav-link-verification',
    mobileTestId: 'nav-mobile-link-verification',
    badge: pendingCount,
  };
}

/** Daily clinical work; everything else lives in the account menu. */
export function buildNavigationItems({
  verificationScopes,
  verificationPendingCount,
}: NavigationAccess): NavigationItem[] {
  const items = [
    navigationItem({
      name: 'Panel',
      href: '/',
      icon: LayoutGrid,
      testId: 'nav-link-dashboard',
      mobileTestId: 'nav-mobile-link-dashboard',
    }),
    navigationItem({
      name: 'Pacjenci',
      href: '/patients',
      icon: Users,
      testId: 'nav-link-patients',
      mobileTestId: 'nav-mobile-link-patients',
    }),
    navigationItem({
      name: 'Zestawy',
      href: '/exercise-sets',
      icon: FolderKanban,
      testId: 'nav-link-exercise-sets',
      mobileTestId: 'nav-mobile-link-exercise-sets',
    }),
    navigationItem({
      name: 'Ćwiczenia',
      href: '/exercises',
      icon: Dumbbell,
      testId: 'nav-link-exercises',
      mobileTestId: 'nav-mobile-link-exercises',
    }),
  ];

  if (verificationScopes.length > 0) {
    items.push(verificationItem(verificationScopes, verificationPendingCount));
  }

  items.push(
    navigationItem({
      name: 'Import dokumentów',
      href: '/import',
      icon: FileText,
      testId: 'nav-link-import',
      mobileTestId: 'nav-mobile-link-import',
      hasAiAccent: true,
    })
  );

  return items;
}

/** Organization admin pages shown in the account menu, above account settings. */
export function buildAccountNavigationItems(canManageOrganization: boolean): NavigationItem[] {
  if (!canManageOrganization) {
    return [];
  }

  return [
    navigationItem({
      name: 'Zespół',
      href: '/organization',
      icon: Building2,
      testId: 'nav-link-organization',
      mobileTestId: 'nav-mobile-link-organization',
    }),
    navigationItem({
      name: 'Finanse',
      href: '/finances',
      icon: Wallet,
      testId: 'nav-link-finances',
      mobileTestId: 'nav-mobile-link-billing',
    }),
  ];
}
