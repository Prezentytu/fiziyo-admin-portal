'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { RollingNumber, type RollDirection } from '@/components/shared/RollingNumber';
import { cn } from '@/lib/utils';
import { formatSetDurationDelta, splitSetDuration } from '../utils/setDuration';

interface SetDurationStatProps {
  /** Szacowany czas jednej sesji zestawu w sekundach (`estimateSetSeconds`). */
  seconds: number;
  className?: string;
}

/**
 * Czas zestawu w szczegółach zestawu. Po zmianie parametrów cyfry przewijają się
 * w kierunku zmiany, a obok na chwilę pojawia się różnica („+16 s”).
 */
export function SetDurationStat({ seconds, className }: SetDurationStatProps) {
  const [change, setChange] = useState({ seconds, delta: 0, version: 0 });
  if (change.seconds !== seconds) {
    setChange({ seconds, delta: seconds - change.seconds, version: change.version + 1 });
  }

  const { minutes, seconds: rest } = splitSetDuration(seconds);
  const direction: RollDirection = change.delta < 0 ? 'down' : 'up';
  const deltaText = formatSetDurationDelta(change.delta);
  const spoken = rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;

  return (
    <span className={cn('flex flex-col', className)} data-testid="set-detail-duration">
      <span className="relative flex items-baseline gap-1 text-foreground">
        <span className="sr-only" aria-live="polite" data-testid="set-detail-duration-value">
          {`Czas zestawu: ${spoken}`}
        </span>
        <RollingNumber value={minutes} direction={direction} className="text-[28px] font-bold leading-[34px]" />
        <span className="text-[15px] font-semibold text-label-secondary" aria-hidden="true">
          min
        </span>
        <RollingNumber
          value={rest}
          minDigits={2}
          direction={direction}
          className="ml-1 text-[28px] font-bold leading-[34px]"
        />
        <span className="text-[15px] font-semibold text-label-secondary" aria-hidden="true">
          s
        </span>
        {deltaText && (
          <span
            key={change.version}
            aria-hidden="true"
            className="animate-delta-flash ml-2 inline-flex shrink-0 items-center whitespace-nowrap gap-0.5 self-center rounded-full bg-tint-fill/15 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-tint"
            data-testid="set-detail-duration-delta"
          >
            {change.delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {deltaText}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1 text-[13px] text-label-secondary">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        czas zestawu
      </span>
    </span>
  );
}
