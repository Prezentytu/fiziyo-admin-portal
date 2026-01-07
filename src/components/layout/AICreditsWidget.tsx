"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { Sparkles, Zap, ArrowRight } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GET_AI_CREDITS_STATUS } from "@/graphql/queries/aiCredits.queries";

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

export function AICreditsWidget({ isCollapsed }: AICreditsWidgetProps) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  const { data, loading, error } = useQuery<{
    aiCreditsStatus: AICreditsStatus;
  }>(GET_AI_CREDITS_STATUS, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId,
    errorPolicy: "ignore",
  });

  const credits = data?.aiCreditsStatus;

  // Don't show widget if no data or error (backend not ready)
  if (error || loading || !credits) {
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

  const total = credits.monthlyLimit + credits.addonCredits;
  const used = credits.monthlyUsed;
  const remaining = credits.totalRemaining;
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const isLow = percentage >= 80;
  const isEmpty = remaining <= 0;

  // Collapsed version - just icon with tooltip
  if (isCollapsed) {
    return (
      <div className="flex justify-center mb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/billing"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                isEmpty
                  ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                  : isLow
                  ? "bg-warning/20 text-warning hover:bg-warning/30"
                  : "bg-primary/20 text-primary hover:bg-primary/30"
              )}
            >
              <Sparkles className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            <div className="flex items-center gap-2">
              <span>Kredyty AI: {remaining}/{total}</span>
              {isEmpty && <span className="text-destructive">(brak)</span>}
              {isLow && !isEmpty && <span className="text-warning">(mało)</span>}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded version - full widget
  return (
    <div className="mx-3 mb-3">
      <Link
        href="/billing"
        className={cn(
          "group block rounded-xl border p-3 transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-0.5",
          isEmpty
            ? "border-destructive/40 bg-destructive/10 hover:border-destructive/60 hover:shadow-destructive/20"
            : isLow
            ? "border-warning/40 bg-warning/10 hover:border-warning/60 hover:shadow-warning/20"
            : "border-primary/40 bg-primary/10 hover:border-primary/60 hover:shadow-primary/20"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-lg",
                isEmpty
                  ? "bg-destructive/20"
                  : isLow
                  ? "bg-warning/20"
                  : "bg-primary/20"
              )}
            >
              <Sparkles
                className={cn(
                  "h-3.5 w-3.5",
                  isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-primary"
                )}
              />
            </div>
            <span className="text-xs font-semibold text-foreground">Kredyty AI</span>
          </div>
          <ArrowRight
            className={cn(
              "h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0",
              isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-primary"
            )}
          />
        </div>

        {/* Progress bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface mb-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              isEmpty
                ? "bg-destructive"
                : isLow
                ? "bg-warning"
                : "bg-primary"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          {/* Shimmer effect for low credits */}
          {isLow && !isEmpty && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-foreground"
            )}
          >
            {remaining}
            <span className="text-muted-foreground font-normal">/{total}</span>
          </span>

          {isEmpty ? (
            <span className="text-[10px] font-medium text-destructive flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Doładuj
            </span>
          ) : isLow ? (
            <span className="text-[10px] text-warning">Mało kredytów</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">pozostało</span>
          )}
        </div>
      </Link>
    </div>
  );
}

