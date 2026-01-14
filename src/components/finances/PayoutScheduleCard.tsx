"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Calendar,
  Clock,
  Banknote,
  ArrowRight,
  Info,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GET_STRIPE_CONNECT_STATUS_QUERY } from "@/graphql/queries";
import type { GetStripeConnectStatusResponse } from "@/types/apollo";
import { formatCurrency } from "@/types/revenue.types";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface PayoutScheduleCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Helper Functions
// ========================================

/**
 * Calculate next payout date (Stripe typically pays weekly on Mondays)
 */
function getNextPayoutDate(): { date: Date; formatted: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Find next Monday (or current day if it's Monday before payout time)
  let daysUntilMonday = (8 - dayOfWeek) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 7; // If today is Monday, next Monday

  const nextPayout = new Date(now);
  nextPayout.setDate(now.getDate() + daysUntilMonday);
  nextPayout.setHours(0, 0, 0, 0);

  const formatted = nextPayout.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return { date: nextPayout, formatted };
}

/**
 * Get days until payout
 */
function getDaysUntilPayout(payoutDate: Date): number {
  const now = new Date();
  const diffTime = payoutDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// ========================================
// Component
// ========================================

export function PayoutScheduleCard({
  organizationId,
  className,
}: PayoutScheduleCardProps) {
  // Fetch Stripe Connect status for balance info
  const { data, loading, error } = useQuery<GetStripeConnectStatusResponse>(
    GET_STRIPE_CONNECT_STATUS_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  const status = data?.stripeConnectStatus;

  // Calculate payout info
  const payoutInfo = useMemo(() => {
    const nextPayout = getNextPayoutDate();
    const daysUntil = getDaysUntilPayout(nextPayout.date);

    return {
      nextDate: nextPayout.formatted,
      daysUntil,
      availableBalance: status?.availableBalance || 0,
      pendingBalance: status?.pendingBalance || 0,
      totalPending: (status?.availableBalance || 0) + (status?.pendingBalance || 0),
      isConnected: status?.onboardingComplete || false,
      payoutsEnabled: status?.payoutsEnabled || false,
    };
  }, [status]);

  // Loading state
  if (loading) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!payoutInfo.isConnected || !payoutInfo.payoutsEnabled) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Harmonogram Wypłat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
              <Banknote className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Skonfiguruj konto Stripe, aby zobaczyć harmonogram wypłat
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border/60 hover:border-primary/30 transition-colors",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" />
          Harmonogram Wypłat
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Stripe automatycznie przelewa środki na Twoje konto bankowe.
                  Standardowy harmonogram to wypłaty co tydzień w poniedziałki.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next payout date */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-light border border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Następna wypłata</p>
              <p className="font-medium text-foreground capitalize">
                {payoutInfo.nextDate}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              payoutInfo.daysUntil <= 2
                ? "border-emerald-500/30 text-emerald-500"
                : "border-border"
            )}
          >
            <Clock className="h-3 w-3 mr-1" />
            {payoutInfo.daysUntil === 0
              ? "Dziś"
              : payoutInfo.daysUntil === 1
                ? "Jutro"
                : `Za ${payoutInfo.daysUntil} dni`}
          </Badge>
        </div>

        {/* Amount breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {/* Available now */}
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Banknote className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Gotowe do wypłaty
              </span>
            </div>
            <p className="text-lg font-bold text-emerald-500 tabular-nums">
              {formatCurrency(payoutInfo.availableBalance)}
            </p>
          </div>

          {/* Pending */}
          <div className="rounded-lg bg-surface-light border border-border/40 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">W drodze</span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {formatCurrency(payoutInfo.pendingBalance)}
            </p>
          </div>
        </div>

        {/* Total estimation */}
        {payoutInfo.totalPending > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span>
              Łącznie oczekuje:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(payoutInfo.totalPending)}
              </span>
            </span>
          </div>
        )}

        {/* Empty state */}
        {payoutInfo.totalPending === 0 && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              Brak środków oczekujących na wypłatę
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
