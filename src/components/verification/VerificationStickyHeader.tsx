"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { InlineEditField } from "./InlineEditField";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

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
          "sticky top-0 bg-background z-10 pb-3 border-b border-border/40 overflow-hidden",
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
          className="text-xl font-bold max-w-full break-words"
          data-testid="verification-header-name"
        />

        {/* Author */}
        {exercise.createdBy && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
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
    </TooltipProvider>
  );
}
