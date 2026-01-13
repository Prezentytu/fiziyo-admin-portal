'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Dumbbell,
  FolderKanban,
  Users,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  LucideIcon,
  FileText,
  Sparkles,
  User,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { Logo } from '@/components/shared/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useOrganization } from '@/contexts/OrganizationContext';

// ========================================
// Types
// ========================================

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  testId: string;
  /** Optional badge indicator */
  badge?: number | null;
  /** Optional accent icon for AI-powered features */
  hasAiAccent?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
  /** If true, this group is only visible to owners and admins */
  adminOnly?: boolean;
}

// ========================================
// Navigation Configuration - 3 Zones
// ========================================

const navigationGroups: NavigationGroup[] = [
  // STREFA 1: KLINIKA (Codzienna praca)
  {
    label: 'Klinika',
    items: [
      { name: 'Panel', href: '/', icon: LayoutDashboard, testId: 'nav-mobile-link-dashboard' },
      { name: 'Pacjenci', href: '/patients', icon: Users, testId: 'nav-mobile-link-patients' },
      { name: 'Zestawy', href: '/exercise-sets', icon: FolderKanban, testId: 'nav-mobile-link-exercise-sets' },
      { name: 'Ćwiczenia', href: '/exercises', icon: Dumbbell, testId: 'nav-mobile-link-exercises' },
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
        testId: 'nav-mobile-link-import',
        hasAiAccent: true,
      },
    ],
  },
  // STREFA 3: ORGANIZACJA (Admin)
  {
    label: 'Organizacja',
    adminOnly: true,
    items: [
      { name: 'Zespół', href: '/organization', icon: Building2, testId: 'nav-mobile-link-organization' },
      { name: 'Rozliczenia', href: '/billing', icon: CreditCard, testId: 'nav-mobile-link-billing' },
      { name: 'Ustawienia', href: '/settings', icon: Settings, testId: 'nav-mobile-link-settings' },
    ],
  },
];

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
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { canManageOrganization } = useRoleAccess();
  const { hasMultipleOrganizations } = useOrganization();

  const avatarUrl = user?.imageUrl;
  const fullName = user?.fullName || user?.firstName || 'Użytkownik';
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const initials = getInitials(fullName);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Filter navigation groups based on user role
  const filteredNavigationGroups = useMemo(() => {
    return navigationGroups.filter((group) => {
      if (group.adminOnly) {
        return canManageOrganization;
      }
      return true;
    });
  }, [canManageOrganization]);

  const handleLinkClick = () => {
    onClose();
  };

  const handleSignOut = () => {
    onClose();
    signOut({ redirectUrl: '/sign-in' });
  };

  const handleOpenProfile = () => {
    onClose();
    openUserProfile();
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
          {filteredNavigationGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && 'mt-6')}>
              {/* Group label */}
              <p className="px-4 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </p>

              {/* Navigation items */}
              <div className="space-y-1 px-3">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      data-testid={item.testId}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                        active
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:bg-surface-light hover:text-foreground'
                      )}
                    >
                      {/* Active indicator */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground/50 rounded-full" />
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

                      {/* Badge */}
                      {item.badge && item.badge > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}

                      {/* AI accent in expanded */}
                      {item.hasAiAccent && !active && (
                        <Sparkles className="h-3.5 w-3.5 text-primary opacity-60" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="border-t border-border bg-surface-light/30">
          {/* User Info */}
          {isLoaded && (
            <div className="p-3">
              <div className="flex items-center gap-3 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="bg-linear-to-br from-primary to-primary-dark text-white text-sm font-semibold">
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
                  onClick={handleOpenProfile}
                  data-testid="nav-mobile-user-profile"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Ustawienia profilu</span>
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </button>

                {hasMultipleOrganizations && (
                  <button
                    onClick={onClose}
                    data-testid="nav-mobile-switch-org"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Przełącz organizację</span>
                    <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                  </button>
                )}

                <a
                  href="mailto:support@fiziyo.app"
                  data-testid="nav-mobile-help"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Pomoc / Support</span>
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </a>

                <button
                  onClick={handleSignOut}
                  data-testid="nav-mobile-logout-btn"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
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
