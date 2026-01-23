"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CleanInputProps {
  value: number | string | undefined;
  onChange: (value: number | undefined) => void;
  label: string;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
}

/**
 * CleanInput - Ghost Input (Linear Style)
 * 
 * Przezroczysty input wyglądający jak tekst.
 * Edytowalny po kliknięciu, z subtelną linią na hover/focus.
 */
const CleanInput = React.forwardRef<HTMLInputElement, CleanInputProps>(
  (
    {
      value,
      onChange,
      label,
      suffix = "",
      placeholder = "-",
      disabled = false,
      className,
      min = 0,
      max = 999,
    },
    ref
  ) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === "" || val === "-") {
          onChange(undefined);
          return;
        }
        const parsed = Number.parseInt(val, 10);
        if (!Number.isNaN(parsed)) {
          const clamped = Math.max(min, Math.min(max, parsed));
          onChange(clamped);
        }
      },
      [min, max, onChange]
    );

    const displayValue = value === undefined || value === null ? "" : String(value);

    return (
      <div className={cn("flex flex-col items-center group", className)}>
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={cn(
              "w-14 bg-transparent text-center font-bold text-xl text-foreground",
              "placeholder-muted-foreground/30 outline-none",
              "border-b-2 border-transparent",
              "hover:border-border/50 focus:border-primary",
              "transition-colors duration-200 pb-0.5",
              "tabular-nums",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              disabled && "opacity-40 cursor-not-allowed pointer-events-none"
            )}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            data-testid={`clean-input-${label.toLowerCase().replaceAll(/[^a-z]/g, "")}`}
          />
          {suffix && displayValue && (
            <span className="absolute -right-1 top-1/2 -translate-y-[55%] text-[10px] text-muted-foreground/60 font-medium pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase font-semibold text-muted-foreground/50 tracking-widest mt-1.5 group-hover:text-muted-foreground transition-colors">
          {label}
        </span>
      </div>
    );
  }
);

CleanInput.displayName = "CleanInput";

export { CleanInput };
export type { CleanInputProps };
