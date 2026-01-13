"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Users, UserPlus, ChevronRight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GET_CURRENT_BILLING_STATUS_QUERY } from "@/graphql/queries/billing.queries";
import type { GetCurrentBillingStatusResponse } from "@/types/apollo";

// ========================================
// Types
// ========================================

interface TherapistBillingTableProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Helper Functions
// ========================================

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("pl-PL")} PLN`;
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts.at(-1)?.[0] || ""}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ========================================
// Component
// ========================================

export function TherapistBillingTable({
  organizationId,
  className,
}: TherapistBillingTableProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  // Process therapist data
  const { therapists, totalPatients, totalAmount } = useMemo(() => {
    if (!billingStatus?.therapistBreakdown) {
      return { therapists: [], totalPatients: 0, totalAmount: 0 };
    }

    const sorted = [...billingStatus.therapistBreakdown].sort(
      (a, b) => b.activePatientsCount - a.activePatientsCount
    );

    const total = sorted.reduce((sum, t) => sum + t.activePatientsCount, 0);
    const amount = sorted.reduce((sum, t) => sum + t.estimatedAmount, 0);

    return { therapists: sorted, totalPatients: total, totalAmount: amount };
  }, [billingStatus?.therapistBreakdown]);

  // Loading state
  if (loading) {
    return (
      <Card
        className={cn("border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden", className)}
        data-testid="billing-therapist-table"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !billingStatus) {
    return (
      <Card
        className={cn("border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden", className)}
        data-testid="billing-therapist-table"
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10">
              <TrendingUp className="h-4.5 w-4.5 text-info" />
            </div>
            <span>Efektywność Zespołu</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground text-center py-4">
            Nie udało się pobrać danych
          </p>
        </CardContent>
      </Card>
    );
  }

  // Empty state - styled like Dashboard
  if (therapists.length === 0) {
    return (
      <Card
        className={cn("border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden", className)}
        data-testid="billing-therapist-table"
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10">
              <TrendingUp className="h-4.5 w-4.5 text-info" />
            </div>
            <span>Efektywność Zespołu</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-surface-light flex items-center justify-center mb-3">
              <Users className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Brak danych o zespole
            </p>
            <p className="text-xs text-muted-foreground/70 mb-4 max-w-xs">
              Zaproś terapeutów do organizacji, aby śledzić ich wyniki i efektywność
            </p>
            <Button size="sm" className="h-8 text-xs gap-2">
              <UserPlus className="h-3.5 w-3.5" />
              Zaproś terapeutę
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden", className)}
      data-testid="billing-therapist-table"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-base font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10">
              <TrendingUp className="h-4.5 w-4.5 text-info" />
            </div>
            <span>Efektywność Zespołu</span>
            <Badge variant="secondary" className="ml-1 bg-emerald-500/10 text-emerald-500 font-medium">
              {therapists.length} osób
            </Badge>
          </CardTitle>

          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary border-0 font-semibold"
          >
            Suma: {formatCurrency(totalAmount)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-1">
          {therapists.map((therapist) => {
            const sharePercent = totalPatients > 0
              ? Math.round((therapist.activePatientsCount / totalPatients) * 100)
              : 0;
            const isHovered = hoveredId === therapist.therapistId;

            return (
              <div
                key={therapist.therapistId}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                  isHovered ? "bg-emerald-500/5" : "hover:bg-surface-light"
                )}
                onMouseEnter={() => setHoveredId(therapist.therapistId)}
                onMouseLeave={() => setHoveredId(null)}
                data-testid={`billing-therapist-row-${therapist.therapistId}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar
                    className={cn(
                      "h-10 w-10 ring-2 transition-all",
                      isHovered
                        ? "ring-emerald-500/50"
                        : "ring-border/20 group-hover:ring-primary/30"
                    )}
                  >
                    <AvatarImage src={therapist.therapistImage} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-white text-sm font-medium">
                      {getInitials(therapist.therapistName)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Info + Progress Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p
                      className={cn(
                        "font-medium text-sm truncate transition-colors",
                        isHovered
                          ? "text-emerald-500"
                          : "text-foreground group-hover:text-primary"
                      )}
                    >
                      {therapist.therapistName || "Nieznany"}
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums ml-2">
                      {therapist.activePatientsCount} pac.
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isHovered ? "bg-emerald-500" : "bg-primary"
                        )}
                        style={{ width: `${sharePercent}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums w-8 text-right",
                        isHovered ? "text-emerald-500" : "text-muted-foreground"
                      )}
                    >
                      {sharePercent}%
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums transition-colors",
                      isHovered ? "text-emerald-400" : "text-primary"
                    )}
                  >
                    {formatCurrency(therapist.estimatedAmount)}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-all shrink-0",
                    isHovered
                      ? "text-emerald-500 translate-x-0.5"
                      : "text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5"
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground leading-relaxed mt-4 pt-3 border-t border-border/40">
          Pasek pokazuje udział procentowy terapeuty w całkowitej liczbie aktywnych licencji Premium.
        </p>
      </CardContent>
    </Card>
  );
}
