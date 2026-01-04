'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Dumbbell,
  FolderKanban,
  Users,
  Calendar,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  HeartPulse,
  FileUp,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { OrganizationSwitcher } from './OrganizationSwitcher';

// Navigation structure with grouping
const navigationGroups = [
  {
    label: 'Główne',
    items: [
      { name: 'Panel', href: '/', icon: LayoutDashboard },
      { name: 'Pacjenci', href: '/patients', icon: Users },
      // { name: 'Kalendarz', href: '/appointments', icon: Calendar }, // Ukryty na ten moment
      { name: 'Zestawy', href: '/exercise-sets', icon: FolderKanban },
      { name: 'Ćwiczenia', href: '/exercises', icon: Dumbbell },
      { name: 'Import AI', href: '/import', icon: FileUp },
    ],
  },
  {
    label: 'Zarządzanie',
    items: [
      { name: 'Organizacja', href: '/organization', icon: Building2 },
      { name: 'Subskrypcja', href: '/subscription', icon: CreditCard },
      { name: 'Ustawienia', href: '/settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden lg:flex h-screen flex-col border-r border-border/60 bg-surface transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Header with logo and toggle */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-border/60 transition-all duration-300',
            isCollapsed ? 'justify-center px-3' : 'justify-between px-4'
          )}
        >
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/15">
              <HeartPulse className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col justify-center overflow-hidden">
                <span className="text-lg font-bold leading-tight text-foreground">FiziYo</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Admin Panel</span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors"
              aria-label="Zwiń menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-3 border-b border-border">
            <button
              onClick={onToggleCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors"
              aria-label="Rozwiń menu"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Organization Switcher */}
        <OrganizationSwitcher isCollapsed={isCollapsed} />

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && 'mt-6')}>
              {/* Group label */}
              {!isCollapsed && (
                <p className="px-4 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {isCollapsed && groupIndex > 0 && <div className="mx-3 mb-2 border-t border-border" />}

              {/* Navigation items */}
              <div className={cn('space-y-1', isCollapsed ? 'flex flex-col items-center' : 'px-3')}>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                        isCollapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2.5',
                        active
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:bg-surface-light hover:text-foreground'
                      )}
                    >
                      <Icon
                        className={cn(
                          'shrink-0 transition-transform duration-200',
                          isCollapsed ? 'h-5 w-5' : 'h-5 w-5',
                          !active && 'group-hover:scale-110'
                        )}
                      />

                      {!isCollapsed && <span className="flex-1 truncate">{item.name}</span>}
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

        {/* Sign out */}
        <div className={cn('border-t border-border', isCollapsed ? 'p-2' : 'p-3')}>
          <div className={isCollapsed ? 'flex justify-center' : ''}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => signOut()}
                    className="group flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-error-muted hover:text-error"
                    aria-label="Wyloguj się"
                  >
                    <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Wyloguj się
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => signOut()}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-error-muted hover:text-error"
              >
                <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span>Wyloguj się</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
