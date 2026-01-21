"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { Trophy, Zap, Star, Crown, Users, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GET_COMMISSION_TIER_INFO_QUERY, GET_CURRENT_BILLING_STATUS_QUERY } from "@/graphql/queries";
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

interface GamificationProgressProps {
  organizationId?: string;
  className?: string;
}

interface TierMarker {
  tier: CommissionTier;
  position: number;
  rate: number;
  reached: boolean;
  minSubscribers: number;
}

// ========================================
// Constants
// ========================================

const TIER_ICONS = {
  START: Trophy,
  PRO: Zap,
  EXPERT: Star,
  ELITE: Crown,
  PARTNER: Crown,
} as const;

// ========================================
// Component
// ========================================

export function GamificationProgress({
  organizationId,
  className,
}: GamificationProgressProps) {
  // Fetch tier info (Revenue Share)
  const { data, loading, error } = useQuery<GetCommissionTierInfoResponse>(
    GET_COMMISSION_TIER_INFO_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId,
      errorPolicy: "all",
    }
  );

  // Fetch billing status (Pay-as-you-go / Pilot Mode) - for premium patient count
  const { data: billingData } = useQuery(GET_CURRENT_BILLING_STATUS_QUERY, {
    variables: { organizationId: organizationId || "" },
    skip: !organizationId,
    errorPolicy: "all",
  });

  const tierInfo = data?.commissionTierInfo;
  const billing = billingData?.currentBillingStatus;
  
  // Use the higher count from either source (billing premium or revenue subscribers)
  const premiumPatientCount = billing?.currentlyActivePremium ?? 0;

  // Calculate progress and markers
  const progressData = useMemo(() => {
    if (!tierInfo) return null;

    const currentTier = tierInfo.tier as CommissionTier;
    // Use max of billing premium patients and revenue subscribers
    const activeSubscribers = Math.max(tierInfo.activeSubscribers, premiumPatientCount);

    // Max subscribers for scale (ELITE threshold + some buffer)
    const maxScale = COMMISSION_TIERS.ELITE.minSubscribers + 100; // 400

    // Calculate position percentage based on subscribers
    const progressPercent = Math.min(
      100,
      (activeSubscribers / maxScale) * 100
    );

    // Create tier markers
    const tierMarkers: TierMarker[] = [
      {
        tier: "START",
        position: 0,
        rate: COMMISSION_TIERS.START.rate,
        reached: true,
        minSubscribers: 0,
      },
      {
        tier: "PRO",
        position: (COMMISSION_TIERS.PRO.minSubscribers / maxScale) * 100,
        rate: COMMISSION_TIERS.PRO.rate,
        reached: activeSubscribers >= COMMISSION_TIERS.PRO.minSubscribers,
        minSubscribers: COMMISSION_TIERS.PRO.minSubscribers,
      },
      {
        tier: "EXPERT",
        position: (COMMISSION_TIERS.EXPERT.minSubscribers / maxScale) * 100,
        rate: COMMISSION_TIERS.EXPERT.rate,
        reached: activeSubscribers >= COMMISSION_TIERS.EXPERT.minSubscribers,
        minSubscribers: COMMISSION_TIERS.EXPERT.minSubscribers,
      },
      {
        tier: "ELITE",
        position: (COMMISSION_TIERS.ELITE.minSubscribers / maxScale) * 100,
        rate: COMMISSION_TIERS.ELITE.rate,
        reached: activeSubscribers >= COMMISSION_TIERS.ELITE.minSubscribers,
        minSubscribers: COMMISSION_TIERS.ELITE.minSubscribers,
      },
    ];

    // Calculate progress to next tier
    let progressToNext = tierInfo.progressToNextTier || 0;
    let nextTierName = "";
    let nextTierRate = tierInfo.nextTierRate;
    let isCloseToNextTier = false;

    if (currentTier === "START") {
      const proMin = COMMISSION_TIERS.PRO.minSubscribers;
      progressToNext = proMin - activeSubscribers;
      nextTierName = "PRO";
      nextTierRate = COMMISSION_TIERS.PRO.rate;
      isCloseToNextTier = progressToNext <= 10;
    } else if (currentTier === "PRO") {
      const expertMin = COMMISSION_TIERS.EXPERT.minSubscribers;
      progressToNext = expertMin - activeSubscribers;
      nextTierName = "EXPERT";
      nextTierRate = COMMISSION_TIERS.EXPERT.rate;
      isCloseToNextTier = progressToNext <= 20;
    } else if (currentTier === "EXPERT") {
      const eliteMin = COMMISSION_TIERS.ELITE.minSubscribers;
      progressToNext = eliteMin - activeSubscribers;
      nextTierName = "ELITE";
      nextTierRate = COMMISSION_TIERS.ELITE.rate;
      isCloseToNextTier = progressToNext <= 50;
    }

    return {
      currentTier,
      progressPercent,
      tierMarkers,
      activeSubscribers,
      commissionRate: tierInfo.commissionRate,
      progressToNext: Math.max(0, progressToNext),
      nextTierName,
      nextTierRate,
      isCloseToNextTier,
      isPartner: tierInfo.isPartner,
    };
  }, [tierInfo, premiumPatientCount]);

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-zinc-900/50 p-6 h-full",
          className
        )}
      >
        <Skeleton className="h-5 w-40 bg-zinc-800 mb-6" />
        <Skeleton className="h-4 w-full bg-zinc-800 mb-4" />
        <Skeleton className="h-20 w-full bg-zinc-800" />
      </div>
    );
  }

  // Error or no data
  if (error || !progressData) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-zinc-900/50 p-6 h-full flex items-center justify-center",
          className
        )}
      >
        <div className="text-center">
          <Trophy className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Nie udało się pobrać danych</p>
        </div>
      </div>
    );
  }

  // Partner tier - special display
  if (progressData.isPartner) {
    return (
      <div
        className={cn(
          "rounded-xl border border-emerald-500/20 bg-gradient-to-br from-zinc-900 to-emerald-950/20 p-6 h-full",
          className
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Crown className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Status Partnera</h3>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Crown className="h-10 w-10 text-emerald-400" />
          <div>
            <p className="text-2xl font-bold text-white">PARTNER</p>
            <p className="text-sm text-zinc-400">
              Stały udział: {formatPercent(progressData.commissionRate)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const CurrentIcon = TIER_ICONS[progressData.currentTier];

  return (
    <TooltipProvider>
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-zinc-900/50 p-6 h-full",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">
              Twój Poziom Partnerski
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Users className="h-4 w-4" />
            <span>{progressData.activeSubscribers} {progressData.activeSubscribers === 1 ? "pacjent" : "pacjentów"}</span>
          </div>
        </div>

        {/* Current tier badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500">
            <CurrentIcon className="h-4 w-4 text-white" />
            <span className="font-bold text-white">
              {progressData.currentTier}
            </span>
          </div>
          <span className="text-2xl font-bold text-white">
            {formatPercent(progressData.commissionRate)}
          </span>
        </div>

        {/* RPG Progress Bar */}
        <div className="relative h-4 bg-zinc-800 rounded-full overflow-visible mb-4">
          {/* Fill with gradient */}
          <div
            className={cn(
              "h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out",
              progressData.isCloseToNextTier && "animate-pulse"
            )}
            style={{ width: `${progressData.progressPercent}%` }}
          />

          {/* Tier markers */}
          {progressData.tierMarkers.map((marker) => {
            const Icon = TIER_ICONS[marker.tier];
            return (
              <Tooltip key={marker.tier}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-transform hover:scale-125",
                      marker.tier === "START" && "left-0 translate-x-0"
                    )}
                    style={{
                      left: marker.tier === "START" ? 0 : `${marker.position}%`,
                    }}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors",
                        marker.reached
                          ? "bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30"
                          : "bg-zinc-700 border-zinc-600"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5",
                          marker.reached ? "text-white" : "text-zinc-400"
                        )}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-zinc-800 border-zinc-700">
                  <div className="text-center">
                    <p className="font-bold text-white">{marker.tier}</p>
                    <p className="text-sm text-emerald-400">
                      Twój udział: {formatPercent(marker.rate)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {marker.minSubscribers > 0
                        ? `od ${marker.minSubscribers} pacjentów`
                        : "Start"}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Tier labels below bar */}
        <div className="flex justify-between text-xs text-zinc-500 mb-6">
          <span>START</span>
          <span>PRO</span>
          <span>EXPERT</span>
          <span>ELITE</span>
        </div>

        {/* Motivational Callout */}
        {progressData.progressToNext > 0 && progressData.nextTierName && (
          <div
            className={cn(
              "p-4 rounded-lg border transition-all",
              progressData.isCloseToNextTier
                ? "bg-emerald-500/10 border-emerald-500/30 animate-pulse"
                : "bg-zinc-800/50 border-white/5"
            )}
          >
            <div className="flex items-center gap-2">
              <Target
                className={cn(
                  "h-5 w-5 shrink-0",
                  progressData.isCloseToNextTier
                    ? "text-emerald-400"
                    : "text-zinc-400"
                )}
              />
              <p className="text-white">
                Jeszcze tylko{" "}
                <span className="font-bold text-emerald-400">
                  {progressData.progressToNext} {progressData.progressToNext === 1 ? "pacjent" : "pacjentów"}
                </span>{" "}
                do{" "}
                <span className="font-bold text-white">
                  {progressData.nextTierName}
                </span>
                {progressData.nextTierRate && (
                  <span className="text-zinc-400">
                    {" "}
                    (+
                    {Math.round(
                      (progressData.nextTierRate - progressData.commissionRate) *
                        100
                    )}
                    % udziału!)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ELITE reached */}
        {progressData.currentTier === "ELITE" && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-violet-400" />
              <p className="text-white">
                🎉 Gratulacje! Osiągnąłeś najwyższy poziom{" "}
                <span className="font-bold text-violet-400">ELITE</span>!
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
