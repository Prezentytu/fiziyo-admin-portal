"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { Trophy, Target, Zap, Crown, Star, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GET_COMMISSION_TIER_INFO_QUERY } from "@/graphql/queries";
import type { GetCommissionTierInfoResponse } from "@/types/apollo";
import {
  CommissionTier,
  COMMISSION_TIERS,
  formatPercent,
} from "@/types/revenue.types";
import { cn } from "@/lib/utils";

// ========================================
// Types
// ========================================

interface CommissionTierCardProps {
  organizationId?: string;
  className?: string;
}

// ========================================
// Tier Badge Component
// ========================================

function TierBadge({
  tier,
  rate,
  isActive,
  isCurrent,
}: {
  tier: CommissionTier;
  rate: number;
  isActive: boolean;
  isCurrent: boolean;
}) {
  const config = COMMISSION_TIERS[tier];

  const Icon =
    tier === "ELITE"
      ? Crown
      : tier === "EXPERT"
        ? Star
        : tier === "PRO"
          ? Zap
          : Trophy;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300",
        isCurrent
          ? `bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} text-white shadow-lg`
          : isActive
            ? "bg-surface-light border border-border/60"
            : "bg-muted/30 opacity-50"
      )}
    >
      <Icon className={cn("h-4 w-4", isCurrent ? "text-white" : "text-muted-foreground")} />
      <span className={cn("text-xs font-bold", isCurrent ? "text-white" : "text-foreground")}>
        {tier}
      </span>
      <span className={cn("text-[10px]", isCurrent ? "text-white/80" : "text-muted-foreground")}>
        {formatPercent(rate)}
      </span>
      {isCurrent && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

// ========================================
// Main Component
// ========================================

export function CommissionTierCard({
  organizationId,
  className,
}: CommissionTierCardProps) {
  // Fetch tier info
  const { data, loading, error } = useQuery<GetCommissionTierInfoResponse>(
    GET_COMMISSION_TIER_INFO_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  const tierInfo = data?.commissionTierInfo;

  // Calculate progress
  const progressData = useMemo(() => {
    if (!tierInfo) return null;

    const currentTier = tierInfo.tier as CommissionTier;
    const currentConfig = COMMISSION_TIERS[currentTier];

    // Calculate progress to next tier
    let progressPercent = 0;
    let progressToNext = tierInfo.progressToNextTier || 0;
    let nextTierName = "";
    let nextTierRate = tierInfo.nextTierRate;

    if (currentTier === "START" && tierInfo.nextTierThreshold) {
      const startMin = COMMISSION_TIERS.START.minSubscribers;
      const proMin = COMMISSION_TIERS.PRO.minSubscribers;
      progressPercent = Math.min(
        100,
        ((tierInfo.activeSubscribers - startMin) / (proMin - startMin)) * 100
      );
      nextTierName = "PRO";
    } else if (currentTier === "PRO" && tierInfo.nextTierThreshold) {
      const proMin = COMMISSION_TIERS.PRO.minSubscribers;
      const expertMin = COMMISSION_TIERS.EXPERT.minSubscribers;
      progressPercent = Math.min(
        100,
        ((tierInfo.activeSubscribers - proMin) / (expertMin - proMin)) * 100
      );
      nextTierName = "EXPERT";
    } else if (currentTier === "EXPERT" && tierInfo.nextTierThreshold) {
      const expertMin = COMMISSION_TIERS.EXPERT.minSubscribers;
      const eliteMin = COMMISSION_TIERS.ELITE.minSubscribers;
      progressPercent = Math.min(
        100,
        ((tierInfo.activeSubscribers - expertMin) / (eliteMin - expertMin)) *
          100
      );
      nextTierName = "ELITE";
    } else if (currentTier === "ELITE" || currentTier === "PARTNER") {
      progressPercent = 100;
      progressToNext = 0;
    }

    return {
      currentTier,
      currentConfig,
      progressPercent: Math.max(0, progressPercent),
      progressToNext,
      nextTierName,
      nextTierRate,
      activeSubscribers: tierInfo.activeSubscribers,
      commissionRate: tierInfo.commissionRate,
      isPartner: tierInfo.isPartner,
    };
  }, [tierInfo]);

  // Loading state
  if (loading) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-full" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error or no data
  if (error || !progressData) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Nie udało się pobrać danych o prowizji
          </p>
        </CardContent>
      </Card>
    );
  }

  // Partner tier - special display
  if (progressData.isPartner) {
    return (
      <Card
        className={cn(
          "border-primary/30 bg-gradient-to-br from-surface to-primary/5",
          className
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-primary" />
            Twój Poziom Prowizji
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Partner Badge */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-white">
            <Crown className="h-8 w-8" />
            <div>
              <p className="font-bold text-lg">PARTNER</p>
              <p className="text-sm text-white/80">
                Stała prowizja: {formatPercent(progressData.commissionRate)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {progressData.activeSubscribers} aktywnych subskrybentów
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border/60 hover:border-primary/30 transition-colors",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-primary" />
          Twój Poziom Prowizji
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current tier highlight */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "px-3 py-1 font-bold text-white border-0",
                `bg-gradient-to-r ${progressData.currentConfig.gradientFrom} ${progressData.currentConfig.gradientTo}`
              )}
            >
              {progressData.currentTier}
            </Badge>
            <span className="text-lg font-bold text-foreground">
              {formatPercent(progressData.commissionRate)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{progressData.activeSubscribers} pacjentów</span>
          </div>
        </div>

        {/* Progress bar with animation */}
        {progressData.progressToNext > 0 && progressData.nextTierName && (
          <>
            <div className="space-y-2">
              <Progress
                value={progressData.progressPercent}
                className="h-3 bg-muted animate-in slide-in-from-left duration-700"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {progressData.currentTier}
                </span>
                <span className="text-muted-foreground">
                  {progressData.nextTierName}
                </span>
              </div>
            </div>

            {/* Motivational message */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <div className="text-sm text-foreground">
                🎯 Brakuje Ci{" "}
                <span className="font-bold text-primary">
                  {progressData.progressToNext} pacjentów
                </span>{" "}
                do poziomu{" "}
                <Badge variant="outline" className="ml-1 border-primary/30">
                  {progressData.nextTierName}
                </Badge>
                {progressData.nextTierRate && (
                  <span className="text-muted-foreground">
                    {" "}
                    (+
                    {Math.round(
                      (progressData.nextTierRate - progressData.commissionRate) *
                        100
                    )}
                    % prowizji!)
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* ELITE tier reached */}
        {progressData.currentTier === "ELITE" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Crown className="h-5 w-5 text-violet-500 shrink-0" />
            <div className="text-sm text-foreground">
              🎉 Gratulacje! Osiągnąłeś najwyższy poziom{" "}
              <span className="font-bold text-violet-500">ELITE</span>!
            </div>
          </div>
        )}

        {/* Tier badges row */}
        <div className="grid grid-cols-4 gap-2">
          <TierBadge
            tier="START"
            rate={COMMISSION_TIERS.START.rate}
            isActive={true}
            isCurrent={progressData.currentTier === "START"}
          />
          <TierBadge
            tier="PRO"
            rate={COMMISSION_TIERS.PRO.rate}
            isActive={
              progressData.activeSubscribers >=
              COMMISSION_TIERS.PRO.minSubscribers
            }
            isCurrent={progressData.currentTier === "PRO"}
          />
          <TierBadge
            tier="EXPERT"
            rate={COMMISSION_TIERS.EXPERT.rate}
            isActive={
              progressData.activeSubscribers >=
              COMMISSION_TIERS.EXPERT.minSubscribers
            }
            isCurrent={progressData.currentTier === "EXPERT"}
          />
          <TierBadge
            tier="ELITE"
            rate={COMMISSION_TIERS.ELITE.rate}
            isActive={
              progressData.activeSubscribers >=
              COMMISSION_TIERS.ELITE.minSubscribers
            }
            isCurrent={progressData.currentTier === "ELITE"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
