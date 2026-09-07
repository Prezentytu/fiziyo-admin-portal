'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
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
import { filterNavigationGroups, navigationGroups } from '@/components/layout/navigation.config';

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
    return filterNavigationGroups(navigationGroups, {
      canManageOrganization,
      canReviewExercises,
      isSiteSuperAdmin,
    }).map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.href === '/organization/verification' ? { ...item, badge: organizationPendingVerificationCount } : item
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
          'hidden xl:flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150',
          isCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Header with logo and toggle - h-16 = ta sama wysokość co Header, wyrównanie „FiziYo” z „Zgłoś uwagę” */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-border',
            isCollapsed ? 'justify-center px-3' : 'justify-start px-4 xl:px-6'
          )}
        >
          <Logo variant={isCollapsed ? 'icon' : 'default'} size="sm" asLink href="/" />

          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              data-testid="nav-collapse-btn"
              className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              aria-label="Zwiń menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex shrink-0 justify-center py-3 border-b border-border">
            <button
              type="button"
              onClick={onToggleCollapse}
              data-testid="nav-expand-btn"
              className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-surface to-transparent" />
          )}
          <nav
            ref={navigationRef}
            aria-label="Menu główne"
            className="h-full overflow-y-auto py-4"
          >
            {filteredNavigationGroups.map((group, groupIndex) => (
              <div key={group.label} className={cn(groupIndex > 0 && 'mt-6')}>
                {/* Group label */}
                {!isCollapsed && (
                  <p className="mb-2 px-6 text-xs font-medium tracking-normal text-muted-foreground">
                    {group.label}
                  </p>
                )}
                {isCollapsed && groupIndex > 0 && <div className="mx-3 xl:mx-4 mb-2 xl:mb-3 border-t border-border" />}

                {/* Navigation items */}
                <div
                  className={cn('space-y-1', isCollapsed ? 'flex flex-col items-center' : 'px-3')}
                >
                  {group.items.map((item) => {
                    const active = isNavigationHrefActive(pathname, item.href, filteredNavigationHrefs);
                    const Icon = item.icon;

                    const linkContent = (
                      <Link
                        href={item.href}
                        data-testid={item.testId}
                        aria-current={active ? 'page' : undefined}
                        aria-label={isCollapsed ? item.name : undefined}
                        className={cn(
                          NAV_ITEM_BASE,
                          isCollapsed
                            ? 'size-10 justify-center'
                            : 'gap-3 px-3 py-2',
                          active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE
                        )}
                      >
                        <div className="shrink-0">
                          <Icon
                            aria-hidden="true"
                            className={cn(
                              'size-5 shrink-0',
                              active
                                ? 'nav-icon'
                                : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          />
                        </div>

                        {!isCollapsed && (
                          <>
                            <span className="min-w-0 flex-1 wrap-anywhere">{item.name}</span>

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
                            <div className="flex items-center gap-2">
                              {item.name}
                            </div>
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-linear-to-t from-surface to-transparent" />
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
