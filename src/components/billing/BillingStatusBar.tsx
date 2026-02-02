"use client";

import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { Wallet, ChevronRight, Sparkles, Gift } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GET_CURRENT_BILLING_STATUS_QUERY } from "@/graphql/queries/billing.queries";
import type { GetCurrentBillingStatusResponse } from "@/types/apollo";

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
 * Wyświetlany na dole dashboardu, działa jako separator i link do /billing.
 */
export function BillingStatusBar({
  organizationId,
  className,
}: BillingStatusBarProps) {
  const { data, loading, error } = useQuery<GetCurrentBillingStatusResponse>(
    GET_CURRENT_BILLING_STATUS_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  const billingStatus = data?.currentBillingStatus;

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/40 bg-surface/50 backdrop-blur-sm p-4",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
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
  const formattedAmount = `${displayAmount.toLocaleString("pl-PL")} ${currency}`;

  return (
    <Link
      href="/billing"
      data-testid="dashboard-billing-status-bar"
      className={cn(
        "group block rounded-xl border border-border/40 bg-surface/50 backdrop-blur-sm",
        "p-4 transition-all duration-300",
        "hover:border-primary/30 hover:bg-surface-light hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Label */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300",
              hasActivity
                ? "bg-emerald-500/10 group-hover:bg-emerald-500/20"
                : "bg-muted-foreground/10 group-hover:bg-muted-foreground/15"
            )}
          >
            <Wallet
              className={cn(
                "h-4.5 w-4.5",
                hasActivity ? "text-emerald-500" : "text-muted-foreground"
              )}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Bieżące rozliczenie
          </span>
        </div>

        {/* Right side - Stats */}
        <div className="flex items-center gap-4">
          {/* Active patients count */}
          {hasActivity ? (
            <span className="text-sm text-muted-foreground">
              {activeCount} {activeCount === 1 ? "aktywny" : "aktywnych"}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Aktywuj pierwszego
            </span>
          )}

          {/* Pilot mode badge */}
          {isPilotMode && hasActivity && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-xs"
            >
              <Gift className="h-3 w-3" />
              Wczesny dostęp
            </Badge>
          )}

          {/* Amount */}
          <span
            className={cn(
              "text-base font-bold tabular-nums transition-colors",
              isPilotMode
                ? "text-amber-500 group-hover:text-amber-400"
                : hasActivity
                  ? "text-emerald-500 group-hover:text-emerald-400"
                  : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {formattedAmount}
          </span>

          {/* Arrow */}
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-all group-hover:translate-x-0.5",
              hasActivity
                ? "text-emerald-500/40 group-hover:text-emerald-500"
                : "text-muted-foreground/40 group-hover:text-muted-foreground"
            )}
          />
        </div>
      </div>
    </Link>
  );
}
