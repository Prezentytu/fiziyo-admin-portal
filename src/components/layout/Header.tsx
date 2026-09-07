'use client';

import { ChevronRight, Home, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileOrgIndicator } from '@/components/layout/MobileOrgIndicator';
import { FeedbackButton } from '@/components/shared/FeedbackButton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getRouteLabel } from '@/components/layout/navigation.config';

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
    const label = isId ? 'Szczegóły' : getRouteLabel(segment);

    return { href, label, isLast };
  });

  return (
    <nav
      aria-label="Ścieżka nawigacji"
      className="flex min-w-0 flex-wrap items-center gap-2 text-sm"
      data-testid="nav-breadcrumbs"
    >
      <Link
        href="/"
        data-testid="nav-breadcrumb-home"
        aria-label="Pulpit"
        className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-light hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex min-w-0 items-center gap-2">
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          {crumb.isLast ? (
            <span
              data-testid={`nav-breadcrumb-item-${index}`}
              aria-current="page"
              className="min-w-0 wrap-anywhere font-medium text-foreground"
            >
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              data-testid={`nav-breadcrumb-item-${index}`}
              className="inline-flex min-h-8 min-w-0 items-center rounded-sm wrap-anywhere text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
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
  return (
    <TooltipProvider delayDuration={300}>
      <header
        data-testid="nav-header"
        className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 lg:px-6"
      >
        {/* Left side - Mobile menu + Org indicator + Breadcrumbs */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Mobile menu button */}
          {onMobileMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 xl:hidden"
              onClick={onMobileMenuToggle}
              aria-label="Otwórz menu"
              data-testid="nav-mobile-menu-btn"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Mobile organization indicator - visible when sidebar is overlay (tablet + mobile) */}
          <div className="min-w-0 xl:hidden">
            <MobileOrgIndicator />
          </div>

          {/* Breadcrumbs - hidden on mobile */}
          <div className="hidden min-w-0 xl:flex xl:items-center">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right side - Notifications & Feedback (kontekst "tu i teraz") */}
        <div className="flex shrink-0 items-center gap-2">
          <FeedbackButton variant="icon" />
        </div>
      </header>
    </TooltipProvider>
  );
}
