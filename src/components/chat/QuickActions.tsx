"use client";

import { cn } from "@/lib/utils";
import type { QuickActionPreset } from "@/types/chat.types";

// Predefiniowane szybkie akcje
const quickActions: QuickActionPreset[] = [
  {
    id: "spine",
    label: "Kręgosłup",
    prompt: "Pokaż ćwiczenia na kręgosłup",
  },
  {
    id: "warmup",
    label: "Rozgrzewka",
    prompt: "Pokaż ćwiczenia rozgrzewkowe",
  },
  {
    id: "knee",
    label: "Kolano",
    prompt: "Pokaż ćwiczenia na kolano",
  },
  {
    id: "stretching",
    label: "Stretching",
    prompt: "Pokaż ćwiczenia stretchingowe",
  },
  {
    id: "shoulder",
    label: "Bark",
    prompt: "Pokaż ćwiczenia na bark",
  },
];

interface QuickActionsProps {
  onActionClick: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Przyciski szybkich akcji do wysyłania predefiniowanych promptów
 */
export function QuickActions({
  onActionClick,
  disabled = false,
  className,
}: QuickActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {quickActions.map((action) => (
        <button
          key={action.id}
          onClick={() => onActionClick(action.prompt)}
          disabled={disabled}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full",
            "border border-border/60 bg-surface-light/50",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-surface-light hover:border-primary/40",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

