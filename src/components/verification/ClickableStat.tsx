"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClickableStatProps {
  /** Aktualna wartość */
  value: number | null;
  /** Etykieta pod wartością */
  label: string;
  /** Jednostka (np. "s" dla sekund) */
  unit?: string;
  /** Minimalna wartość */
  min?: number;
  /** Maksymalna wartość */
  max?: number;
  /** Krok dla slidera */
  step?: number;
  /** Callback przy zapisie */
  onCommit: (value: number | null) => Promise<void>;
  /** Ikona obok wartości */
  icon?: React.ReactNode;
  /** Czy wyłączony */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid dla testów */
  "data-testid"?: string;
}

type StatStatus = "idle" | "hover" | "editing" | "saving" | "error" | "success";

/**
 * ClickableStat - Duża liczba klikalna z edycją inline
 *
 * Widok domyślny: Duża liczba z etykietą
 * Po kliknięciu: Input + Slider
 *
 * Optimistic UI: natychmiast pokazuje nową wartość
 */
export function ClickableStat({
  value,
  label,
  unit,
  min = 0,
  max = 100,
  step = 1,
  onCommit,
  icon,
  disabled = false,
  className,
  "data-testid": testId,
}: ClickableStatProps) {
  const [status, setStatus] = useState<StatStatus>("idle");
  const [editValue, setEditValue] = useState<number | null>(value);
  const [originalValue, setOriginalValue] = useState<number | null>(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external value
  useEffect(() => {
    if (status === "idle") {
      setEditValue(value);
      setOriginalValue(value);
    }
  }, [value, status]);

  const handleStartEdit = useCallback(() => {
    if (disabled) return;
    setStatus("editing");
    setEditValue(value);
    setOriginalValue(value);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled, value]);

  const handleCommit = useCallback(async () => {
    if (editValue === originalValue) {
      setStatus("idle");
      return;
    }

    setStatus("saving");

    try {
      await onCommit(editValue);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 500);
    } catch (error) {
      console.error("ClickableStat commit error:", error);
      setEditValue(originalValue);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [editValue, originalValue, onCommit]);

  const handleCancel = useCallback(() => {
    setEditValue(originalValue);
    setStatus("idle");
  }, [originalValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCommit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleCommit, handleCancel]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Don't close if clicking within container
      if (containerRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }
      handleCommit();
    },
    [handleCommit]
  );

  const handleSliderChange = useCallback((values: number[]) => {
    setEditValue(values[0] ?? null);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setEditValue(null);
    } else {
      const num = Number(val);
      if (!isNaN(num)) {
        setEditValue(Math.min(max, Math.max(min, num)));
      }
    }
  }, [min, max]);

  // Editing mode
  if (status === "editing" || status === "saving") {
    return (
      <div
        ref={containerRef}
        className={cn(
          "flex flex-col items-center gap-3 p-4 bg-surface rounded-xl border-2 border-primary transition-all",
          status === "saving" && "opacity-70",
          className
        )}
        data-testid={testId}
      >
        <div className="relative w-full max-w-[120px]">
          <Input
            ref={inputRef}
            type="number"
            value={editValue ?? ""}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            disabled={status === "saving"}
            className="text-center text-2xl font-bold h-12"
          />
          {status === "saving" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        <Slider
          value={[editValue ?? min]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          disabled={status === "saving"}
          className="w-full max-w-[160px]"
        />

        <span className="text-xs text-muted-foreground">{label}</span>

        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>Min: {min}</span>
          <span>•</span>
          <span>Max: {max}</span>
        </div>
      </div>
    );
  }

  // Read mode
  return (
    <button
      type="button"
      onClick={handleStartEdit}
      onMouseEnter={() => !disabled && setStatus("hover")}
      onMouseLeave={() => status === "hover" && setStatus("idle")}
      disabled={disabled}
      className={cn(
        "group flex flex-col items-center gap-1 p-4 bg-surface rounded-xl border border-border/60 transition-all cursor-pointer",
        status === "hover" && "border-primary/40 shadow-lg shadow-primary/5 -translate-y-0.5",
        status === "success" && "border-emerald-500/50 bg-emerald-500/5",
        status === "error" && "border-destructive/50 bg-destructive/5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      data-testid={testId}
    >
      {/* Value display */}
      <div className="flex items-baseline gap-1">
        {icon && (
          <span className="text-muted-foreground mr-1">{icon}</span>
        )}
        <span
          className={cn(
            "text-3xl font-bold text-foreground transition-colors",
            status === "hover" && "text-primary",
            status === "success" && "text-emerald-500",
            status === "error" && "text-destructive"
          )}
        >
          {value ?? "—"}
        </span>
        {unit && value !== null && (
          <span className="text-lg text-muted-foreground">{unit}</span>
        )}
      </div>

      {/* Label */}
      <span className="text-xs text-muted-foreground">{label}</span>

      {/* Status indicators */}
      {status === "saving" && (
        <Loader2 className="h-4 w-4 animate-spin text-primary mt-1" />
      )}
    </button>
  );
}

/**
 * ClickableStatGroup - Grupa statystyk w rzędzie
 */
interface ClickableStatGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ClickableStatGroup({ children, className }: ClickableStatGroupProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {children}
    </div>
  );
}

/**
 * StatBadge - Badge pokazujący różnicę wartości
 */
interface StatBadgeProps {
  originalValue: number | null;
  currentValue: number | null;
  label?: string;
}

export function StatBadge({ originalValue, currentValue, label }: StatBadgeProps) {
  if (originalValue === currentValue || originalValue === null || currentValue === null) {
    return null;
  }

  const diff = currentValue - originalValue;
  const isIncrease = diff > 0;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-normal",
        isIncrease
          ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
          : "border-amber-500/40 text-amber-600 bg-amber-500/5"
      )}
    >
      {label && <span className="mr-1">{label}:</span>}
      {isIncrease ? "+" : ""}
      {diff}
    </Badge>
  );
}
