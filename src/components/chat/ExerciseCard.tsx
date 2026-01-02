"use client";

import { Clock, Repeat, Dumbbell, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ParsedExercise } from "@/types/chat.types";

interface ExerciseCardProps {
  exercise: ParsedExercise;
  className?: string;
}

/**
 * Karta ćwiczenia wyświetlana w odpowiedzi AI
 */
export function ExerciseCard({ exercise, className }: ExerciseCardProps) {
  const hasParams =
    exercise.sets ||
    exercise.reps ||
    exercise.preparationTime ||
    exercise.restBetweenSets;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-surface overflow-hidden",
        "transition-all duration-200",
        "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
        className
      )}
    >
      {/* Gradient header */}
      <div className="h-1 bg-gradient-to-r from-primary to-emerald-600" />

      <div className="p-4 space-y-3">
        {/* Nazwa ćwiczenia */}
        <h4 className="font-semibold text-foreground leading-tight">
          {exercise.name}
        </h4>

        {/* Tagi */}
        {exercise.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {exercise.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Opis */}
        {exercise.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {exercise.description}
          </p>
        )}

        {/* Parametry */}
        {hasParams && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            {exercise.sets && (
              <span className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">
                  {exercise.sets}
                </span>{" "}
                serii
              </span>
            )}
            {exercise.reps && (
              <span className="flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">
                  {exercise.reps}
                </span>{" "}
                powt.
              </span>
            )}
            {exercise.preparationTime && (
              <span className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-info" />
                <span className="font-medium text-foreground">
                  {exercise.preparationTime}
                </span>{" "}
                min przyg.
              </span>
            )}
            {exercise.restBetweenSets && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-secondary" />
                <span className="font-medium text-foreground">
                  {exercise.restBetweenSets}
                </span>{" "}
                min odp.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

