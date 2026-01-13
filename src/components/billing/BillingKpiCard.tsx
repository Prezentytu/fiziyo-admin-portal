"use client";

import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { Wallet, ChevronRight, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GET_CURRENT_BILLING_STATUS_QUERY } from "@/graphql/queries/billing.queries";
import type { GetCurrentBillingStatusResponse } from "@/types/apollo";

// ========================================
// Types
// ========================================

interface BillingKpiCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Component
// ========================================

/**
 * Minimalistyczna karta KPI dla rozliczeń Pay-as-you-go.
 * Wyświetla: kwotę należności + liczbę aktywnych pacjentów Premium.
 * Zielona kwota = sukces, szara = brak aktywności.
 */
export function BillingKpiCard({
  organizationId,
  className,
}: BillingKpiCardProps) {
  // Fetch billing status
  const { data, loading, error } = useQuery<GetCurrentBillingStatusResponse>(
    GET_CURRENT_BILLING_STATUS_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  const billingStatus = data?.currentBillingStatus;

  // Loading state - minimalistyczny skeleton
  if (loading) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/60 bg-surface p-5 lg:col-span-3",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
    );
  }

  // Error/no data - nie pokazuj karty
  if (error || !billingStatus) {
    return null;
  }

  const { estimatedTotal, activePatientsInMonth, currency } = billingStatus;
  const hasActivity = activePatientsInMonth > 0;
  const formattedAmount = `${estimatedTotal.toLocaleString("pl-PL")} ${currency}`;

  return (
    <Link
      href="/billing"
      data-testid="dashboard-billing-kpi-card"
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-surface p-5",
        "text-left transition-all duration-300",
        "hover:border-primary/40 hover:bg-surface-light hover:shadow-lg",
        "cursor-pointer lg:col-span-3 flex items-center",
        className
      )}
    >
      <div className="relative flex items-center gap-3 w-full">
        {/* Icon */}
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-all duration-300",
            hasActivity
              ? "bg-emerald-500/10 group-hover:bg-emerald-500/20"
              : "bg-muted-foreground/10 group-hover:bg-muted-foreground/20",
            "group-hover:scale-110"
          )}
        >
          <Wallet
            className={cn(
              "h-5 w-5",
              hasActivity ? "text-emerald-500" : "text-muted-foreground"
            )}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Kwota - zielona gdy > 0, szara gdy 0 */}
          <p
            className={cn(
              "text-lg font-bold tabular-nums transition-colors",
              hasActivity
                ? "text-emerald-500 group-hover:text-emerald-400"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {formattedAmount}
          </p>

          {/* Etykieta - dynamiczna */}
          {hasActivity ? (
            <p className="text-xs text-muted-foreground">
              {activePatientsInMonth} aktywnych Premium
            </p>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Aktywuj pierwszego
            </p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-all group-hover:translate-x-0.5 shrink-0",
            hasActivity
              ? "text-emerald-500/30 group-hover:text-emerald-500"
              : "text-muted-foreground/30 group-hover:text-muted-foreground"
          )}
        />
      </div>
    </Link>
  );
}
