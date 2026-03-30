'use client';

import { Plus, Repeat, Dumbbell, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExerciseActionSelect } from '../ExerciseActionSelect';
import type { ExtractedExercise, ExerciseDecision } from '@/types/import.types';

interface NewExerciseCardProps {
  /** The extracted exercise from PDF */
  exercise: ExtractedExercise;
  /** Current decision for this exercise */
  decision: ExerciseDecision;
  /** Callback when decision changes */
  onDecisionChange: (decision: Partial<ExerciseDecision>) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Card for new exercises (no matches found)
 * Features inline edit for name (click to edit)
 * Default action: "Utwórz jako nowe"
 */
export function NewExerciseCard({ exercise, decision, onDecisionChange, className }: NewExerciseCardProps) {
  const isSkipped = decision.action === 'skip';

  const handleActionChange = (action: 'create' | 'reuse' | 'skip', reuseExerciseId?: string) => {
    onDecisionChange({
      action,
      reuseExerciseId,
    });
  };

  const displayName = decision.editedData?.name ?? exercise.name;

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        isSkipped
          ? 'border-border/40 bg-muted/20 opacity-60'
          : 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50',
        className
      )}
      data-testid={`import-new-card-${exercise.tempId}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              isSkipped ? 'bg-muted' : 'bg-blue-500/20'
            )}
          >
            <Plus className={cn('h-4 w-4', isSkipped ? 'text-muted-foreground' : 'text-blue-500')} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn('text-base font-semibold text-foreground truncate', isSkipped && 'line-through text-muted-foreground')}>
              {displayName}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {exercise.sets && (
                <span className="flex items-center gap-1 rounded-md bg-surface-light px-2 py-1">
                  <Repeat className="h-3 w-3" />
                  {exercise.sets} serii
                </span>
              )}
              {exercise.reps && (
                <span className="flex items-center gap-1 rounded-md bg-surface-light px-2 py-1">
                  <Dumbbell className="h-3 w-3" />
                  {exercise.reps} powt.
                </span>
              )}
              {exercise.duration && (
                <span className="flex items-center gap-1 rounded-md bg-surface-light px-2 py-1">
                  <Timer className="h-3 w-3" />
                  {exercise.duration}s
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 px-4 py-3">
        <ExerciseActionSelect decision={decision} onActionChange={handleActionChange} className="w-full" />
      </div>
    </div>
  );
}
