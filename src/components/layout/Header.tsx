'use client';

import { ChevronRight, Home, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/layout/UserMenu';
import { MobileOrgIndicator } from '@/components/layout/MobileOrgIndicator';
import { FeedbackButton } from '@/components/shared/FeedbackButton';

// Route name mappings
const routeNames: Record<string, string> = {
  '': 'Panel',
  exercises: 'Ćwiczenia',
  'exercise-sets': 'Zestawy',
  patients: 'Pacjenci',
  organization: 'Organizacja',
  settings: 'Ustawienia',
  tags: 'Tagi',
  import: 'Import AI',
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
    const isId = segment.match(/^[0-9a-f-]{20,}$/i);
    const label = isId ? 'Szczegóły' : routeNames[segment] || segment;

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:px-6">
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

      {/* Right side - Search and actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        {/* <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj... (Ctrl+K)"
            className="w-48 lg:w-64 pl-9 bg-surface-light border-border focus:border-primary"
          />
        </div> */}

        {/* Feedback */}
        <FeedbackButton variant="icon" />

        {/* User */}
        <UserMenu />
      </div>
    </header>
  );
}
