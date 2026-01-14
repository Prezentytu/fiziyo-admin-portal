'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Repeat, Dumbbell, Timer, Clock, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExerciseActionSelect } from '../ExerciseActionSelect';
import type {
  ExtractedExercise,
  ExerciseDecision,
} from '@/types/import.types';

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
export function NewExerciseCard({
  exercise,
  decision,
  onDecisionChange,
  className,
}: NewExerciseCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(
    decision.editedData?.name || exercise.name
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const isSkipped = decision.action === 'skip';

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== exercise.name) {
      onDecisionChange({
        editedData: {
          ...decision.editedData,
          name: editedName.trim(),
        },
      });
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditedName(decision.editedData?.name || exercise.name);
      setIsEditingName(false);
    }
  };

  const handleActionChange = (
    action: 'create' | 'reuse' | 'skip',
    reuseExerciseId?: string
  ) => {
    onDecisionChange({
      action,
      reuseExerciseId,
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reps':
        return 'Powtórzenia';
      case 'time':
        return 'Czasowe';
      default:
        return type;
    }
  };

  const displayName = decision.editedData?.name || exercise.name;

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
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              isSkipped ? 'bg-muted' : 'bg-blue-500/20'
            )}
          >
            <Plus
              className={cn(
                'h-5 w-5',
                isSkipped ? 'text-muted-foreground' : 'text-blue-500'
              )}
            />
          </div>

          {/* Title - inline editable */}
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <Input
                ref={inputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                className="text-lg font-semibold h-8 px-2"
                data-testid={`import-new-card-${exercise.tempId}-name-input`}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className={cn(
                  'group flex items-center gap-2 text-left rounded px-1 -mx-1 transition-colors',
                  'hover:bg-surface-light cursor-text',
                  isSkipped && 'line-through text-muted-foreground'
                )}
                title="Kliknij, aby edytować nazwę"
                data-testid={`import-new-card-${exercise.tempId}-name-btn`}
              >
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {displayName}
                </h3>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            )}

            {/* Type badge */}
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  exercise.type === 'time'
                    ? 'bg-orange-500/20 text-orange-600 border-0'
                    : 'bg-primary/20 text-primary border-0'
                )}
              >
                {exercise.type === 'time' ? (
                  <Clock className="h-3 w-3 mr-1" />
                ) : (
                  <Dumbbell className="h-3 w-3 mr-1" />
                )}
                {getTypeLabel(exercise.type)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {exercise.sets && (
            <span className="flex items-center gap-1.5 bg-surface-light rounded-md px-2 py-1">
              <Repeat className="h-3.5 w-3.5" />
              {exercise.sets} serii
            </span>
          )}
          {exercise.reps && (
            <span className="flex items-center gap-1.5 bg-surface-light rounded-md px-2 py-1">
              <Dumbbell className="h-3.5 w-3.5" />
              {exercise.reps} powt.
            </span>
          )}
          {exercise.duration && (
            <span className="flex items-center gap-1.5 bg-surface-light rounded-md px-2 py-1">
              <Timer className="h-3.5 w-3.5" />
              {exercise.duration}s
            </span>
          )}
        </div>

        {/* Description if present */}
        {exercise.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {exercise.description}
          </p>
        )}
      </div>

      {/* Footer with action select */}
      <div className="border-t border-border/40 px-4 py-3">
        <ExerciseActionSelect
          decision={decision}
          onActionChange={handleActionChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
