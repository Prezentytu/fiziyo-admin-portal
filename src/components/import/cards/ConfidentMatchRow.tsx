'use client';

import { Check, Trash2, RefreshCw, Dumbbell, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  ExtractedExercise,
  MatchSuggestion,
  ExerciseDecision,
} from '@/types/import.types';

interface ConfidentMatchRowProps {
  /** The extracted exercise from PDF */
  exercise: ExtractedExercise;
  /** The matched existing exercise */
  match: MatchSuggestion;
  /** Current decision for this exercise */
  decision: ExerciseDecision;
  /** Callback when user wants to skip this exercise */
  onSkip: () => void;
  /** Callback when user wants to change the match */
  onChange: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Compact row for confident matches (confidence >= 0.7)
 * Shows: [Check icon] [PDF name] → [Thumbnail + DB name]
 * With hover preview showing original PDF text
 */
export function ConfidentMatchRow({
  exercise,
  match,
  decision,
  onSkip,
  onChange,
  className,
}: ConfidentMatchRowProps) {
  const isSkipped = decision.action === 'skip';

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all duration-200',
        isSkipped
          ? 'opacity-50 bg-muted/30'
          : 'hover:bg-green-500/5 hover:border-green-500/20',
        className
      )}
      data-testid={`import-confident-row-${exercise.tempId}`}
    >
      {/* Status icon */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isSkipped ? 'bg-muted' : 'bg-green-500/20'
        )}
      >
        <Check
          className={cn(
            'h-4 w-4',
            isSkipped ? 'text-muted-foreground' : 'text-green-500'
          )}
        />
      </div>

      {/* PDF exercise name with hover preview */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'font-medium text-foreground min-w-0 truncate cursor-help',
              isSkipped && 'line-through text-muted-foreground'
            )}
          >
            {exercise.name}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <p className="text-xs text-muted-foreground mb-1">Oryginalny tekst z PDF:</p>
          <p className="text-sm italic">
            &quot;{exercise.originalText || exercise.name}&quot;
          </p>
          {exercise.sets && (
            <p className="text-xs text-muted-foreground mt-2">
              Serie: {exercise.sets}
              {exercise.reps && `, Powtórzenia: ${exercise.reps}`}
              {exercise.duration && `, Czas: ${exercise.duration}s`}
            </p>
          )}
        </TooltipContent>
      </Tooltip>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Matched exercise from database */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {match.imageUrl ? (
          <img
            src={match.imageUrl}
            alt={match.existingExerciseName}
            className="h-8 w-8 rounded-md object-cover shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-light shrink-0">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <span
          className={cn(
            'text-sm text-foreground truncate',
            isSkipped && 'text-muted-foreground'
          )}
        >
          {match.existingExerciseName}
        </span>
      </div>

      {/* Actions - visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onChange();
          }}
          title="Zmień dopasowanie"
          data-testid={`import-confident-row-${exercise.tempId}-change-btn`}
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          title={isSkipped ? 'Przywróć' : 'Nie importuj'}
          data-testid={`import-confident-row-${exercise.tempId}-skip-btn`}
        >
          <Trash2
            className={cn(
              'h-4 w-4',
              isSkipped ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </Button>
      </div>
    </div>
  );
}
