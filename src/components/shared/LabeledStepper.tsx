"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabeledStepperProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
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
    if (val === "") {
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

  return (
    <div className={cn("flex flex-col items-center group", className)}>
      {/* Controls */}
      <div className="flex items-center">
        {/* Minus */}
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          className={cn(
            "w-7 h-8 flex items-center justify-center rounded-l-lg transition-all",
            "bg-surface-light/80 border border-r-0 border-border/40",
            "text-muted-foreground/70 hover:text-foreground hover:bg-surface-light",
            "active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-surface-light/80"
          )}
          data-testid="stepper-decrement"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Value */}
        <div className="relative h-8 border-y border-border/40 bg-surface/80">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={handleInputChange}
            disabled={disabled}
            className={cn(
              "w-10 h-full bg-transparent text-center font-bold text-sm text-foreground",
              "outline-none border-0 tabular-nums",
              "focus:bg-surface",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              suffix && "pr-3"
            )}
            data-testid="stepper-input"
          />
          {suffix && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 font-medium pointer-events-none">
              {suffix}
            </span>
          )}
        </div>

        {/* Plus */}
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          className={cn(
            "w-7 h-8 flex items-center justify-center rounded-r-lg transition-all",
            "bg-surface-light/80 border border-l-0 border-border/40",
            "text-muted-foreground/70 hover:text-foreground hover:bg-surface-light",
            "active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-surface-light/80"
          )}
          data-testid="stepper-increment"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Label */}
      <span className="text-[9px] uppercase font-bold text-muted-foreground/40 tracking-wider mt-1 group-hover:text-muted-foreground/70 transition-colors whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
