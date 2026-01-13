"use client";

import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { Wallet, ChevronRight } from "lucide-react";
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
 * Wyświetla tylko: kwotę należności + liczbę aktywnych pacjentów.
 * Całość jest linkiem do /billing.
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
          <Wallet className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-foreground tabular-nums group-hover:text-primary transition-colors">
            {formattedAmount}
          </p>
          <p className="text-xs text-muted-foreground">
            {activePatientsInMonth} aktywnych pacjentów
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}
