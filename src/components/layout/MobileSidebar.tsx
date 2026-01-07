'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Dumbbell, FolderKanban, Users, Building2, Settings, LogOut } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { Logo } from '@/components/shared/Logo';

// Navigation structure with grouping
const navigationGroups = [
  {
    label: 'Główne',
    items: [
      { name: 'Panel', href: '/', icon: LayoutDashboard, testId: 'nav-mobile-link-dashboard' },
      { name: 'Pacjenci', href: '/patients', icon: Users, testId: 'nav-mobile-link-patients' },
      { name: 'Zestawy', href: '/exercise-sets', icon: FolderKanban, testId: 'nav-mobile-link-exercise-sets' },
      { name: 'Ćwiczenia', href: '/exercises', icon: Dumbbell, testId: 'nav-mobile-link-exercises' },
    ],
  },
  {
    label: 'Zarządzanie',
    items: [
      { name: 'Organizacja', href: '/organization', icon: Building2, testId: 'nav-mobile-link-organization' },
      { name: 'Ustawienia', href: '/settings', icon: Settings, testId: 'nav-mobile-link-settings' },
    ],
  },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLinkClick = () => {
    onClose();
  };

  const handleSignOut = () => {
    onClose();
    signOut();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0" data-testid="nav-mobile-sidebar">
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
          {navigationGroups.map((group, groupIndex) => (
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

                      <Icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-transform duration-200',
                          !active && 'group-hover:scale-110'
                        )}
                      />

                      <span className="flex-1">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out button */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3 bg-surface">
          <button
            onClick={handleSignOut}
            data-testid="nav-mobile-logout-btn"
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-error-muted hover:text-error"
          >
            <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Wyloguj się</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
