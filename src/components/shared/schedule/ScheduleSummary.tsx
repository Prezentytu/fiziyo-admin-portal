'use client';

import { Calendar, Clock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  calculateScheduleSummary,
  calculateStartInDays,
  pluralizeDay,
  type ScheduleFrequencyLike,
} from '@/features/assignment/utils/scheduleSummaryUtils';

type ScheduleSummaryVariant = 'compact' | 'card' | 'inline-highlight';

interface ScheduleSummaryProps {
  readonly startDate: Date | string;
  readonly endDate: Date | string;
  readonly frequency: ScheduleFrequencyLike;
  readonly variant?: ScheduleSummaryVariant;
  readonly showSessions?: boolean;
  readonly showFlexibleHint?: boolean;
  readonly showStartInDays?: boolean;
  readonly className?: string;
  readonly testIdPrefix?: string;
}

export function ScheduleSummary({
  startDate,
  endDate,
  frequency,
  variant = 'compact',
  showSessions,
  showFlexibleHint = true,
  showStartInDays = true,
  className,
  testIdPrefix = 'schedule',
}: ScheduleSummaryProps) {
  const summary = calculateScheduleSummary({ startDate, endDate, frequency });
  const shouldShowSessions = showSessions ?? variant !== 'compact';
  const daysToStart = showStartInDays ? calculateStartInDays(startDate) : 0;

  if (variant === 'inline-highlight') {
    return (
      <div
        className={cn(
          'bg-surface border border-border/60 rounded-xl p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm',
          className
        )}
        data-testid={`${testIdPrefix}-schedule-summary`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 bg-surface-light rounded-full flex items-center justify-center shrink-0 border border-border/40">
            <Info className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Podsumowanie planu
            </div>
            <div className="text-base font-semibold text-foreground" data-testid={`${testIdPrefix}-schedule-sessions`}>
              {summary.durationDays} {pluralizeDay(summary.durationDays)}
              {shouldShowSessions && (
                <>
                  <span className="text-muted-foreground/30 mx-1.5">•</span>~{summary.totalSessions} sesji
                </>
              )}
            </div>
          </div>
        </div>
        {showStartInDays && daysToStart > 0 && (
          <div className="text-xs text-muted-foreground bg-surface-light px-3 py-1.5 rounded-lg font-medium whitespace-nowrap border border-border/40">
            Start za {daysToStart} {pluralizeDay(daysToStart)}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn('bg-surface border border-border/60 rounded-xl p-4 sm:p-5', className)}
        data-testid={`${testIdPrefix}-schedule-summary`}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm" data-testid={`${testIdPrefix}-schedule-dates`}>
            <span className="text-muted-foreground">Start:</span>
            <span className="text-foreground font-mono">{format(summary.startDate, 'dd.MM.yyyy', { locale: pl })}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Koniec:</span>
            <span className="text-foreground font-mono">{format(summary.endDate, 'dd.MM.yyyy', { locale: pl })}</span>
          </div>

          <div className="w-full h-px bg-border/50 my-2" />

          <div className="flex items-center gap-2 text-xs text-info bg-info/10 p-2.5 rounded-lg border border-info/20">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span data-testid={`${testIdPrefix}-schedule-sessions`}>
              {summary.durationDays} dni • {summary.effectiveWeeklyFrequency}× w tyg. • {summary.timesPerDay}× dziennie
              {shouldShowSessions && <> • ~{summary.totalSessions} sesji</>}
            </span>
          </div>

          {!summary.isFlexibleMode && summary.dayLabels && (
            <div className="text-xs text-muted-foreground">
              Dni: <span className="text-foreground">{summary.dayLabels.join(', ')}</span>
            </div>
          )}

          {showFlexibleHint && summary.isFlexibleMode && (
            <div className="text-xs text-muted-foreground">Pacjent sam wybierze dni ćwiczeń</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}
      data-testid={`${testIdPrefix}-schedule-summary`}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 wrap-anywhere" data-testid={`${testIdPrefix}-schedule-dates`}>
          {format(summary.startDate, 'dd.MM.yyyy', { locale: pl })}–
          {format(summary.endDate, 'dd.MM.yyyy', { locale: pl })}
        </span>
      </span>
      <span className="min-w-0 wrap-anywhere">
        {summary.durationDays} dni • {summary.effectiveWeeklyFrequency}×/tyg
        {shouldShowSessions && <> • ~{summary.totalSessions} sesji</>}
      </span>
    </div>
  );
}
