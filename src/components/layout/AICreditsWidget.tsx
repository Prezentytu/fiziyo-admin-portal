"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { Sparkles, Zap, TrendingUp } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GET_AI_CREDITS_STATUS } from "@/graphql/queries/aiCredits.queries";
import { PurchaseCreditsDialog } from "@/components/shared/PurchaseCreditsDialog";

interface AICreditsStatus {
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  addonCredits: number;
  totalRemaining: number;
  resetDate: string;
}

interface AICreditsWidgetProps {
  isCollapsed: boolean;
}

// Próg "niskiego stanu" - poniżej 20% lub poniżej 50 kredytów
const LOW_THRESHOLD_PERCENT = 20;
const LOW_THRESHOLD_ABSOLUTE = 50;

export function AICreditsWidget({ isCollapsed }: AICreditsWidgetProps) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery<{
    aiCreditsStatus: AICreditsStatus;
  }>(GET_AI_CREDITS_STATUS, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId,
    errorPolicy: "ignore",
  });

  // Nasłuchuj na event 'ai-credits-changed' i odśwież dane
  useEffect(() => {
    const handleCreditsChanged = () => {
      if (organizationId) {
        refetch();
      }
    };

    window.addEventListener('ai-credits-changed', handleCreditsChanged);
    return () => window.removeEventListener('ai-credits-changed', handleCreditsChanged);
  }, [organizationId, refetch]);

  const credits = data?.aiCreditsStatus;

  // Oblicz stan kredytów - bazujemy na tym ILE ZOSTAŁO, nie ile zużyto
  const creditState = useMemo(() => {
    if (!credits) return null;

    const total = credits.monthlyLimit + credits.addonCredits;
    const remaining = credits.totalRemaining;

    // Procent DOSTĘPNYCH kredytów (nie zużytych)
    const availablePercent = total > 0 ? (remaining / total) * 100 : 0;

    // Niski stan = poniżej 20% LUB poniżej 50 kredytów absolutnie
    const isLow = remaining > 0 && (availablePercent < LOW_THRESHOLD_PERCENT || remaining < LOW_THRESHOLD_ABSOLUTE);
    const isEmpty = remaining <= 0;

    // Formatowanie daty resetu
    const resetDate = new Date(credits.resetDate);
    const now = new Date();
    const daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      total,
      remaining,
      availablePercent,
      isLow,
      isEmpty,
      monthlyRemaining: credits.monthlyRemaining,
      addonCredits: credits.addonCredits,
      daysUntilReset: Math.max(0, daysUntilReset),
    };
  }, [credits]);

  // Don't show widget if no data or error (backend not ready)
  if (error || loading || !creditState) {
    // Show placeholder only in expanded mode
    if (!isCollapsed && !error) {
      return (
        <div className="mx-3 mb-3">
          <div className="rounded-xl border border-border/40 bg-surface-light/30 p-3 animate-pulse">
            <div className="h-4 bg-surface-light rounded w-20 mb-2" />
            <div className="h-2 bg-surface-light rounded w-full" />
          </div>
        </div>
      );
    }
    return null;
  }

  const { remaining, availablePercent, isLow, isEmpty, monthlyRemaining, addonCredits, daysUntilReset } = creditState;

  // Collapsed version - just icon with tooltip
  if (isCollapsed) {
    return (
      <>
        <div className="flex justify-center mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsPurchaseDialogOpen(true)}
                data-testid="ai-credits-widget-collapsed-btn"
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                  "hover:scale-110 active:scale-95",
                  isEmpty
                    ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                    : isLow
                    ? "bg-warning/20 text-warning hover:bg-warning/30"
                    : "bg-primary/20 text-primary hover:bg-primary/30"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{remaining}</span>
                  <span className="text-muted-foreground">kredytów dostępnych</span>
                </div>
                {isEmpty ? (
                  <span className="text-xs text-destructive">Brak kredytów - doładuj!</span>
                ) : isLow ? (
                  <span className="text-xs text-warning">Niski stan - rozważ doładowanie</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Kliknij aby doładować</span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <PurchaseCreditsDialog
          isOpen={isPurchaseDialogOpen}
          onClose={() => setIsPurchaseDialogOpen(false)}
          organizationId={organizationId}
        />
      </>
    );
  }

  // Expanded version - full widget (clickable)
  return (
    <>
      <div className="mx-3 mb-3">
        <button
          onClick={() => setIsPurchaseDialogOpen(true)}
          data-testid="ai-credits-widget-btn"
          className={cn(
            "group w-full text-left rounded-xl border p-3 transition-all duration-200",
            "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
            {
              "border-destructive/40 bg-destructive/10 hover:border-destructive/60 hover:shadow-destructive/20": isEmpty,
              "border-warning/40 bg-warning/10 hover:border-warning/60 hover:shadow-warning/20": isLow && !isEmpty,
              "border-primary/40 bg-primary/10 hover:border-primary/60 hover:shadow-primary/20": !isLow && !isEmpty,
            }
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  {
                    "bg-destructive/20": isEmpty,
                    "bg-warning/20": isLow && !isEmpty,
                    "bg-primary/20": !isLow && !isEmpty,
                  }
                )}
              >
                <Sparkles
                  className={cn("h-4 w-4", {
                    "text-destructive": isEmpty,
                    "text-warning": isLow && !isEmpty,
                    "text-primary": !isLow && !isEmpty,
                  })}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Kredyty AI</span>
                <span className="text-[10px] text-muted-foreground">
                  Reset za {daysUntilReset} {daysUntilReset === 1 ? "dzień" : "dni"}
                </span>
              </div>
            </div>

            {/* Przycisk doładuj - zawsze widoczny */}
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-200",
                {
                  "bg-destructive/20 text-destructive": isEmpty,
                  "bg-warning/20 text-warning": isLow && !isEmpty,
                  "bg-primary/20 text-primary opacity-0 group-hover:opacity-100": !isLow && !isEmpty,
                }
              )}
            >
              <Zap className="h-3 w-3" />
              Doładuj
            </div>
          </div>

          {/* Główna liczba - ile DOSTĘPNYCH */}
          <div className="flex items-baseline gap-1 mb-2">
            <span
              className={cn("text-2xl font-bold tabular-nums", {
                "text-destructive": isEmpty,
                "text-warning": isLow && !isEmpty,
                "text-foreground": !isLow && !isEmpty,
              })}
            >
              {remaining}
            </span>
            <span className="text-sm text-muted-foreground">dostępnych</span>
          </div>

          {/* Progress bar - pokazuje stan DOSTĘPNYCH (pełny = dużo) */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface/60 mb-2">
            <div
              className={cn("h-full rounded-full transition-all duration-500 ease-out", {
                "bg-destructive": isEmpty,
                "bg-warning": isLow && !isEmpty,
                "bg-primary": !isLow && !isEmpty,
              })}
              style={{ width: `${Math.min(availablePercent, 100)}%` }}
            />
          </div>

          {/* Breakdown - skąd masz kredyty */}
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground/80">{monthlyRemaining}</span> z planu
              </span>
              {addonCredits > 0 && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="font-medium text-primary">{addonCredits}</span> dokupione
                </span>
              )}
            </div>
          </div>

          {/* Alert dla niskiego stanu */}
          {(isEmpty || isLow) && (
            <div
              className={cn(
                "mt-2 pt-2 border-t flex items-center gap-1.5 text-[10px]",
                {
                  "border-destructive/30 text-destructive": isEmpty,
                  "border-warning/30 text-warning": isLow && !isEmpty,
                }
              )}
            >
              <Zap className="h-3 w-3" />
              {isEmpty ? "Brak kredytów - doładuj aby kontynuować" : "Rozważ doładowanie"}
            </div>
          )}
        </button>
      </div>

      <PurchaseCreditsDialog
        isOpen={isPurchaseDialogOpen}
        onClose={() => setIsPurchaseDialogOpen(false)}
        organizationId={organizationId}
      />
    </>
  );
}
