"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { CreditCard, TrendingUp, ArrowRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GET_CURRENT_BILLING_STATUS_QUERY } from "@/graphql/queries/billing.queries";
import type { GetCurrentBillingStatusResponse } from "@/types/apollo";

// ========================================
// Types
// ========================================

type BillingVariant = "compact" | "full";

interface BillingSummaryWidgetProps {
  variant: BillingVariant;
  organizationId?: string;
  className?: string;
}

// ========================================
// Helper Functions
// ========================================

/**
 * Formatuje miesiąc i rok w formacie "Styczeń 2026"
 */
function formatPolishMonthYear(month: number, year: number): string {
  const months = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  return `${months[month - 1]} ${year}`;
}

/**
 * Formatuje kwotę w PLN
 */
function formatCurrency(amount: number, currency: string = "PLN"): string {
  return `${amount.toLocaleString("pl-PL")} ${currency}`;
}

// ========================================
// Component
// ========================================

export function BillingSummaryWidget({
  variant,
  organizationId,
  className,
}: BillingSummaryWidgetProps) {
  const isCompact = variant === "compact";

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

  // Calculate display values
  const displayData = useMemo(() => {
    if (!billingStatus) return null;

    const {
      activePatientsInMonth,
      pricePerPatient,
      estimatedTotal,
      currency,
      month,
      year,
    } = billingStatus;

    return {
      activePatients: activePatientsInMonth,
      pricePerPatient,
      totalAmount: estimatedTotal,
      currency,
      period: formatPolishMonthYear(month, year),
      formattedAmount: formatCurrency(estimatedTotal, currency),
    };
  }, [billingStatus]);

  // Loading state
  if (loading) {
    return (
      <Card
        className={cn(
          "border-border/60 bg-surface/50 backdrop-blur-sm",
          className
        )}
        data-testid="billing-summary-widget"
      >
        <CardHeader className={cn(isCompact ? "pb-3" : "pb-4")}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent className={cn(isCompact ? "pt-0 space-y-3" : "pt-0 space-y-4")}>
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !displayData) {
    return (
      <Card
        className={cn(
          "border-border/60 bg-surface/50 backdrop-blur-sm",
          className
        )}
        data-testid="billing-summary-widget"
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="h-12 w-12 rounded-xl bg-surface-light flex items-center justify-center mb-3">
              <CreditCard className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Nie udało się pobrać danych rozliczeniowych
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {error?.message || "Spróbuj ponownie później"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact variant (Dashboard)
  if (isCompact) {
    return (
      <Card
        className={cn(
          "border-border/60 bg-surface/50 backdrop-blur-sm overflow-hidden",
          className
        )}
        data-testid="billing-summary-widget"
      >
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary to-emerald-600" />

        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-4.5 w-4.5 text-primary" />
            </div>
            <span>Rozliczenia bieżącego miesiąca</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Active Patients */}
          <div className="rounded-xl border border-border/40 bg-surface-light/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Aktywni Pacjenci Premium
              </p>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                Licencje
              </Badge>
            </div>
            <p
              className="text-3xl font-bold text-foreground tabular-nums"
              data-testid="billing-active-patients-count"
            >
              {displayData.activePatients}
            </p>
          </div>

          {/* Estimated Amount */}
          <div className="rounded-xl border border-border/40 bg-surface-light/30 p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Należność za okres bieżący
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm text-muted-foreground">
                {displayData.activePatients} × {displayData.pricePerPatient} {displayData.currency}
              </span>
              <span className="text-muted-foreground/60">=</span>
            </div>
            <p
              className="text-3xl font-bold text-primary tabular-nums"
              data-testid="billing-estimated-amount"
            >
              {displayData.formattedAmount}
            </p>
          </div>

          {/* Details button */}
          <Link href="/billing" className="block">
            <Button
              variant="outline"
              className="w-full group border-border/60 hover:border-primary/40 hover:bg-surface-light"
              data-testid="billing-details-btn"
            >
              Zobacz szczegóły
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Full variant (Billing Page)
  return (
    <Card
      className={cn(
        "border-border/60 bg-surface/50 backdrop-blur-sm overflow-hidden",
        className
      )}
      data-testid="billing-summary-widget"
    >
      {/* Gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary to-emerald-600" />

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="block">Rozliczenia Pay-as-you-go</span>
              <span className="text-sm font-normal text-muted-foreground">
                Model: 15 PLN za aktywnego pacjenta Premium
              </span>
            </div>
          </CardTitle>

          {/* Period badge */}
          <Badge variant="secondary" className="gap-1.5">
            <Calendar className="h-3 w-3" />
            {displayData.period}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Active Patients Card */}
          <div className="rounded-xl border border-border/40 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Aktywne licencje
              </p>
            </div>
            <p
              className="text-4xl font-bold text-foreground tabular-nums mb-1"
              data-testid="billing-active-patients-count"
            >
              {displayData.activePatients}
            </p>
            <p className="text-xs text-muted-foreground">
              Pacjentów z dostępem Premium
            </p>
          </div>

          {/* Price per Patient Card */}
          <div className="rounded-xl border border-border/40 bg-surface-light/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Cena za licencję
              </p>
            </div>
            <p className="text-4xl font-bold text-foreground tabular-nums mb-1">
              {displayData.pricePerPatient}
            </p>
            <p className="text-xs text-muted-foreground">
              {displayData.currency} / miesiąc
            </p>
          </div>

          {/* Total Amount Card */}
          <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-emerald-600/5 p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Należność
              </p>
            </div>
            <p
              className="text-4xl font-bold text-primary tabular-nums mb-1"
              data-testid="billing-estimated-amount"
            >
              {displayData.formattedAmount}
            </p>
            <p className="text-xs text-muted-foreground">
              Estymowana kwota na fakturze
            </p>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-4 rounded-lg bg-surface-light/50 border border-border/40 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 <span className="font-medium text-foreground">Należność jest estymowana</span> i może się zmienić do końca miesiąca w zależności od liczby aktywowanych licencji Premium.
            Właściciel organizacji otrzyma fakturę na początku następnego miesiąca.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
