'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewExerciseCard } from '../cards/NewExerciseCard';
import type {
  ExtractedExercise,
  ExerciseDecision,
} from '@/types/import.types';

interface NewExercisesSectionProps {
  /** Exercises without matches (new ones) */
  exercises: ExtractedExercise[];
  /** Decisions map (tempId -> decision) */
  decisions: Record<string, ExerciseDecision>;
  /** Callback when a decision changes */
  onDecisionChange: (tempId: string, decision: Partial<ExerciseDecision>) => void;
  /** Whether section is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Section B: New Exercises (no matches found)
 * - Cards with inline edit for names
 * - Default action: "Utwórz jako nowe"
 * - Blue/gray accent
 */
export function NewExercisesSection({
  exercises,
  decisions,
  onDecisionChange,
  disabled = false,
  className,
}: NewExercisesSectionProps) {
  if (exercises.length === 0) return null;

  // Count how many will be created
  const createCount = exercises.filter(
    (e) => decisions[e.tempId]?.action === 'create'
  ).length;

  return (
    <div className={cn('space-y-4', className)} data-testid="import-new-section">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20">
          <Plus className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            Nowe ćwiczenia ({exercises.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            {createCount} do utworzenia w bazie
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {exercises.map((exercise) => {
          const decision = decisions[exercise.tempId];

          return (
            <NewExerciseCard
              key={exercise.tempId}
              exercise={exercise}
              decision={decision}
              onDecisionChange={(partial) => onDecisionChange(exercise.tempId, partial)}
            />
          );
        })}
      </div>
    </div>
  );
}
