'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabeledStepperProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly label: string;
  readonly suffix?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly disabled?: boolean;
  readonly className?: string;
}

/**
 * LabeledStepper - Kompaktowy stepper z labelem
 *
 * Minimalistyczny design z przyciskami +/- i labelem pod spodem.
 * Idealny do edycji parametrów ćwiczeń (serie, powtórzenia, czas).
 */
export function LabeledStepper({
  value,
  onChange,
  label,
  suffix,
  min = 0,
  max = 999,
  step = 1,
  disabled = false,
  className,
}: LabeledStepperProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(min);
      return;
    }
    const parsed = Number.parseInt(val, 10);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const increment = () => {
    if (disabled) return;
    const newVal = Math.min(max, value + step);
    onChange(newVal);
  };

  const decrement = () => {
    if (disabled) return;
    const newVal = Math.max(min, value - step);
    onChange(newVal);
  };

  const valueText = String(value);
  const valueWidthCh = Math.max(valueText.length, 1);

  return (
    <div
      className={cn('flex flex-col items-center justify-center group', className)}
      data-testid="labeled-stepper"
    >
      {/* Controls row: height used by parent for alignment (label ignored for vertical center) */}
      <div className="flex items-stretch h-8">
        {/* Minus */}
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          data-stepper-control
          className={cn(
            'w-7 flex items-center justify-center rounded-l-lg transition-all shrink-0',
            'bg-surface-light/80 border border-r-0 border-border/40',
            'text-muted-foreground/70 hover:text-foreground hover:bg-surface-light',
            'active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-light/35 disabled:text-muted-foreground/35 disabled:hover:bg-surface-light/35',
            '!focus:outline-none !focus:ring-0 !focus-visible:outline-none !focus-visible:ring-0'
          )}
          data-testid="stepper-decrement"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Value + suffix: same baseline, centered; no focus ring on container */}
        <div className="flex items-center justify-center min-w-10 h-full border-y border-border/40 bg-surface/80 px-1 rounded-none [&:has(input:focus)]:ring-0 [&:has(input:focus)]:ring-offset-0">
          <div className="flex items-baseline justify-center gap-0 leading-none">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              data-stepper-input
              size={valueWidthCh}
              style={{ width: `${valueWidthCh}ch` }}
              value={value}
              onChange={handleInputChange}
              disabled={disabled}
              className={cn(
                'w-auto min-w-0 bg-transparent text-right font-bold text-sm text-foreground tabular-nums',
                'outline-none border-0 p-0 leading-none',
                'focus:bg-transparent !focus:outline-none !focus:ring-0 !focus:ring-offset-0 !focus-visible:outline-none !focus-visible:ring-0 !focus-visible:ring-offset-0',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
              )}
              data-testid="stepper-input"
            />
            {suffix && (
              <span className="text-sm text-muted-foreground/60 font-medium tabular-nums shrink-0 leading-none">
                {suffix}
              </span>
            )}
          </div>
        </div>

        {/* Plus */}
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          data-stepper-control
          className={cn(
            'w-7 flex items-center justify-center rounded-r-lg transition-all shrink-0',
            'bg-surface-light/80 border border-l-0 border-border/40',
            'text-muted-foreground/70 hover:text-foreground hover:bg-surface-light',
            'active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-light/35 disabled:text-muted-foreground/35 disabled:hover:bg-surface-light/35',
            '!focus:outline-none !focus:ring-0 !focus-visible:outline-none !focus-visible:ring-0'
          )}
          data-testid="stepper-increment"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Label: fixed height so all steppers in a row align vertically */}
      <span className="text-[9px] uppercase font-bold text-muted-foreground/40 tracking-wider mt-1 min-h-[14px] flex items-center justify-center group-hover:text-muted-foreground/70 transition-colors whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
