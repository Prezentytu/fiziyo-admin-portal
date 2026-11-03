'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { useAppSignOut } from '@/lib/auth/useAppSignOut';
import { useQuery } from '@apollo/client/react';
import { Building2, LogOut, Sparkles, User, HelpCircle, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { NAV_ITEM_ACTIVE, NAV_ITEM_BASE, NAV_ITEM_INACTIVE } from './navigationItemStyles';
import { isNavigationItemActive } from './navigationActive';
import { useAccountNavigationItems, useNavigationItems } from './useNavigationItems';
import { NavCountBadge } from './NavCountBadge';
import { Logo } from '@/components/shared/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { UserByClerkIdResponse } from '@/types/apollo';
import { resolveDisplayName } from './userDisplayName';
import { getInitialsFromName } from '@/utils/textUtils';

interface MobileSidebarProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const signOut = useAppSignOut();
  const { data } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });
  const { items: navigationItems, matchHrefs: navigationMatchHrefs } = useNavigationItems();
  const accountNavigationItems = useAccountNavigationItems();
  const { hasMultipleOrganizations } = useOrganization();

  const backendUser = data?.userByClerkId;
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
  const initials = getInitialsFromName(fullName);

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
      <SheetContent side="left" className="w-72 p-0 flex flex-col" data-testid="nav-mobile-sidebar">
        {/* Header */}
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>
            <Logo variant="full" size="md" />
          </SheetTitle>
        </SheetHeader>

        {/* Organization Switcher */}
        <OrganizationSwitcher isCollapsed={false} />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {navigationItems.map((item) => {
              const active = isNavigationItemActive(pathname, item.matchHrefs, navigationMatchHrefs);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleLinkClick}
                  data-testid={item.mobileTestId}
                  className={cn(NAV_ITEM_BASE, 'gap-3 px-3 py-3', active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE)}
                >
                  {/* Active indicator */}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary/60" />
                  )}

                  <div className="relative">
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0 transition-transform duration-200',
                        !active && 'group-hover:scale-110'
                      )}
                    />
                    {/* AI Accent */}
                    {item.hasAiAccent && !active && (
                      <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary" />
                    )}
                  </div>

                  <span className="flex-1">{item.name}</span>

                  <NavCountBadge count={item.badge ?? 0} />

                  {/* AI accent in expanded */}
                  {item.hasAiAccent && !active && <Sparkles className="h-3.5 w-3.5 text-primary opacity-60" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="border-t border-border bg-surface-light/30">
          {/* User Info */}
          {isLoaded && (
            <div className="p-3">
              <div className="flex items-center gap-3 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="bg-linear-to-br from-primary to-primary-dark text-primary-foreground text-sm font-semibold">
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
                  <span>Ustawienia</span>
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </button>

                {accountNavigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      data-testid={item.mobileTestId}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                      <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                    </Link>
                  );
                })}

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
