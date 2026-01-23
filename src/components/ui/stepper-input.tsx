"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperInputProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  suffix?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/**
 * StepperInput - Premium Minimal Design
 * 
 * Clean, precise controls with subtle interactions.
 */
const StepperInput = React.forwardRef<HTMLDivElement, StepperInputProps>(
  (
    {
      value,
      onChange,
      step = 1,
      min = 0,
      max = 999,
      label,
      suffix,
      disabled = false,
      className,
      size = "md",
    },
    ref
  ) => {
    const handleDecrement = React.useCallback(() => {
      if (disabled) return;
      const newValue = Math.max(min, value - step);
      onChange(newValue);
    }, [value, step, min, onChange, disabled]);

    const handleIncrement = React.useCallback(() => {
      if (disabled) return;
      const newValue = Math.min(max, value + step);
      onChange(newValue);
    }, [value, step, max, onChange, disabled]);

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(parsed)) {
          const clamped = Math.max(min, Math.min(max, parsed));
          onChange(clamped);
        }
      },
      [min, max, onChange]
    );

    const isSmall = size === "sm";
    const buttonSize = isSmall ? "w-7 h-7" : "w-8 h-8";
    const inputSize = isSmall ? "w-12 h-8" : "w-14 h-10";
    const fontSize = isSmall ? "text-base font-bold" : "text-lg font-bold";
    const iconSize = "w-4 h-4";

    return (
      <div ref={ref} className={cn("flex flex-col items-center shrink-0 group/stepper", className)}>
        {/* Controls Row */}
        <div className="flex items-center gap-0.5">
          {/* Minus Button */}
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className={cn(
              "flex items-center justify-center rounded-md transition-all touch-manipulation",
              buttonSize,
              "text-muted-foreground/60 hover:text-foreground hover:bg-surface-light/80 active:scale-95",
              "disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100"
            )}
            aria-label="Zmniejsz"
            data-testid="stepper-decrement"
          >
            <Minus className={iconSize} strokeWidth={2} />
          </button>

          {/* Value Input */}
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={value}
              onChange={handleInputChange}
              disabled={disabled}
              className={cn(
                "bg-surface-light/80 border border-border/40 rounded-md text-center font-semibold text-foreground transition-all",
                "focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:outline-none focus:bg-surface",
                "hover:border-border/60",
                inputSize,
                fontSize,
                suffix && "pr-4",
                disabled && "opacity-40 cursor-not-allowed",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              )}
              data-testid="stepper-input"
            />
            {/* Suffix */}
            {suffix && (
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 font-medium pointer-events-none">
                {suffix}
              </span>
            )}
          </div>

          {/* Plus Button */}
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className={cn(
              "flex items-center justify-center rounded-md transition-all touch-manipulation",
              buttonSize,
              "text-muted-foreground/60 hover:text-foreground hover:bg-surface-light/80 active:scale-95",
              "disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100"
            )}
            aria-label="Zwiększ"
            data-testid="stepper-increment"
          >
            <Plus className={iconSize} strokeWidth={2} />
          </button>
        </div>

        {/* Label */}
        {label && (
          <span className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider mt-1.5 group-hover/stepper:text-muted-foreground transition-colors">
            {label}
          </span>
        )}
      </div>
    );
  }
);

StepperInput.displayName = "StepperInput";

export { StepperInput };
export type { StepperInputProps };
