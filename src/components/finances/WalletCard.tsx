"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import CountUp from "react-countup";
import { Wallet, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/shared/Logo";
import { GET_ORGANIZATION_EARNINGS_QUERY } from "@/graphql/queries";
import type { GetOrganizationEarningsResponse } from "@/types/apollo";
import { cn } from "@/lib/utils";

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
  // Fetch earnings data
  const { data, loading, error } = useQuery<GetOrganizationEarningsResponse>(
    GET_ORGANIZATION_EARNINGS_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  const earnings = data?.organizationEarnings;

  // Calculate display values
  const displayData = useMemo(() => {
    if (!earnings) return null;

    return {
      monthlyEarnings: earnings.monthlyEarnings,
      totalEarnings: earnings.totalEarnings,
      pendingEarnings: earnings.pendingEarnings,
      activeSubscribers: earnings.activeSubscribers,
      hasStripeConnect: earnings.hasStripeConnect,
      stripeOnboardingComplete: earnings.stripeOnboardingComplete,
    };
  }, [earnings]);

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-white/10",
          "bg-gradient-to-br from-emerald-900 via-zinc-900 to-black",
          "p-6 h-full min-h-[200px]",
          className
        )}
      >
        <div className="space-y-4">
          <Skeleton className="h-4 w-24 bg-zinc-800" />
          <Skeleton className="h-12 w-48 bg-zinc-800" />
          <Skeleton className="h-4 w-32 bg-zinc-800" />
        </div>
      </div>
    );
  }

  // Error or no data
  if (error || !displayData) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-white/10",
          "bg-gradient-to-br from-zinc-900 via-zinc-900 to-black",
          "p-6 h-full min-h-[200px] flex items-center justify-center",
          className
        )}
      >
        <div className="text-center">
          <Wallet className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Nie udało się pobrać danych</p>
        </div>
      </div>
    );
  }

  // Determine status
  const isReady = displayData.stripeOnboardingComplete;
  const statusText = isReady ? "Gotowe do wypłaty" : "Skonfiguruj wypłaty";
  const StatusIcon = isReady ? CheckCircle : Clock;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10",
        "bg-gradient-to-br from-emerald-900 via-zinc-900 to-black",
        "shadow-2xl transition-transform duration-300 hover:scale-[1.01]",
        "h-full min-h-[200px]",
        className
      )}
    >
      {/* Noise overlay - using CSS pattern instead of image */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Glass shine effect - top right glow */}
      <div className="absolute -top-10 -right-10 h-40 w-40 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

      {/* Secondary glow - bottom left */}
      <div className="absolute -bottom-20 -left-20 h-32 w-32 bg-emerald-600/10 blur-3xl rounded-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-medium text-zinc-400">
            Dostępne środki
          </span>
        </div>

        {/* Main Balance with CountUp animation */}
        <div className="flex-1">
          <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight tabular-nums">
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
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-zinc-400">Łącznie:</span>
              <span className="text-white font-medium tabular-nums">
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
          </div>

          {/* Pending */}
          {displayData.pendingEarnings > 0 && (
            <div className="flex items-center gap-1.5 text-sm mt-1">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-zinc-400">Oczekuje:</span>
              <span className="text-amber-400 font-medium tabular-nums">
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

        {/* Footer - Status */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              )}
            />
            <span className="text-sm text-zinc-400">{statusText}</span>
            <StatusIcon
              className={cn(
                "h-4 w-4",
                isReady ? "text-emerald-400" : "text-amber-400"
              )}
            />
          </div>

          {/* Active subscribers count */}
          <div className="text-xs text-zinc-500">
            {displayData.activeSubscribers} pacjentów
          </div>
        </div>
      </div>

      {/* FiziYo logo decoration */}
      <div className="absolute right-4 bottom-4 opacity-[0.03] pointer-events-none">
        <Logo variant="icon" size="lg" />
      </div>
    </div>
  );
}
