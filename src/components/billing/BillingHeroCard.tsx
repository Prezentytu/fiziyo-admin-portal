"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { CreditCard, Users, Tag, FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GET_CURRENT_BILLING_STATUS_QUERY } from "@/graphql/queries/billing.queries";
import type { GetCurrentBillingStatusResponse } from "@/types/apollo";

// ========================================
// Types
// ========================================

interface BillingHeroCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Helper Functions
// ========================================

function formatPolishMonthYear(month: number, year: number): string {
  const months = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  return `${months[month - 1]} ${year}`;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ========================================
// Component
// ========================================

export function BillingHeroCard({ organizationId, className }: BillingHeroCardProps) {
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
      formattedAmount: formatCurrency(estimatedTotal),
    };
  }, [billingStatus]);

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6",
          className
        )}
        data-testid="billing-hero-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-48 bg-zinc-800" />
            <Skeleton className="h-12 w-40 bg-zinc-800" />
            <Skeleton className="h-4 w-32 bg-zinc-800" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-36 bg-zinc-800 rounded-xl" />
            <Skeleton className="h-10 w-36 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !displayData) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6",
          className
        )}
        data-testid="billing-hero-card"
      >
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
            <CreditCard className="h-6 w-6 text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-400">
            Nie udało się pobrać danych rozliczeniowych
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {error?.message || "Spróbuj ponownie później"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10",
        className
      )}
      data-testid="billing-hero-card"
    >
      {/* Subtle glow effect */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-cyan-500" />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left side - Main amount */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">
                Bieżące Rozliczenie
              </h2>
              <Badge variant="secondary" className="gap-1.5 bg-zinc-800 text-zinc-300 border-0">
                <Calendar className="h-3 w-3" />
                {displayData.period}
              </Badge>
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <p
                    className="text-4xl sm:text-5xl font-bold text-white tabular-nums tracking-tight"
                    data-testid="billing-hero-amount"
                  >
                    {displayData.formattedAmount}
                    <span className="text-xl sm:text-2xl text-zinc-400 ml-2">
                      {displayData.currency}
                    </span>
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">
                  Należność jest estymowana i może się zmienić do końca miesiąca
                  w zależności od liczby aktywowanych licencji Premium.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <p className="text-sm text-zinc-500">
            Należność netto • Faktura 01.{String(billingStatus?.month || 1).padStart(2, '0')}.{(billingStatus?.year || 2026) + (billingStatus?.month === 12 ? 1 : 0)}
          </p>
        </div>

        {/* Right side - Stats pills */}
        <div className="flex flex-wrap gap-3">
          {/* Active patients pill */}
          <div className="flex items-center gap-3 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/20">
              <Users className="h-4 w-4 text-info" />
            </div>
            <div>
              <p
                className="text-xl font-bold text-white tabular-nums"
                data-testid="billing-hero-patients"
              >
                {displayData.activePatients}
              </p>
              <p className="text-xs text-zinc-400">Aktywnych Pacjentów</p>
            </div>
          </div>

          {/* Price per license pill */}
          <div className="flex items-center gap-3 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
              <Tag className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white tabular-nums">
                {displayData.pricePerPatient} {displayData.currency}
              </p>
              <p className="text-xs text-zinc-400">Stawka / Licencja</p>
            </div>
          </div>

          {/* Proforma button */}
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 px-4 rounded-xl border-zinc-700 bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
            data-testid="billing-hero-proforma-btn"
          >
            <FileText className="h-4 w-4 mr-2" />
            Pobierz proformę
          </Button>
        </div>
      </div>
    </div>
  );
}
