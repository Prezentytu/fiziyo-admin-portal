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
  Sparkles,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { UserProfileFooter } from './UserProfileFooter';
import { NAV_ITEM_ACTIVE, NAV_ITEM_BASE, NAV_ITEM_INACTIVE } from './navigationItemStyles';
import { Logo } from '@/components/shared/Logo';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useSystemRole } from '@/hooks/useSystemRole';

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
  /** Optional accent icon for AI-powered features */
  hasAiAccent?: boolean;
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
    label: 'Smart Tools',
    items: [
      {
        name: 'Import Dokumentów',
        href: '/import',
        icon: FileText,
        testId: 'nav-link-import',
        hasAiAccent: true,
      },
    ],
  },
  // STREFA 3: ORGANIZACJA (Admin - rzadziej używane)
  {
    label: 'Organizacja',
    adminOnly: true,
    items: [
      { name: 'Zespół', href: '/organization', icon: Building2, testId: 'nav-link-organization' },
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
        name: 'Centrum Weryfikacji',
        href: '/verification',
        icon: ShieldCheck,
        testId: 'nav-link-verification',
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
  const { canReviewExercises } = useSystemRole();
  const navigationRef = useRef<HTMLElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Filter navigation groups based on user role
  const filteredNavigationGroups = useMemo(() => {
    return navigationGroups.filter((group) => {
      // ContentManager-only groups (system role)
      if (group.contentManagerOnly) {
        return canReviewExercises;
      }
      // Admin-only groups (organization role)
      if (group.adminOnly) {
        return canManageOrganization;
      }
      return true;
    });
  }, [canManageOrganization, canReviewExercises]);

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
          'hidden xl:flex h-full flex-col border-r border-border/60 bg-surface transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Header with logo and toggle - h-16 = ta sama wysokość co Header, wyrównanie „FiziYo” z „Zgłoś uwagę” */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center transition-all duration-300',
            isCollapsed ? 'justify-center px-3' : 'justify-start px-4 xl:px-6'
          )}
        >
          <Logo variant={isCollapsed ? 'icon' : 'default'} size="sm" asLink href="/" />

          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              data-testid="nav-collapse-btn"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
            className="h-full overflow-y-auto pt-5 pb-3 xl:pt-[clamp(1rem,1.5dvh,1.75rem)] xl:pb-[clamp(0.5rem,1dvh,1.5rem)]"
          >
            {filteredNavigationGroups.map((group, groupIndex) => (
              <div key={group.label} className={cn(groupIndex > 0 && 'mt-4 xl:mt-[clamp(1rem,1.5dvh,2rem)]')}>
                {/* Group label */}
                {!isCollapsed && (
                  <p className="px-4 xl:px-6 mb-2 xl:mb-[clamp(0.375rem,0.5dvh,0.75rem)] text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                    {group.label}
                  </p>
                )}
                {isCollapsed && groupIndex > 0 && <div className="mx-3 xl:mx-4 mb-2 xl:mb-3 border-t border-border" />}

                {/* Navigation items */}
                <div className={cn('space-y-1 xl:space-y-2', isCollapsed ? 'flex flex-col items-center' : 'px-3 xl:px-4')}>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    const linkContent = (
                      <Link
                        href={item.href}
                        data-testid={item.testId}
                        className={cn(
                          NAV_ITEM_BASE,
                          isCollapsed
                            ? 'h-10 w-10 xl:h-12 xl:w-12 justify-center'
                            : 'gap-3 xl:gap-4 px-3 py-2.5 xl:px-4 xl:py-[clamp(0.5rem,0.8dvh,0.875rem)]',
                          active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE
                        )}
                      >
                        <div className="relative">
                          <Icon
                            className={cn(
                              'h-5 w-5 shrink-0 transition-transform duration-200',
                              active ? 'nav-icon' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'
                            )}
                          />
                          {/* AI Accent - small sparkle indicator */}
                          {item.hasAiAccent && !active && (
                            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary" />
                          )}
                        </div>

                        {!isCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.name}</span>

                            {/* Badge indicator */}
                            {item.badge && item.badge > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            )}

                            {/* AI accent indicator in expanded mode */}
                            {item.hasAiAccent && !active && <Sparkles className="h-3.5 w-3.5 text-primary opacity-60" />}
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
                              {item.hasAiAccent && <Sparkles className="h-3 w-3 text-primary" />}
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
