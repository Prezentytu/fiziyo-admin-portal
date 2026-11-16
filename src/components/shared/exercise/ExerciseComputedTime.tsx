'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ComputedExerciseTimeLabels } from './computedExerciseTime';

const TOTAL_TOOLTIP = 'Wartość wyliczana: wszystkie serie + przerwy + przygotowanie. Nieedytowalna.';
const SERIES_TOOLTIP = 'Wartość wyliczana: powtórzenia × czas powtórzenia + mikroprzerwy. Nieedytowalna.';

function TimeInfo({ label, testId }: Readonly<{ label: string; testId: string }>) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`Informacja: ${label}`}
            data-testid={testId}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Czas wyliczany w podglądzie i w edycji parametrów: czas ćwiczenia jest wartością główną,
 * czas jednej serii pomocniczą linią pod nim (wcześniej dwa równe kafle myliły się ze sobą).
 */
export function ExerciseComputedTime({
  times,
  testIdPrefix,
}: Readonly<{ times: ComputedExerciseTimeLabels; testIdPrefix: string }>) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3 shadow-sm" data-testid={`${testIdPrefix}-computed-time`}>
      <div className="flex items-center justify-between gap-3" data-testid={`${testIdPrefix}-total-time`}>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          Czas ćwiczenia (wyliczany)
          <TimeInfo label={TOTAL_TOOLTIP} testId={`${testIdPrefix}-total-time-info`} />
        </span>
        <span className="text-lg font-bold leading-tight tabular-nums text-foreground">{times.total ?? '—'}</span>
      </div>
      <div
        className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground"
        data-testid={`${testIdPrefix}-series-time`}
      >
        <span className="flex items-center gap-1">
          Jedna seria
          <TimeInfo label={SERIES_TOOLTIP} testId={`${testIdPrefix}-series-time-info`} />
        </span>
        <span className="tabular-nums">{times.series ?? '—'}</span>
      </div>
    </div>
  );
}
