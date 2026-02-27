'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import CountUp from 'react-countup';
import { Wallet, TrendingUp, Clock, CheckCircle, Sparkles, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/shared/Logo';
import { GET_ORGANIZATION_EARNINGS_QUERY, GET_CURRENT_BILLING_STATUS_QUERY } from '@/graphql/queries';
import type { GetOrganizationEarningsResponse, GetCurrentBillingStatusResponse } from '@/types/apollo';
import { cn } from '@/lib/utils';

// ========================================
// Types
// ========================================

interface WalletCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Component
// ========================================

export function WalletCard({ organizationId, className }: WalletCardProps) {
  // Fetch earnings data (Revenue Share)
  const { data, loading, error } = useQuery<GetOrganizationEarningsResponse>(GET_ORGANIZATION_EARNINGS_QUERY, {
    variables: { organizationId: organizationId || '' },
    skip: !organizationId,
    errorPolicy: 'all',
  });

  // Fetch billing status (Pay-as-you-go / Pilot Mode)
  const { data: billingData } = useQuery<GetCurrentBillingStatusResponse>(GET_CURRENT_BILLING_STATUS_QUERY, {
    variables: { organizationId: organizationId || '' },
    skip: !organizationId,
    errorPolicy: 'all',
  });

  const earnings = data?.organizationEarnings;
  const billing = billingData?.currentBillingStatus;

  // Calculate display values - combine earnings and billing data
  const displayData = useMemo(() => {
    // Use billing data if available (Pay-as-you-go / Pilot mode)
    const isPilotMode = billing?.isPilotMode ?? false;
    const premiumPatients = billing?.currentlyActivePremium ?? 0;

    // If no earnings AND no billing data, return null
    if (!earnings && !billing) {
      return null;
    }

    // If no earnings data, still show billing info
    if (!earnings) {
      return {
        monthlyEarnings: billing?.estimatedTotal ?? 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        activeSubscribers: premiumPatients,
        hasStripeConnect: false,
        stripeOnboardingComplete: false,
        isPilotMode,
        premiumPatients,
      };
    }

    return {
      monthlyEarnings: isPilotMode ? 0 : earnings.monthlyEarnings,
      totalEarnings: earnings.totalEarnings,
      pendingEarnings: earnings.pendingEarnings,
      activeSubscribers: Math.max(earnings.activeSubscribers, premiumPatients),
      hasStripeConnect: earnings.hasStripeConnect,
      stripeOnboardingComplete: earnings.stripeOnboardingComplete,
      isPilotMode,
      premiumPatients,
    };
  }, [earnings, billing]);

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border shadow-sm',
          'bg-surface',
          'p-6 h-full min-h-[160px]',
          className
        )}
      >
        <div className="space-y-4">
          <Skeleton className="h-4 w-24 bg-surface-elevated" />
          <Skeleton className="h-10 w-48 bg-surface-elevated" />
          <Skeleton className="h-4 w-32 bg-surface-elevated" />
        </div>
      </div>
    );
  }

  // Error or no data
  if (error || !displayData) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border bg-surface',
          'p-6 h-full min-h-[160px] flex items-center justify-center',
          className
        )}
      >
        <div className="text-center">
          <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nie udało się pobrać danych</p>
        </div>
      </div>
    );
  }

  // Determine status
  const isReady = displayData.stripeOnboardingComplete;
  const statusText = isReady ? 'Gotowe do wypłaty' : 'Skonfiguruj wypłaty';
  const StatusIcon = isReady ? CheckCircle : Clock;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-surface',
        'shadow-sm transition-all duration-300 hover:shadow-md hover:border-border/80',
        'h-full min-h-[160px]',
        className
      )}
    >
      {/* Content */}
      <div className="relative z-10 p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated border border-border/60">
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-base font-semibold text-foreground">Dostępne środki</span>
          </div>
          {displayData.isPilotMode && (
            <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 gap-1 px-3 py-1 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Pilot 100% gratis
            </Badge>
          )}
        </div>

        {/* Main Balance with CountUp animation */}
        <div className="flex-1">
          <div className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight tabular-nums leading-none mb-4">
            <CountUp
              end={displayData.monthlyEarnings}
              decimals={2}
              duration={1.2}
              separator=" "
              decimal=","
              suffix=" zł"
              preserveValue
            />
          </div>

          {/* Secondary stats */}
          <div className="flex items-center gap-5 mt-1">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">Łącznie:</span>
              <span className="text-foreground font-semibold tabular-nums">
                <CountUp
                  end={displayData.totalEarnings}
                  decimals={2}
                  duration={1}
                  separator=" "
                  decimal=","
                  suffix=" zł"
                  preserveValue
                />
              </span>
            </div>

            {/* Pending */}
            {displayData.pendingEarnings > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Oczekuje:</span>
                <span className="text-amber-500 font-semibold tabular-nums">
                  <CountUp
                    end={displayData.pendingEarnings}
                    decimals={2}
                    duration={1}
                    separator=" "
                    decimal=","
                    suffix=" zł"
                    preserveValue
                  />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Status */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', isReady ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-400')} />
            <span className="text-xs font-medium text-muted-foreground">{statusText}</span>
            <StatusIcon className={cn('h-3.5 w-3.5', isReady ? 'text-emerald-500' : 'text-slate-400')} />
          </div>

          {/* Active Premium patients count */}
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className={cn(displayData.premiumPatients > 0 ? 'text-primary font-semibold' : 'text-muted-foreground')}>
              {displayData.premiumPatients} {displayData.premiumPatients === 1 ? 'pacjent' : 'pacjentów'} Premium
            </span>
          </div>
        </div>
      </div>

      {/* FiziYo logo decoration */}
      <div className="absolute right-6 top-8 opacity-[0.02] pointer-events-none">
        <Logo variant="icon" size="lg" />
      </div>
    </div>
  );
}
