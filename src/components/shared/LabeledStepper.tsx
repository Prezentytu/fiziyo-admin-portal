'use client';

import { Info, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNumericDraft } from '@/hooks/useNumericDraft';

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
  readonly infoTooltip?: string;
  readonly infoTestId?: string;
  /** Additive field-specific test id for the value input (legacy `stepper-input` stays). */
  readonly inputTestId?: string;
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
  infoTooltip,
  infoTestId,
  inputTestId,
}: LabeledStepperProps) {
  const {
    draftValue,
    setDraftValue,
    increment,
    decrement,
    handleBlur,
    handleFocus,
    handleKeyDown,
    canIncrement,
    canDecrement,
  } = useNumericDraft({
    value,
    onCommit: onChange,
    min,
    max,
    step,
    parseMode: 'int',
  });

  const valueText = draftValue || String(value);
  const valueWidthCh = Math.max(valueText.length, 1);

  return (
    <div
      className={cn('flex w-[76px] flex-col items-center group', className)}
      data-testid="labeled-stepper"
    >
      <div className="inline-flex h-8 w-full items-stretch">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || !canDecrement}
          data-stepper-control
          className={cn(
            'flex w-7 shrink-0 items-center justify-center rounded-l-lg transition-all cursor-pointer',
            'bg-surface-light/80 border border-r-0 border-border/40',
            'text-muted-foreground/70 hover:text-foreground hover:bg-surface-light',
            'active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-light/35 disabled:text-muted-foreground/35 disabled:hover:bg-surface-light/35',
            '!focus:outline-none !focus:ring-0 !focus-visible:outline-none !focus-visible:ring-0'
          )}
          data-testid="stepper-decrement"
        >
          <Minus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        </button>

        <div className="flex h-full min-w-0 flex-1 items-center justify-center border-y border-border/40 bg-surface/80 px-1">
          <div className="flex h-full items-center justify-center gap-0.5 leading-none">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              data-stepper-input
              size={valueWidthCh}
              style={{ width: `${valueWidthCh}ch` }}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className={cn(
                'h-full w-auto min-w-0 bg-transparent text-center font-bold text-sm text-foreground tabular-nums cursor-text',
                'outline-none border-0 p-0 leading-none',
                'focus:bg-transparent !focus:outline-none !focus:ring-0 !focus:ring-offset-0 !focus-visible:outline-none !focus-visible:ring-0 !focus-visible:ring-offset-0',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
              )}
              data-testid={inputTestId ?? 'stepper-input'}
            />
            {suffix ? (
              <span className="shrink-0 text-sm font-medium leading-none tabular-nums text-muted-foreground/60">
                {suffix}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={disabled || !canIncrement}
          data-stepper-control
          className={cn(
            'flex w-7 shrink-0 items-center justify-center rounded-r-lg transition-all cursor-pointer',
            'bg-surface-light/80 border border-l-0 border-border/40',
            'text-muted-foreground/70 hover:text-foreground hover:bg-surface-light',
            'active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-light/35 disabled:text-muted-foreground/35 disabled:hover:bg-surface-light/35',
            '!focus:outline-none !focus:ring-0 !focus-visible:outline-none !focus-visible:ring-0'
          )}
          data-testid="stepper-increment"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-1.5 grid h-4 w-full grid-cols-[1fr_auto_1fr] items-center">
        <span className="col-start-2 whitespace-nowrap text-center text-[10px] font-bold uppercase leading-none tracking-wider text-muted-foreground/50 transition-colors group-hover:text-muted-foreground/80">
          {label}
        </span>
        {infoTooltip ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="col-start-3 ml-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center justify-self-start rounded-full text-muted-foreground/50 transition-colors hover:text-foreground"
                  aria-label={`Informacja o polu: ${label}`}
                  data-testid={infoTestId}
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {infoTooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  );
}
