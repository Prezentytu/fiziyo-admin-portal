'use client';

import { ChevronRight, Home, Menu, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileOrgIndicator } from '@/components/layout/MobileOrgIndicator';
import { FeedbackButton } from '@/components/shared/FeedbackButton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

// Route name mappings
const routeNames: Record<string, string> = {
  '': 'Panel',
  exercises: 'Ćwiczenia',
  'exercise-sets': 'Zestawy',
  patients: 'Pacjenci',
  organization: 'Organizacja',
  billing: 'Rozliczenia',
  settings: 'Ustawienia',
  tags: 'Tagi',
  import: 'Import Dokumentów',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on dashboard
  if (segments.length === 0) return null;

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;

    // Check if this is an ID (UUID or similar)
    const isId = /^[0-9a-f-]{20,}$/i.exec(segment);
    const label = isId ? 'Szczegóły' : routeNames[segment] || segment;

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm" data-testid="nav-breadcrumbs">
      <Link href="/" data-testid="nav-breadcrumb-home" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span data-testid={`nav-breadcrumb-item-${index}`} className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} data-testid={`nav-breadcrumb-item-${index}`} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

interface HeaderProps {
  readonly onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  // TODO: Replace with real notification count from backend
  const notificationCount = 0;
  const hasNotifications = notificationCount > 0;

  return (
    <TooltipProvider delayDuration={0}>
      <header data-testid="nav-header" className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:px-6">
        {/* Left side - Mobile menu + Org indicator + Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          {onMobileMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMobileMenuToggle}
              aria-label="Otwórz menu"
              data-testid="nav-mobile-menu-btn"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Mobile organization indicator - visible only on mobile */}
          <div className="lg:hidden">
            <MobileOrgIndicator />
          </div>

          {/* Breadcrumbs - hidden on mobile */}
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right side - Notifications & Feedback (kontekst "tu i teraz") */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Notifications - KLUCZOWE dla engagement */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                data-testid="nav-notifications-btn"
                aria-label="Powiadomienia"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {/* Notification badge */}
                {hasNotifications && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Powiadomienia</p>
              <p className="text-xs text-muted-foreground">Wkrótce dostępne</p>
            </TooltipContent>
          </Tooltip>

          {/* Feedback / Help */}
          <FeedbackButton variant="icon" />
        </div>
      </header>
    </TooltipProvider>
  );
}
