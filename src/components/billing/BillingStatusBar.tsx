'use client';

import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { Wallet, ChevronRight, Sparkles, Gift } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GET_CURRENT_BILLING_STATUS_QUERY } from '@/graphql/queries/billing.queries';
import type { GetCurrentBillingStatusResponse } from '@/types/apollo';

// ========================================
// Types
// ========================================

interface BillingStatusBarProps {
  organizationId: string;
  className?: string;
}

// ========================================
// Component
// ========================================

/**
 * Płaski pasek statusu rozliczeń Pay-as-you-go.
 * Wyświetlany na dole dashboardu, działa jako separator i link do /finances.
 */
export function BillingStatusBar({ organizationId, className }: Readonly<BillingStatusBarProps>) {
  const { data, loading, error } = useQuery<GetCurrentBillingStatusResponse>(GET_CURRENT_BILLING_STATUS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
    errorPolicy: 'all',
  });

  const billingStatus = data?.currentBillingStatus;

  // Loading state
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Ładowanie rozliczenia"
        className={cn('min-w-0 space-y-2 border-t border-border py-4', className)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-4 w-4 shrink-0" />
          <Skeleton className="h-4 w-36 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-4 pl-6">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  // Error/no data - don't show bar
  if (error || !billingStatus) {
    return null;
  }

  const { estimatedTotal, activePatientsInMonth, currentlyActivePremium, currency, isPilotMode } = billingStatus;
  // Use currentlyActivePremium (teraz aktywni) zamiast activePatientsInMonth (w tym miesiącu)
  const activeCount = currentlyActivePremium ?? activePatientsInMonth;
  const hasActivity = activeCount > 0;
  // W pilot mode zawsze 0 PLN
  const displayAmount = isPilotMode ? 0 : estimatedTotal;
  const formattedAmount = `${displayAmount.toLocaleString('pl-PL')} ${currency}`;

  return (
    <Link
      href="/finances"
      data-testid="dashboard-billing-status-bar"
      className={cn(
        'group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-border py-4',
        'transition-colors duration-150 hover:bg-muted/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground group-hover:text-foreground">
        <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-sm wrap-anywhere">Bieżące rozliczenie</span>
      </div>
      <ChevronRight className="row-span-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 pl-6">
        <span className="text-base font-semibold tabular-nums whitespace-nowrap text-foreground">
          {formattedAmount}
        </span>
        {hasActivity ? (
          <span className="text-sm text-muted-foreground">
            {activeCount} {activeCount === 1 ? 'aktywny' : 'aktywnych'}
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="wrap-anywhere">Aktywuj pierwszego</span>
          </span>
        )}
        {isPilotMode && hasActivity && (
          <Badge
            variant="outline"
            className="max-w-full gap-1 border-border bg-muted text-xs font-medium whitespace-normal text-foreground"
          >
            <Gift className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
            <span className="wrap-anywhere">Wczesny dostęp</span>
          </Badge>
        )}
      </div>
    </Link>
  );
}
