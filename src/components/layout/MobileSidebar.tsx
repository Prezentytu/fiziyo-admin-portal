'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { useAppSignOut } from '@/lib/auth/useAppSignOut';
import { Building2, LogOut, User, HelpCircle, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { NAV_ITEM_ACTIVE, NAV_ITEM_BASE, NAV_ITEM_INACTIVE } from './navigationItemStyles';
import { isNavigationHrefActive } from './navigationActive';
import { Logo } from '@/components/shared/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { resolveDisplayName } from './userDisplayName';
import { filterNavigationGroups, navigationGroups } from '@/components/layout/navigation.config';
import { useSystemRole } from '@/hooks/useSystemRole';

// ========================================
// Helpers
// ========================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface MobileSidebarProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const signOut = useAppSignOut();
  const { user: backendUser } = useCurrentUser();
  const { canManageOrganization } = useRoleAccess();
  const { canReviewExercises, isSiteSuperAdmin } = useSystemRole();
  const { hasMultipleOrganizations } = useOrganization();
  const avatarUrl = user?.imageUrl;
  const fullName =
    resolveDisplayName(
      backendUser?.fullname,
      backendUser?.personalData?.firstName,
      backendUser?.personalData?.lastName
    ) ||
    resolveDisplayName(user?.fullName, user?.firstName, user?.lastName) ||
    'Użytkownik';
  const email = user?.primaryEmailAddress?.emailAddress || backendUser?.email || '';
  const initials = getInitials(fullName);

  // Filter navigation groups based on user role
  const filteredNavigationGroups = useMemo(() => {
    return filterNavigationGroups(navigationGroups, {
      canManageOrganization,
      canReviewExercises,
      isSiteSuperAdmin,
    });
  }, [canManageOrganization, canReviewExercises, isSiteSuperAdmin]);
  const filteredNavigationHrefs = useMemo(
    () => filteredNavigationGroups.flatMap((group) => group.items.map((item) => item.href)),
    [filteredNavigationGroups]
  );

  const handleLinkClick = () => {
    onClose();
  };

  const handleSignOut = () => {
    onClose();
    signOut('/sign-in');
  };

  const handleOpenProfile = () => {
    onClose();
    router.push('/settings');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="flex w-[min(20rem,calc(100%-2rem))] flex-col overflow-y-auto bg-surface p-0" data-testid="nav-mobile-sidebar">
        {/* Header */}
        <SheetHeader className="min-h-16 shrink-0 justify-center border-b border-border p-4 pr-12">
          <SheetTitle>
            <Logo variant="full" size="md" />
          </SheetTitle>
        </SheetHeader>

        {/* Organization Switcher */}
        <OrganizationSwitcher isCollapsed={false} />

        {/* Navigation */}
        <nav aria-label="Menu główne" className="min-h-32 flex-1 overflow-y-auto py-4">
          {filteredNavigationGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && 'mt-6')}>
              {/* Group label */}
              <p className="mb-2 px-6 text-xs font-medium tracking-normal text-muted-foreground">
                {group.label}
              </p>

              {/* Navigation items */}
              <div className="space-y-1 px-3">
                {group.items.map((item) => {
                  const active = isNavigationHrefActive(pathname, item.href, filteredNavigationHrefs);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      data-testid={item.mobileTestId}
                      aria-current={active ? 'page' : undefined}
                      className={cn(NAV_ITEM_BASE, 'min-h-11 gap-3 px-3 py-2', active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE)}
                    >
                      <Icon aria-hidden="true" className={cn('size-5 shrink-0', active && 'nav-icon')} />

                      <span className="min-w-0 flex-1 wrap-anywhere">{item.name}</span>

                      {/* Badge */}
                      {item.badge && item.badge > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}

                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="shrink-0 border-t border-border bg-surface">
          {/* User Info */}
          {isLoaded && (
            <div className="p-3">
              <div className="flex items-center gap-3 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  data-testid="nav-mobile-user-profile"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <User className="h-4 w-4" />
                  <span>Ustawienia profilu</span>
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </button>

                {hasMultipleOrganizations && (
                  <button
                    type="button"
                    onClick={onClose}
                    data-testid="nav-mobile-switch-org"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Przełącz organizację</span>
                    <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                  </button>
                )}

                <a
                  href="mailto:kontakt@fiziyo.pl"
                  data-testid="nav-mobile-help"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Pomoc / Support</span>
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </a>

                <button
                  type="button"
                  onClick={handleSignOut}
                  data-testid="nav-mobile-logout-btn"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Wyloguj się</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
