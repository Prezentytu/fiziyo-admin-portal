"use client";

import {
  Timer,
  RotateCcw,
  Dumbbell,
  ArrowLeftRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { InlineEditField, InlineEditSelect } from "./InlineEditField";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

// ============================================
// TYPES & OPTIONS
// ============================================

const EXERCISE_TYPES = [
  { value: "reps", label: "Powtórzenia", icon: <RotateCcw className="h-3.5 w-3.5" /> },
  { value: "time", label: "Czasowe", icon: <Timer className="h-3.5 w-3.5" /> },
  { value: "hold", label: "Izometryczne", icon: <Dumbbell className="h-3.5 w-3.5" /> },
];

const EXERCISE_SIDES = [
  { value: "none", label: "Brak" },
  { value: "left", label: "Lewa" },
  { value: "right", label: "Prawa" },
  { value: "both", label: "Obie" },
  { value: "alternating", label: "Naprzem." },
];

interface VerificationStickyHeaderProps {
  /** Ćwiczenie do wyświetlenia */
  exercise: AdminExercise;
  /** Callback przy zmianie pola */
  onFieldChange: (field: string, value: unknown) => Promise<void>;
  /** Czy wyłączony */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * VerificationStickyHeader - Sticky header z danymi ćwiczenia
 *
 * Zawartość:
 * - Nazwa ćwiczenia (duży font, edytowalna inline)
 * - Typ ćwiczenia (select)
 * - Strona ćwiczenia (select)
 * - Status badge
 * - Avatar autora
 */
export function VerificationStickyHeader({
  exercise,
  onFieldChange,
  disabled = false,
  className,
  "data-testid": testId,
}: VerificationStickyHeaderProps) {
  const handleFieldCommit = (field: string) => async (value: unknown) => {
    await onFieldChange(field, value);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "sticky top-0 bg-background z-10 pb-3 border-b border-border/40",
          className
        )}
        data-testid={testId}
      >
        {/* Nazwa - duża, wyraźna, multiline */}
        <InlineEditField
          value={exercise.name}
          onCommit={handleFieldCommit("name")}
          type="text"
          placeholder="Nazwa ćwiczenia..."
          disabled={disabled}
          variant="ghost"
          multiline
          className="text-2xl font-bold -ml-2 mb-2"
          data-testid="verification-header-name"
        />

        {/* Typ + Strona + Status + Autor - w jednej linii */}
        <div className="flex items-center gap-2 flex-wrap">
          <InlineEditSelect
            value={exercise.type || "reps"}
            onCommit={handleFieldCommit("type")}
            options={EXERCISE_TYPES}
            disabled={disabled}
            variant="ghost"
            size="compact"
            data-testid="verification-header-type"
          />
          <InlineEditSelect
            value={exercise.side || "none"}
            onCommit={handleFieldCommit("side")}
            options={EXERCISE_SIDES.map(s => ({
              ...s,
              icon: <ArrowLeftRight className="h-3 w-3" />,
            }))}
            disabled={disabled}
            variant="ghost"
            size="compact"
            data-testid="verification-header-side"
          />

          {/* Author */}
          {exercise.createdBy && (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-surface-light flex items-center justify-center text-[10px] font-medium">
                    {(exercise.createdBy.fullname || exercise.createdBy.email || "?")[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">
                    {exercise.createdBy.fullname || exercise.createdBy.email}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Autor: {exercise.createdBy.fullname || exercise.createdBy.email}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
