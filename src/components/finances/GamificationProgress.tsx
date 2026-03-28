'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Trophy, Zap, Star, Crown, Users, Target, CircleHelp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GET_COMMISSION_TIER_INFO_QUERY, GET_CURRENT_BILLING_STATUS_QUERY } from '@/graphql/queries';
import type { GetCommissionTierInfoResponse, GetCurrentBillingStatusResponse } from '@/types/apollo';
import { CommissionTier, COMMISSION_TIERS, formatPercent } from '@/types/revenue.types';
import { cn } from '@/lib/utils';

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

export function GamificationProgress({ organizationId, className }: GamificationProgressProps) {
  // Fetch tier info (Revenue Share)
  const { data, loading, error } = useQuery<GetCommissionTierInfoResponse>(GET_COMMISSION_TIER_INFO_QUERY, {
    variables: { organizationId: organizationId || '' },
    skip: !organizationId,
    errorPolicy: 'all',
  });

  // Fetch billing status (Pay-as-you-go / Pilot Mode) - for premium patient count
  const { data: billingData } = useQuery<GetCurrentBillingStatusResponse>(GET_CURRENT_BILLING_STATUS_QUERY, {
    variables: { organizationId: organizationId || '' },
    skip: !organizationId,
    errorPolicy: 'all',
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
    const progressPercent = Math.min(100, (activeSubscribers / maxScale) * 100);

    // Create tier markers
    const tierMarkers: TierMarker[] = [
      {
        tier: 'START',
        position: 0,
        rate: COMMISSION_TIERS.START.rate,
        reached: true,
        minSubscribers: 0,
      },
      {
        tier: 'PRO',
        position: (COMMISSION_TIERS.PRO.minSubscribers / maxScale) * 100,
        rate: COMMISSION_TIERS.PRO.rate,
        reached: activeSubscribers >= COMMISSION_TIERS.PRO.minSubscribers,
        minSubscribers: COMMISSION_TIERS.PRO.minSubscribers,
      },
      {
        tier: 'EXPERT',
        position: (COMMISSION_TIERS.EXPERT.minSubscribers / maxScale) * 100,
        rate: COMMISSION_TIERS.EXPERT.rate,
        reached: activeSubscribers >= COMMISSION_TIERS.EXPERT.minSubscribers,
        minSubscribers: COMMISSION_TIERS.EXPERT.minSubscribers,
      },
      {
        tier: 'ELITE',
        position: (COMMISSION_TIERS.ELITE.minSubscribers / maxScale) * 100,
        rate: COMMISSION_TIERS.ELITE.rate,
        reached: activeSubscribers >= COMMISSION_TIERS.ELITE.minSubscribers,
        minSubscribers: COMMISSION_TIERS.ELITE.minSubscribers,
      },
    ];

    // Calculate progress to next tier
    let progressToNext = tierInfo.progressToNextTier || 0;
    let nextTierName = '';
    let nextTierRate = tierInfo.nextTierRate;
    let isCloseToNextTier = false;

    if (currentTier === 'START') {
      const proMin = COMMISSION_TIERS.PRO.minSubscribers;
      progressToNext = proMin - activeSubscribers;
      nextTierName = 'PRO';
      nextTierRate = COMMISSION_TIERS.PRO.rate;
      isCloseToNextTier = progressToNext <= 10;
    } else if (currentTier === 'PRO') {
      const expertMin = COMMISSION_TIERS.EXPERT.minSubscribers;
      progressToNext = expertMin - activeSubscribers;
      nextTierName = 'EXPERT';
      nextTierRate = COMMISSION_TIERS.EXPERT.rate;
      isCloseToNextTier = progressToNext <= 20;
    } else if (currentTier === 'EXPERT') {
      const eliteMin = COMMISSION_TIERS.ELITE.minSubscribers;
      progressToNext = eliteMin - activeSubscribers;
      nextTierName = 'ELITE';
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
      <div className={cn('rounded-2xl border border-border/60 bg-surface shadow-sm p-6 h-full', className)}>
        <Skeleton className="h-6 w-48 bg-surface-elevated mb-5" />
        <Skeleton className="h-4 w-full bg-surface-elevated mb-4" />
        <Skeleton className="h-24 w-full bg-surface-elevated" />
      </div>
    );
  }

  // Error or no data
  if (error || !progressData) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-border/60 bg-surface p-6 h-full flex items-center justify-center shadow-sm',
          className
        )}
      >
        <div className="text-center">
          <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nie udało się pobrać danych</p>
        </div>
      </div>
    );
  }

  if (progressData.isPartner) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-emerald-500/20 bg-surface p-6 h-full shadow-sm',
          className
        )}
        data-testid="finances-partner-level-card"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Crown className="h-5 w-5 text-emerald-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Poziom partnerski</h3>
        </div>
        <div className="flex items-center gap-5 p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <Crown className="h-10 w-10 text-emerald-500" />
          <div>
            <p className="text-2xl font-bold text-foreground tracking-tight">PARTNER</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Osiągnięty najwyższy poziom ze stałym udziałem {formatPercent(progressData.commissionRate)}.
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
        className={cn('rounded-2xl border border-border/60 bg-surface shadow-sm p-6 h-full flex flex-col', className)}
        data-testid="finances-partner-progress-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated border border-border/60">
              <Trophy className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-foreground">Poziom partnerski</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    data-testid="finances-partner-progress-helper-copy"
                    aria-label="Wyjaśnienie poziomu partnerskiego"
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  Poziom i udział rosną wraz z liczbą aktywnych pacjentów Premium.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-surface-light px-2.5 py-1 rounded-md border border-border/50">
            <Users className="h-3.5 w-3.5" />
            <span>
              {progressData.activeSubscribers} {progressData.activeSubscribers === 1 ? 'aktywny pacjent' : 'aktywnych pacjentów'}
            </span>
          </div>
        </div>
        {/* Current tier badge */}
        <div className="flex items-end gap-3 mb-6 mt-1">
          <span className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none">
            {formatPercent(progressData.commissionRate)}
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 mb-0.5">
            <CurrentIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary tracking-wide uppercase">{progressData.currentTier}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 bg-surface-elevated rounded-full overflow-visible mb-6 mt-auto">
          {/* Fill with gradient */}
          <div
            className={cn(
              'h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(91,184,154,0.3)]',
              progressData.isCloseToNextTier && 'animate-pulse'
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
                      'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-transform hover:scale-110',
                      marker.tier === 'START' && 'left-0 translate-x-0'
                    )}
                    style={{
                      left: marker.tier === 'START' ? 0 : `${marker.position}%`,
                    }}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                        marker.reached
                          ? 'bg-primary border-surface shadow-md'
                          : 'bg-surface-elevated border-surface'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', marker.reached ? 'text-primary-foreground' : 'text-muted-foreground')} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="border-border bg-surface-elevated text-foreground">
                  <div className="text-center">
                    <p className="font-semibold">{marker.tier}</p>
                    <p className="text-sm text-primary">Twój udział: {formatPercent(marker.rate)}</p>
                    <p className="text-xs text-muted-foreground">
                      {marker.minSubscribers > 0 ? `od ${marker.minSubscribers} pacjentów` : 'Start'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Tier labels below bar */}
        <div className="flex justify-between text-[10px] font-medium text-muted-foreground mb-6 px-1 tracking-wider uppercase">
          <span>START</span>
          <span>PRO</span>
          <span>EXPERT</span>
          <span>ELITE</span>
        </div>

        {/* Motivational Callout */}
        {progressData.progressToNext > 0 && progressData.nextTierName && (
          <div
            className={cn(
              'p-3.5 rounded-xl border transition-all mt-auto',
              progressData.isCloseToNextTier
                ? 'bg-primary/5 border-primary/20 animate-pulse'
                : 'bg-surface-light/50 border-border/50'
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn("p-1.5 rounded-lg bg-surface", progressData.isCloseToNextTier ? "text-primary" : "text-muted-foreground")}>
                <Target className="h-4 w-4" />
              </div>
              <p className="text-foreground text-xs sm:text-sm">
                Jeszcze tylko{' '}
                <span className="font-bold text-primary">
                  {progressData.progressToNext} {progressData.progressToNext === 1 ? 'pacjent' : 'pacjentów'}
                </span>{' '}
                do <span className="font-bold">{progressData.nextTierName}</span>
                {progressData.nextTierRate && (
                  <span className="text-muted-foreground ml-1">
                    (+{Math.round((progressData.nextTierRate - progressData.commissionRate) * 100)}%)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ELITE reached */}
        {progressData.currentTier === 'ELITE' && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <p className="text-foreground text-sm">
                Osiągnięto najwyższy poziom <span className="font-semibold text-primary">ELITE</span> z maksymalnym udziałem.
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
