'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Dumbbell,
  FolderKanban,
  Users,
  Building2,
  Wallet,
  Settings,
  PanelLeftClose,
  PanelLeft,
  FileText,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { UserProfileFooter } from './UserProfileFooter';
import { NAV_ITEM_ACTIVE, NAV_ITEM_BASE, NAV_ITEM_INACTIVE } from './navigationItemStyles';
import { isNavigationHrefActive } from './navigationActive';
import { Logo } from '@/components/shared/Logo';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useSystemRole } from '@/hooks/useSystemRole';
import { useOrganizationVerificationAccess } from '@/hooks/useOrganizationVerificationAccess';
import { NavCountBadge } from '@/components/layout/NavCountBadge';

// ========================================
// Types
// ========================================

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  testId: string;
  /** Optional badge indicator (e.g., notifications count) */
  badge?: number | null;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
  /** If true, this group is only visible to owners and admins */
  adminOnly?: boolean;
  /** If true, this group is only visible to ContentManager or SiteSuperAdmin (system roles) */
  contentManagerOnly?: boolean;
}

// ========================================
// Navigation Configuration - 3 Zones
// ========================================

const navigationGroups: NavigationGroup[] = [
  // STREFA 1: KLINIKA (Codzienna praca - 90% czasu)
  {
    label: 'Klinika',
    items: [
      { name: 'Panel', href: '/', icon: LayoutGrid, testId: 'nav-link-dashboard' },
      { name: 'Pacjenci', href: '/patients', icon: Users, testId: 'nav-link-patients' },
      { name: 'Zestawy', href: '/exercise-sets', icon: FolderKanban, testId: 'nav-link-exercise-sets' },
      { name: 'Ćwiczenia', href: '/exercises', icon: Dumbbell, testId: 'nav-link-exercises' },
    ],
  },
  // STREFA 2: SMART TOOLS (AI & Import)
  {
    label: 'Narzędzia AI',
    items: [
      {
        name: 'Import dokumentów',
        href: '/import',
        icon: FileText,
        testId: 'nav-link-import',
      },
    ],
  },
  // STREFA 3: ORGANIZACJA (Admin - rzadziej używane)
  {
    label: 'Organizacja',
    adminOnly: true,
    items: [
      { name: 'Zespół', href: '/organization', icon: Building2, testId: 'nav-link-organization' },
      {
        name: 'Weryfikacja',
        href: '/organization/verification',
        icon: ShieldCheck,
        testId: 'nav-link-organization-verification',
      },
      { name: 'Finanse', href: '/finances', icon: Wallet, testId: 'nav-link-finances' },
      { name: 'Ustawienia', href: '/settings', icon: Settings, testId: 'nav-link-settings' },
    ],
  },
  // STREFA 4: WERYFIKACJA (ContentManager / SiteSuperAdmin - globalne)
  {
    label: 'Weryfikacja',
    contentManagerOnly: true,
    items: [
      {
        name: 'Weryfikacja ćwiczeń',
        href: '/verification',
        icon: ShieldCheck,
        testId: 'nav-link-verification',
      },
      {
        name: 'Weryfikacja organizacji',
        href: '/verification/organizations',
        icon: ShieldCheck,
        testId: 'nav-link-verification-organizations',
      },
    ],
  },
];

