'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { UserProfileFooter } from './UserProfileFooter';
import { NAV_ITEM_ACTIVE, NAV_ITEM_BASE, NAV_ITEM_INACTIVE } from './navigationItemStyles';
import { isNavigationItemActive } from './navigationActive';
import { useNavigationItems } from './useNavigationItems';
import { Logo } from '@/components/shared/Logo';
import { useOrganizationVerificationRealtime } from '@/hooks/useOrganizationVerificationRealtime';
import { NavCountBadge } from '@/components/layout/NavCountBadge';

interface SidebarProps {
  readonly isCollapsed: boolean;
  readonly onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  useOrganizationVerificationRealtime();
  const { items: navigationItems, matchHrefs: navigationMatchHrefs } = useNavigationItems();
  const navigationRef = useRef<HTMLElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

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
  }, [navigationItems.length, isCollapsed]);

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

        {/* Navigation – większy pt, żeby dół zaznaczenia „Panel” był na tej samej wysokości co dół przycisku „Personalizuj i przypisz” */}
        <div className="relative flex-1 min-h-0">
          {showTopFade && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-grouped to-transparent" />
          )}
          <nav ref={navigationRef} className="h-full overflow-y-auto pt-4 pb-3">
            <div className={cn('space-y-px', isCollapsed ? 'flex flex-col items-center gap-1' : 'px-3')}>
              {navigationItems.map((item) => {
                const active = isNavigationItemActive(pathname, item.matchHrefs, navigationMatchHrefs);
                const Icon = item.icon;

                const linkContent = (
                  <Link
                    href={item.href}
                    data-testid={item.testId}
                    className={cn(
                      NAV_ITEM_BASE,
                      isCollapsed ? 'h-10 w-10 justify-center' : 'h-9 gap-2.5 px-2.5',
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
