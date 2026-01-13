"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { Bot, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GET_AI_CREDITS_STATUS } from "@/graphql/queries/aiCredits.queries";

// ========================================
// Types
// ========================================

interface FairUsageCardProps {
  organizationId?: string;
  className?: string;
}

interface AICreditsStatus {
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  addonCredits: number;
  totalRemaining: number;
  resetDate: string;
}

// ========================================
// Component
// ========================================

export function FairUsageCard({ organizationId, className }: FairUsageCardProps) {
  // Fetch AI credits status
  const { data, loading, error } = useQuery<{ aiCreditsStatus: AICreditsStatus }>(
    GET_AI_CREDITS_STATUS,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "ignore",
    }
  );

  const credits = data?.aiCreditsStatus;

  // Calculate usage status
  const usageStatus = useMemo(() => {
    if (!credits) return null;

    const totalCapacity = credits.monthlyLimit + credits.addonCredits;
    const used = credits.monthlyUsed;
    const usagePercent = totalCapacity > 0 ? (used / totalCapacity) * 100 : 0;

    // Status thresholds
    const isWarning = usagePercent >= 70 && usagePercent < 90;
    const isCritical = usagePercent >= 90;
    const isSafe = usagePercent < 70;

    return {
      used,
      total: totalCapacity,
      remaining: credits.totalRemaining,
      percent: Math.min(usagePercent, 100),
      isSafe,
      isWarning,
      isCritical,
    };
  }, [credits]);

  // Loading state - compact
  if (loading) {
    return (
      <Card
        className={cn("border-border/40 bg-surface/50 backdrop-blur-sm", className)}
        data-testid="billing-fair-usage-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error or no data state - show simple placeholder
  if (error || !usageStatus) {
    return (
      <Card
        className={cn("border-border/40 bg-surface/50 backdrop-blur-sm", className)}
        data-testid="billing-fair-usage-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">Status AI</p>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                  Fair Usage
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Funkcje AI wliczone w cenę licencji
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine colors based on status
  const bgColor = usageStatus.isCritical
    ? "bg-destructive/10"
    : usageStatus.isWarning
    ? "bg-warning/10"
    : "bg-primary/10";

  const textColor = usageStatus.isCritical
    ? "text-destructive"
    : usageStatus.isWarning
    ? "text-warning"
    : "text-primary";

  const barColor = usageStatus.isCritical
    ? "bg-destructive"
    : usageStatus.isWarning
    ? "bg-warning"
    : "bg-primary";

  return (
    <Card
      className={cn("border-border/40 bg-surface/50 backdrop-blur-sm", className)}
      data-testid="billing-fair-usage-card"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", bgColor)}>
            <Bot className={cn("h-4 w-4", textColor)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-sm font-medium text-foreground">Status AI</p>
              <Badge variant="secondary" className={cn("border-0 text-xs", bgColor, textColor)}>
                Fair Usage
              </Badge>
            </div>

            {/* Progress bar - thinner, more modern */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: `${usageStatus.percent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                {usageStatus.used}/{usageStatus.total}
              </span>
            </div>
          </div>

          {/* Status icon */}
          {usageStatus.isSafe ? (
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          ) : (
            <AlertTriangle className={cn("h-5 w-5 shrink-0", textColor)} />
          )}
        </div>

        {/* Warning message if needed */}
        {(usageStatus.isWarning || usageStatus.isCritical) && (
          <p className={cn("text-xs mt-2 pl-12", textColor)}>
            {usageStatus.isCritical
              ? "Zbliżasz się do limitu. Rozważ optymalizację."
              : "Umiarkowane zużycie. Monitoruj użycie."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
