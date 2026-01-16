"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Pencil, Loader2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FieldStatus = "idle" | "hover" | "editing" | "saving" | "error" | "success";

interface InlineEditFieldProps {
  value: string | number | null;
  onCommit: (newValue: string | number | null) => Promise<void>;
  type?: "text" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  displayFormat?: (value: string | number | null) => React.ReactNode;
  min?: number;
  max?: number;
  rows?: number;
  disabled?: boolean;
  "data-testid"?: string;
}

/**
 * InlineEditField - Uniwersalny komponent "Read First, Edit on Click"
 *
 * Zachowanie:
 * - Domyślnie: wyświetla wartość jako czysty tekst + ikonka ołówka na hover
 * - Po kliknięciu: zamienia się w Input/Textarea/Select z auto-focus
 * - Enter lub blur: zapisuje i wraca do trybu read
 * - Escape: anuluje edycję
 *
 * Optimistic UI:
 * - Natychmiast pokazuje nową wartość
 * - Jeśli błąd: rollback + status error
 */
export function InlineEditField({
  value,
  onCommit,
  type = "text",
  options,
  placeholder,
  displayFormat,
  className,
  min,
  max,
  rows = 3,
  disabled = false,
  "data-testid": testId,
}: InlineEditFieldProps) {
  const [status, setStatus] = useState<FieldStatus>("idle");
  const [editValue, setEditValue] = useState<string | number | null>(value);
  const [originalValue, setOriginalValue] = useState<string | number | null>(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external value changes
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
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled, value]);

  const handleCommit = useCallback(async () => {
    // No change - just close
    if (editValue === originalValue) {
      setStatus("idle");
      return;
    }

    // Optimistic update - show saving state briefly
    setStatus("saving");

    try {
      await onCommit(editValue);
      setStatus("success");
      // Show success briefly then idle
      setTimeout(() => setStatus("idle"), 500);
    } catch (error) {
      console.error("InlineEditField commit error:", error);
      // Rollback on error
      setEditValue(originalValue);
      setStatus("error");
      // Show error briefly then idle
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [editValue, originalValue, onCommit]);

  const handleCancel = useCallback(() => {
    setEditValue(originalValue);
    setStatus("idle");
  }, [originalValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && type !== "textarea") {
        e.preventDefault();
        handleCommit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
      // Ctrl+Enter for textarea
      if (e.key === "Enter" && e.ctrlKey && type === "textarea") {
        e.preventDefault();
        handleCommit();
      }
    },
    [type, handleCommit, handleCancel]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Don't blur if clicking within the container (e.g., on save button)
      if (containerRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }
      handleCommit();
    },
    [handleCommit]
  );

  const handleSelectChange = useCallback(
    async (newValue: string) => {
      setEditValue(newValue);
      setStatus("saving");
      try {
        await onCommit(newValue);
        setStatus("success");
        setTimeout(() => setStatus("idle"), 500);
      } catch (error) {
        console.error("InlineEditField select commit error:", error);
        setEditValue(originalValue);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
      }
    },
    [onCommit, originalValue]
  );

  // Editing mode
  if (status === "editing" || status === "saving") {
    return (
      <div ref={containerRef} className="relative" data-testid={testId}>
        {type === "textarea" ? (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue ?? ""}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            disabled={status === "saving"}
            className={cn(
              "transition-all resize-none",
              status === "saving" && "opacity-70"
            )}
          />
        ) : type === "select" && options ? (
          <Select
            value={String(editValue ?? "")}
            onValueChange={handleSelectChange}
            disabled={status === "saving"}
          >
            <SelectTrigger className={cn(status === "saving" && "opacity-70")}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type === "number" ? "number" : "text"}
            value={editValue ?? ""}
            onChange={(e) =>
              setEditValue(
                type === "number"
                  ? e.target.value === ""
                    ? null
                    : Number(e.target.value)
                  : e.target.value
              )
            }
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            min={min}
            max={max}
            disabled={status === "saving"}
            className={cn(
              "transition-all",
              status === "saving" && "opacity-70"
            )}
          />
        )}
        {status === "saving" && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>
    );
  }

  // Read mode
  const displayValue = displayFormat
    ? displayFormat(value)
    : value ?? placeholder ?? "Kliknij aby edytować";

  const isEmpty = value === null || value === "" || value === undefined;

  return (
    <button
      type="button"
      onClick={handleStartEdit}
      onMouseEnter={() => !disabled && setStatus("hover")}
      onMouseLeave={() => status === "hover" && setStatus("idle")}
      disabled={disabled}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-left w-full min-h-[2.25rem]",
        status === "hover" && "bg-surface-light",
        status === "error" && "bg-destructive/10 text-destructive",
        status === "success" && "bg-emerald-500/10",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      data-testid={testId}
    >
      <span
        className={cn(
          "flex-1 min-w-0",
          isEmpty && "text-muted-foreground italic"
        )}
      >
        {displayValue}
      </span>

      {/* Status indicators */}
      {status === "success" && (
        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
      )}
      {status === "error" && (
        <X className="h-4 w-4 text-destructive shrink-0" />
      )}
      {(status === "idle" || status === "hover") && !disabled && (
        <Pencil
          className={cn(
            "h-3 w-3 text-muted-foreground transition-opacity shrink-0",
            status === "hover" ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </button>
  );
}

/**
 * InlineEditSelect - Wariant dla select bez trybu "read"
 * Zawsze pokazuje select, ale z optimistic UI
 */
interface InlineEditSelectProps {
  value: string;
  onCommit: (newValue: string) => Promise<void>;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function InlineEditSelect({
  value,
  onCommit,
  options,
  placeholder,
  className,
  disabled = false,
  "data-testid": testId,
}: InlineEditSelectProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "success">("idle");
  const [optimisticValue, setOptimisticValue] = useState(value);

  useEffect(() => {
    if (status === "idle") {
      setOptimisticValue(value);
    }
  }, [value, status]);

  const handleChange = async (newValue: string) => {
    // Optimistic update
    setOptimisticValue(newValue);
    setStatus("saving");

    try {
      await onCommit(newValue);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 500);
    } catch (error) {
      console.error("InlineEditSelect commit error:", error);
      // Rollback
      setOptimisticValue(value);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const selectedOption = options.find((o) => o.value === optimisticValue);

  return (
    <div className="relative" data-testid={testId}>
      <Select
        value={optimisticValue}
        onValueChange={handleChange}
        disabled={disabled || status === "saving"}
      >
        <SelectTrigger
          className={cn(
            "transition-all",
            status === "saving" && "opacity-70",
            status === "success" && "border-emerald-500/50",
            status === "error" && "border-destructive/50",
            className
          )}
        >
          <SelectValue placeholder={placeholder}>
            {selectedOption && (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                {opt.icon}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {status === "saving" && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
