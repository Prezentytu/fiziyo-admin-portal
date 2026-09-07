import {
  LayoutGrid,
  Dumbbell,
  FolderKanban,
  Users,
  Building2,
  Wallet,
  Settings,
  FileText,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItemConfig {
  name: string;
  href: string;
  icon: LucideIcon;
  testId: string;
  mobileTestId: string;
  hasAiAccent?: boolean;
  siteSuperAdminOnly?: boolean;
  badge?: number | null;
}

export interface NavigationGroupConfig {
  id: string;
  label: string;
  items: NavigationItemConfig[];
  adminOnly?: boolean;
  contentManagerOnly?: boolean;
}

export const navigationGroups: NavigationGroupConfig[] = [
  {
    id: 'clinic',
    label: 'Klinika',
    items: [
      {
        name: 'Panel',
        href: '/',
        icon: LayoutGrid,
        testId: 'nav-link-dashboard',
        mobileTestId: 'nav-mobile-link-dashboard',
      },
      {
        name: 'Pacjenci',
        href: '/patients',
        icon: Users,
        testId: 'nav-link-patients',
        mobileTestId: 'nav-mobile-link-patients',
      },
      {
        name: 'Zestawy',
        href: '/exercise-sets',
        icon: FolderKanban,
        testId: 'nav-link-exercise-sets',
        mobileTestId: 'nav-mobile-link-exercise-sets',
      },
      {
        name: 'Ćwiczenia',
        href: '/exercises',
        icon: Dumbbell,
        testId: 'nav-link-exercises',
        mobileTestId: 'nav-mobile-link-exercises',
      },
    ],
  },
  {
    id: 'ai-tools',
    label: 'Narzędzia AI',
    items: [
      {
        name: 'Import Dokumentów',
        href: '/import',
        icon: FileText,
        testId: 'nav-link-import',
        mobileTestId: 'nav-mobile-link-import',
        hasAiAccent: true,
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organizacja',
    adminOnly: true,
    items: [
      {
        name: 'Organizacja',
        href: '/organization',
        icon: Building2,
        testId: 'nav-link-organization',
        mobileTestId: 'nav-mobile-link-organization',
      },
      {
        name: 'Weryfikacja',
        href: '/organization/verification',
        icon: ShieldCheck,
        testId: 'nav-link-organization-verification',
        mobileTestId: 'nav-mobile-link-organization-verification',
      },
      {
        name: 'Finanse',
        href: '/finances',
        icon: Wallet,
        testId: 'nav-link-finances',
        mobileTestId: 'nav-mobile-link-finances',
      },
      {
        name: 'Ustawienia',
        href: '/settings',
        icon: Settings,
        testId: 'nav-link-settings',
        mobileTestId: 'nav-mobile-link-settings',
      },
    ],
  },
  {
    id: 'verification',
    label: 'Weryfikacja',
    contentManagerOnly: true,
    items: [
      {
        name: 'Centrum Weryfikacji',
        href: '/verification',
        icon: ShieldCheck,
        testId: 'nav-link-verification',
        mobileTestId: 'nav-mobile-link-verification',
      },
      {
        name: 'Weryfikacja Organizacji',
        href: '/verification/organizations',
        icon: ShieldCheck,
        testId: 'nav-link-verification-organizations',
        mobileTestId: 'nav-mobile-link-verification-organizations',
        siteSuperAdminOnly: true,
      },
    ],
  },
];

export const routeNames: Record<string, string> = {
  '': 'Panel',
  exercises: 'Ćwiczenia',
  'exercise-sets': 'Zestawy',
  patients: 'Pacjenci',
  finances: 'Finanse',
  payouts: 'Wypłaty',
  invoices: 'Faktury',
  organization: 'Organizacja',
  organizations: 'Organizacje',
  settings: 'Ustawienia',
  tags: 'Tagi',
  import: 'Import Dokumentów',
  verification: 'Weryfikacja',
  onboarding: 'Onboarding',
};

export function getRouteLabel(segment: string): string {
  return routeNames[segment] ?? segment;
}

export function filterNavigationGroups(
  groups: NavigationGroupConfig[],
  access: {
    canManageOrganization: boolean;
    canReviewExercises: boolean;
    isSiteSuperAdmin: boolean;
  }
): NavigationGroupConfig[] {
  return groups
    .filter((group) => {
      if (group.contentManagerOnly) {
        return access.canReviewExercises;
      }
      if (group.adminOnly) {
        return access.canManageOrganization;
      }
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.siteSuperAdminOnly || access.isSiteSuperAdmin),
    }));
}
