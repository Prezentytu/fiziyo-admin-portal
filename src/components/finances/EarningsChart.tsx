"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GET_MONTHLY_EARNINGS_SUMMARY_QUERY } from "@/graphql/queries";
import type { GetMonthlyEarningsSummaryResponse } from "@/types/apollo";
import { formatCurrency } from "@/types/revenue.types";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface EarningsChartProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Helper Functions
// ========================================

const MONTH_NAMES_SHORT = [
  "Sty",
  "Lut",
  "Mar",
  "Kwi",
  "Maj",
  "Cze",
  "Lip",
  "Sie",
  "Wrz",
  "Paź",
  "Lis",
  "Gru",
];

function getMonthName(month: number): string {
  return MONTH_NAMES_SHORT[month - 1] || "";
}

// ========================================
// Component
// ========================================

export function EarningsChart({
  organizationId,
  className,
}: EarningsChartProps) {
  // Fetch 12 months of earnings data
  const { data, loading, error } =
    useQuery<GetMonthlyEarningsSummaryResponse>(
      GET_MONTHLY_EARNINGS_SUMMARY_QUERY,
      {
        variables: { organizationId: organizationId || "", months: 12 },
        skip: !organizationId,
        errorPolicy: "all",
      }
    );

  // Process chart data
  const chartData = useMemo(() => {
    const summary = data?.monthlyEarningsSummary || [];

    if (summary.length === 0) return null;

    // Find max value for scaling
    const maxEarnings = Math.max(...summary.map((m) => m.earnings), 1);

    // Calculate trend (compare last month to previous)
    const lastMonth = summary[summary.length - 1]?.earnings || 0;
    const prevMonth = summary[summary.length - 2]?.earnings || 0;
    const trend = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

    // Calculate total
    const totalEarnings = summary.reduce((sum, m) => sum + m.earnings, 0);

    return {
      months: summary.map((m) => ({
        label: getMonthName(m.month),
        year: m.year,
        earnings: m.earnings,
        subscribers: m.subscriberCount,
        heightPercent: (m.earnings / maxEarnings) * 100,
      })),
      maxEarnings,
      trend,
      totalEarnings,
    };
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-zinc-900/50 p-6",
          className
        )}
      >
        <Skeleton className="h-5 w-40 bg-zinc-800 mb-6" />
        <div className="flex items-end gap-2 h-48">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 bg-zinc-800"
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error or no data
  if (error || !chartData) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-zinc-900/50 p-6",
          className
        )}
      >
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-zinc-500" />
          <h3 className="text-lg font-semibold text-white">Historia Zarobków</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <BarChart3 className="h-8 w-8 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500">
            {error ? "Nie udało się pobrać danych" : "Brak danych o zarobkach"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-zinc-900/50 p-6",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Historia Zarobków</h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Trend badge */}
            {chartData.trend !== 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs border-0",
                  chartData.trend > 0
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                {chartData.trend > 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {chartData.trend > 0 ? "+" : ""}
                {chartData.trend.toFixed(0)}% m/m
              </Badge>
            )}
            {/* Total */}
            <span className="text-sm text-zinc-400">
              Suma:{" "}
              <span className="font-medium text-white">
                {formatCurrency(chartData.totalEarnings)}
              </span>
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex items-end gap-1 sm:gap-2 h-48">
          {chartData.months.map((month, index) => (
            <Tooltip key={`${month.year}-${month.label}`}>
              <TooltipTrigger asChild>
                <div className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                  {/* Bar */}
                  <div className="relative w-full flex flex-col items-center">
                    {/* Bar element with gradient */}
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-all duration-300",
                        month.earnings > 0
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 group-hover:shadow-lg group-hover:shadow-emerald-500/20"
                          : "bg-zinc-800"
                      )}
                      style={{
                        height: `${Math.max(month.heightPercent, 2)}%`,
                        minHeight: month.earnings > 0 ? "8px" : "4px",
                      }}
                    />
                  </div>

                  {/* Month label */}
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs transition-colors",
                      index === chartData.months.length - 1
                        ? "font-medium text-white"
                        : "text-zinc-500 group-hover:text-zinc-300"
                    )}
                  >
                    {month.label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-zinc-800 border-zinc-700"
              >
                <div className="text-center">
                  <p className="font-bold text-white">
                    {formatCurrency(month.earnings)}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {month.subscribers} pacjentów
                  </p>
                  <p className="text-xs text-zinc-500">
                    {month.label} {month.year}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400" />
            <span>Zarobki (prowizje)</span>
          </div>
          <span className="text-zinc-700">|</span>
          <span>Ostatnie 12 miesięcy</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
