'use client';

import { TrendingUp, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TherapyStatusResult } from '@/lib/therapyStatus';
import type { TherapyTone } from './utils/therapyAdherence';

interface TherapyStatusCardProps {
  statusResult: TherapyStatusResult;
  lastActivityLabel?: string;
  className?: string;
}

const toneConfig: Record<
  TherapyTone,
  {
    borderColor: string;
    bgColor: string;
    iconBg: string;
    iconBorder: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    badgeLabel: string;
    Icon: typeof TrendingUp;
  }
> = {
  positive: {
    borderColor: 'border-success/30',
    bgColor: 'bg-success/5',
    iconBg: 'bg-success/10',
    iconBorder: 'border-success/20',
    iconColor: 'text-success',
    badgeBg: 'bg-success/20',
    badgeText: 'text-success',
    badgeLabel: 'W NORMIE',
    Icon: TrendingUp,
  },
  informative: {
    borderColor: 'border-info/30',
    bgColor: 'bg-info/5',
    iconBg: 'bg-info/10',
    iconBorder: 'border-info/20',
    iconColor: 'text-info',
    badgeBg: 'bg-info/20',
    badgeText: 'text-info',
    badgeLabel: 'MONITORUJ',
    Icon: AlertTriangle,
  },
  caution: {
    borderColor: 'border-warning/30',
    bgColor: 'bg-warning/5',
    iconBg: 'bg-warning/10',
    iconBorder: 'border-warning/20',
    iconColor: 'text-warning',
    badgeBg: 'bg-warning/20',
    badgeText: 'text-warning',
    badgeLabel: 'UWAGA',
    Icon: AlertCircle,
  },
};

export function TherapyStatusCard({ statusResult, lastActivityLabel, className }: Readonly<TherapyStatusCardProps>) {
  const config = toneConfig[statusResult.tone];
  const { Icon } = config;

  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl border border-border bg-surface dark:bg-surface/50 p-6', config.borderColor, className)}
      data-testid="patient-therapy-status-card"
    >
      {/* Background glow */}
      <div className={cn('absolute inset-0 pointer-events-none', config.bgColor)} />

      <div className="relative flex items-start gap-5">
        {/* Status icon - smaller */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
            config.iconBg,
            config.iconBorder
          )}
        >
          <Icon className={cn('h-5 w-5', config.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status Terapii</h3>
            <span
              className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', config.badgeBg, config.badgeText)}
              data-testid="patient-therapy-status-badge"
            >
              {statusResult.badgeLabel || config.badgeLabel}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-2">
            {statusResult.title}
            {lastActivityLabel && (
              <span className="text-lg font-normal text-muted-foreground ml-2">(Ostatnio: {lastActivityLabel})</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{statusResult.description}</p>
        </div>
      </div>
    </div>
  );
}