interface SidebarProps {
  readonly isCollapsed: boolean;
  readonly onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { canManageOrganization } = useRoleAccess();
  const { canReviewExercises, isSiteSuperAdmin } = useSystemRole();
  const { pendingCount: organizationPendingVerificationCount } = useOrganizationVerificationAccess();
  const navigationRef = useRef<HTMLElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  // Filter navigation groups based on user role
  const filteredNavigationGroups = useMemo(() => {
    return navigationGroups
      .filter((group) => {
      // ContentManager-only groups (system role)
        if (group.contentManagerOnly) {
          return canReviewExercises;
        }
        // Admin-only groups (organization role)
        if (group.adminOnly) {
          return canManageOrganization;
        }
        return true;
      })
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => item.href !== '/verification/organizations' || isSiteSuperAdmin)
          .map((item) =>
            item.href === '/organization/verification'
              ? {
                  ...item,
                  badge: organizationPendingVerificationCount,
                }
              : item
          ),
      }));
  }, [canManageOrganization, canReviewExercises, isSiteSuperAdmin, organizationPendingVerificationCount]);
  const filteredNavigationHrefs = useMemo(
    () => filteredNavigationGroups.flatMap((group) => group.items.map((item) => item.href)),
    [filteredNavigationGroups]
  );

  useEffect(() => {
    const navElement = navigationRef.current;
    if (!navElement) {
      return;
    }

    const updateScrollIndicators = () => {
      const { scrollTop, scrollHeight, clientHeight } = navElement;
      const canScroll = scrollHeight > clientHeight + 1;

      if (!canScroll) {
        setShowTopFade(false);
        setShowBottomFade(false);
        return;
      }

      setShowTopFade(scrollTop > 2);
      setShowBottomFade(scrollTop + clientHeight < scrollHeight - 2);
    };

    updateScrollIndicators();
    navElement.addEventListener('scroll', updateScrollIndicators, { passive: true });
    window.addEventListener('resize', updateScrollIndicators);

    return () => {
      navElement.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [filteredNavigationGroups.length, isCollapsed]);

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        data-testid="nav-sidebar"
        className={cn(
          'hidden xl:flex h-full flex-col bg-grouped transition-[width] duration-300 ease-in-out',
          isCollapsed ? 'w-[72px]' : 'w-[248px]'
        )}
      >
        {/* Header with logo and toggle - h-16 = ta sama wysokość co Header, wyrównanie „FiziYo” z „Zgłoś uwagę” */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center transition-all duration-300',
            isCollapsed ? 'justify-center px-3' : 'justify-start px-5'
          )}
        >
          <Logo variant={isCollapsed ? 'icon' : 'default'} size="sm" asLink href="/" />

          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              data-testid="nav-collapse-btn"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-label-secondary hover:bg-fill-quaternary hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Zwiń menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex shrink-0 justify-center py-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              data-testid="nav-expand-btn"
              className="flex h-8 w-8 items-center justify-center rounded-full text-label-secondary hover:bg-fill-quaternary hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Rozwiń menu"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Organization Switcher – mały pt, żeby „AW Fizjoterapia” było w jednej linii z „Dzień dobry” */}
        <div className="shrink-0">
          <OrganizationSwitcher isCollapsed={isCollapsed} />
        </div>

        {/* Navigation groups – większy pt, żeby dół zaznaczenia „Panel” był na tej samej wysokości co dół przycisku „Personalizuj i przypisz” */}
        <div className="relative flex-1 min-h-0">
          {showTopFade && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-grouped to-transparent" />
          )}
          <nav
            ref={navigationRef}
            className="h-full overflow-y-auto pt-4 pb-3"
          >
            {filteredNavigationGroups.map((group, groupIndex) => (
              <div key={group.label} className={cn(groupIndex > 0 && 'mt-5')}>
                {/* Group label */}
                {!isCollapsed && (
                  <p className="px-[22px] pb-1.5 text-[12px] font-semibold text-label-secondary">
                    {group.label}
                  </p>
                )}
                {isCollapsed && groupIndex > 0 && <div className="mx-4 mb-2 border-t border-separator" />}

                {/* Navigation items */}
                <div className={cn('space-y-px', isCollapsed ? 'flex flex-col items-center gap-1' : 'px-3')}>
                  {group.items.map((item) => {
                    const active = isNavigationHrefActive(pathname, item.href, filteredNavigationHrefs);
                    const Icon = item.icon;

                    const linkContent = (
                      <Link
                        href={item.href}
                        data-testid={item.testId}
                        className={cn(
                          NAV_ITEM_BASE,
                          isCollapsed
                            ? 'h-10 w-10 justify-center'
                            : 'h-9 gap-2.5 px-2.5',
                          active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE
                        )}
                      >
                        <div className="relative">
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0',
                              active ? 'nav-icon' : 'text-label-secondary group-hover:text-foreground'
                            )}
                          />
                        </div>

                        {!isCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.name}</span>

                            <NavCountBadge count={item.badge ?? 0} />

                          </>
                        )}
                      </Link>
                    );

                    // Wrap with tooltip when collapsed
                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.name}>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {item.name}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={item.name}>{linkContent}</div>;
                  })}
                </div>
              </div>
            ))}
          </nav>
          {showBottomFade && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-linear-to-t from-grouped to-transparent" />
          )}
        </div>

        {/* User Profile Footer */}
        <div className="shrink-0">
          <UserProfileFooter isCollapsed={isCollapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
