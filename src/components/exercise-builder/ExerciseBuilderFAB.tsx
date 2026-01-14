"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useExerciseBuilder } from "@/contexts/ExerciseBuilderContext";
import { ExerciseBuilderSheet } from "./ExerciseBuilderSheet";

interface ExerciseBuilderFABProps {
  className?: string;
}

export function ExerciseBuilderFAB({ className }: ExerciseBuilderFABProps) {
  const { hasExercises, exerciseCount } = useExerciseBuilder();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Don't render if no exercises
  if (!hasExercises) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button - mobile only */}
      <button
        onClick={() => setIsSheetOpen(true)}
        data-testid="exercise-builder-fab"
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "flex items-center gap-2 px-4 py-3",
          "rounded-full shadow-2xl",
          "bg-gradient-to-r from-primary to-primary-dark text-white",
          "transition-all duration-300 ease-out",
          "hover:shadow-primary/30 hover:scale-105",
          "lg:hidden", // Hide on desktop
          "animate-bounce-in",
          className
        )}
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="font-medium">Koszyk</span>
        <Badge
          variant="secondary"
          className="bg-white text-primary font-bold text-xs px-2"
        >
          {exerciseCount}
        </Badge>
      </button>

      {/* Mobile Sheet */}
      <ExerciseBuilderSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>
  );
}
