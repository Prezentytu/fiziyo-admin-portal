"use client";

import { useQuery } from "@apollo/client/react";
import { Trophy, Flame, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { GET_REVIEWER_STATS_QUERY } from "@/graphql/queries/adminExercises.queries";
import type { GetReviewerStatsResponse } from "@/graphql/types/adminExercise.types";

interface ReviewerAchievementsProps {
  className?: string;
  /** If true, component returns null when user has no review history (total === 0) */
  showOnlyIfHasHistory?: boolean;
  /** Display variant: "full" for card layout, "compact" for inline header */
  variant?: "full" | "compact";
}

/**
 * Komponent "Twoje Wpływy" - gamifikacja dla recenzentów
 * Wyświetla statystyki weryfikacji zalogowanego użytkownika
 *
 * Warianty:
 * - full: Pełna karta z 4 kolumnami (domyślny)
 * - compact: Inline element do nagłówka strony
 */
export function ReviewerAchievements({
  className,
  showOnlyIfHasHistory = false,
  variant = "full",
}: ReviewerAchievementsProps) {
  const { data, loading, error } = useQuery<GetReviewerStatsResponse>(GET_REVIEWER_STATS_QUERY);

  // Compact variant - loading state
  if (loading && variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  // Full variant - loading state
  if (loading) {
    return (
      <Card className={cn("border-border/60 bg-surface", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.reviewerStats) {
    return null; // Silently fail - not critical
  }

  const stats = data.reviewerStats;

  // Hide component if user has no history and showOnlyIfHasHistory is true
  if (showOnlyIfHasHistory && stats.total === 0) {
    return null;
  }

  // COMPACT VARIANT - Inline element for header
  if (variant === "compact") {
    // Don't show if no history
    if (stats.total === 0) {
      return null;
    }

    return (
      <div
        data-testid="reviewer-achievements-compact"
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "bg-surface/50 border border-border/40",
          "text-sm",
          className
        )}
      >
        <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-foreground font-medium">{stats.total}</span>
        <span className="text-muted-foreground">zweryfikowanych</span>

        {stats.currentStreak > 0 && (
          <>
            <span className="text-border/60">•</span>
            <Flame className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-orange-500 font-medium">{stats.currentStreak}</span>
            <span className="text-muted-foreground hidden sm:inline">
              {stats.currentStreak === 1 ? "dzień" : "dni"}
            </span>
          </>
        )}
      </div>
    );
  }

  // FULL VARIANT - Card layout (default)
  return (
    <Card
      className={cn(
        "border-border/60 bg-gradient-to-br from-surface via-surface to-surface-light",
        className
      )}
      data-testid="reviewer-achievements-card"
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <h3 className="font-semibold text-foreground">Twoje Wpływy</h3>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          {/* Total */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{stats.total}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Łącznie</p>
          </div>

          {/* Approved */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{stats.totalApproved}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Zatwierdzone</p>
          </div>

          {/* Rejected */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-500">{stats.totalRejected}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Odrzucone</p>
          </div>

          {/* Streak */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Flame className={cn("h-4 w-4", stats.currentStreak > 0 ? "text-orange-500" : "text-muted-foreground")} />
              <span className={cn(
                "text-2xl font-bold",
                stats.currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"
              )}>
                {stats.currentStreak}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {stats.currentStreak === 1 ? "dzień" : stats.currentStreak > 1 && stats.currentStreak < 5 ? "dni" : "dni"} z rzędu
            </p>
          </div>
        </div>

        {/* Streak message */}
        {stats.currentStreak >= 3 && (
          <div className="mt-4 flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="h-4 w-4 text-orange-500 shrink-0" />
            <p className="text-xs text-orange-200">
              🔥 Świetna passa! {stats.currentStreak} dni aktywnej weryfikacji!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
