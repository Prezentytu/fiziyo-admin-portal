"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  TrendingUp,
  Users,
  Clock,
  Sparkles,
  ArrowUp,
  Coins,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GET_ORGANIZATION_EARNINGS_QUERY } from "@/graphql/queries";
import type { GetOrganizationEarningsResponse } from "@/types/apollo";
import { formatCurrency, formatPercent } from "@/types/revenue.types";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface EarningsHeroCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Component
// ========================================

export function EarningsHeroCard({
  organizationId,
  className,
}: EarningsHeroCardProps) {
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
      estimatedMonthlyRevenue: earnings.estimatedMonthlyRevenue,
      activeSubscribers: earnings.activeSubscribers,
      commissionRate: earnings.commissionRate,
      commissionTier: earnings.commissionTier,
      currency: earnings.currency,
      hasStripeConnect: earnings.hasStripeConnect,
      stripeOnboardingComplete: earnings.stripeOnboardingComplete,
    };
  }, [earnings]);

  // Loading state
  if (loading) {
    return (
      <Card
        className={cn(
          "relative overflow-hidden border-primary/30 bg-gradient-to-br from-surface via-surface to-primary/5",
          className
        )}
        data-testid="earnings-hero-card"
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error or no data
  if (error || !displayData) {
    return (
      <Card
        className={cn(
          "relative overflow-hidden border-border/60 bg-surface",
          className
        )}
        data-testid="earnings-hero-card"
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Nie udało się pobrać danych o zarobkach
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {error?.message || "Spróbuj ponownie później"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-primary/30 bg-gradient-to-br from-surface via-surface to-primary/5",
        "transition-all duration-300 hover:shadow-xl hover:shadow-primary/10",
        className
      )}
      data-testid="earnings-hero-card"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-cyan-500" />

      {/* Background decorations */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />

      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Twoje Zarobki
            </h3>
            <Badge
              className={cn(
                "gap-1 border-0",
                "bg-primary/20 text-primary hover:bg-primary/30"
              )}
            >
              <Sparkles className="h-3 w-3" />
              {displayData.commissionTier}
            </Badge>
          </div>
        </div>

        {/* Main Amount - Monthly Earnings */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help mb-4">
                <p
                  className="text-4xl sm:text-5xl font-bold text-primary tabular-nums tracking-tight"
                  data-testid="earnings-hero-monthly"
                >
                  {formatCurrency(
                    displayData.monthlyEarnings,
                    displayData.currency
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Zarobki w tym miesiącu • Prowizja{" "}
                  {formatPercent(displayData.commissionRate)}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-sm">
                Suma prowizji od subskrypcji pacjentów Premium w bieżącym
                miesiącu. Twoja prowizja to{" "}
                {formatPercent(displayData.commissionRate)} od każdej płatności.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total Earnings */}
          <div className="rounded-xl bg-surface-light/50 backdrop-blur-sm border border-border/40 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Łącznie</span>
            </div>
            <p
              className="text-lg font-bold text-foreground tabular-nums"
              data-testid="earnings-hero-total"
            >
              {formatCurrency(displayData.totalEarnings, displayData.currency)}
            </p>
          </div>

          {/* Pending Earnings */}
          <div className="rounded-xl bg-surface-light/50 backdrop-blur-sm border border-border/40 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">Oczekujące</span>
            </div>
            <p
              className="text-lg font-bold text-foreground tabular-nums"
              data-testid="earnings-hero-pending"
            >
              {formatCurrency(
                displayData.pendingEarnings,
                displayData.currency
              )}
            </p>
          </div>

          {/* Active Subscribers */}
          <div className="rounded-xl bg-surface-light/50 backdrop-blur-sm border border-border/40 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-info" />
              <span className="text-xs text-muted-foreground">Pacjenci</span>
            </div>
            <p
              className="text-lg font-bold text-foreground tabular-nums"
              data-testid="earnings-hero-subscribers"
            >
              {displayData.activeSubscribers}
            </p>
          </div>
        </div>

        {/* Estimated Monthly Revenue hint */}
        {displayData.estimatedMonthlyRevenue > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowUp className="h-3 w-3 text-emerald-500" />
            <span>
              Prognoza:{" "}
              <span className="font-medium text-foreground">
                ~
                {formatCurrency(
                  displayData.estimatedMonthlyRevenue,
                  displayData.currency
                )}
              </span>{" "}
              miesięcznie
            </span>
          </div>
        )}

        {/* Stripe Connect Warning */}
        {!displayData.stripeOnboardingComplete && (
          <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Skonfiguruj konto Stripe, aby otrzymywać wypłaty prowizji
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
