'use client';

import Image from 'next/image';
import { useState } from 'react';
import { AlertTriangle, Dumbbell, Repeat, Timer, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExerciseActionSelect } from '../ExerciseActionSelect';
import { formatDurationPolish } from '@/utils/durationPolish';
import type { ExtractedExercise, MatchSuggestion, ExerciseDecision } from '@/types/import.types';

interface UncertainMatchCardProps {
  /** The extracted exercise from PDF */
  exercise: ExtractedExercise;
  /** Available match suggestions */
  matchSuggestions: MatchSuggestion[];
  /** Current decision for this exercise */
  decision: ExerciseDecision;
  /** Callback when decision changes */
  onDecisionChange: (decision: Partial<ExerciseDecision>) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Full card for uncertain matches (confidence < 0.7)
 * Shows suggestions with "Czy chodziło Ci o...?" prompt
 * Yellow/warning accent color
 */
export function UncertainMatchCard({
  exercise,
  matchSuggestions,
  decision,
  onDecisionChange,
  className,
}: UncertainMatchCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const isSkipped = decision.action === 'skip';
  const primarySuggestion = matchSuggestions[0];

  const handleActionChange = (action: 'create' | 'reuse' | 'skip', reuseExerciseId?: string) => {
    onDecisionChange({
      action,
      reuseExerciseId,
    });
  };

  const renderSuggestion = (match: MatchSuggestion) => {
    const isSelected = decision.reuseExerciseId === match.existingExerciseId;
    return (
      <button
        key={match.existingExerciseId}
        type="button"
        onClick={() => handleActionChange('reuse', match.existingExerciseId)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
          isSelected ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-border bg-surface hover:bg-surface-light'
        )}
        data-testid={`import-uncertain-card-${exercise.tempId}-match-${match.existingExerciseId}`}
      >
        {match.imageUrl ? (
          <span className="relative block h-9 w-9 overflow-hidden rounded-lg shrink-0">
            <Image src={match.imageUrl} alt={match.existingExerciseName} fill className="object-cover" sizes="36px" />
          </span>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-light shrink-0">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{match.existingExerciseName}</p>
          <p className="truncate text-xs text-muted-foreground">{match.matchReason}</p>
        </div>
      </button>
    );
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        isSkipped
          ? 'border-border/40 bg-muted/20 opacity-60'
          : 'border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50',
        className
      )}
      data-testid={`import-uncertain-card-${exercise.tempId}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              isSkipped ? 'bg-muted' : 'bg-yellow-500/20'
            )}
          >
            <AlertTriangle className={cn('h-4 w-4', isSkipped ? 'text-muted-foreground' : 'text-yellow-500')} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={cn('text-base font-semibold text-foreground truncate', isSkipped && 'line-through text-muted-foreground')}>
              {exercise.name}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {exercise.sets && (
                <span className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  {exercise.sets} serii
                </span>
              )}
              {exercise.reps && (
                <span className="flex items-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  {exercise.reps} powt.
                </span>
              )}
              {exercise.duration && (
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Czas serii: {formatDurationPolish(exercise.duration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {primarySuggestion && (
          <div className="mt-4 space-y-2">
            {renderSuggestion(primarySuggestion)}
            {matchSuggestions.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAlternatives((previousValue) => !previousValue)}
                  className="h-8 px-2 text-xs text-muted-foreground"
                  data-testid={`import-uncertain-card-${exercise.tempId}-alternatives-btn`}
                >
                  {showAlternatives ? 'Ukryj alternatywy' : `Pokaż alternatywy (${matchSuggestions.length - 1})`}
                  <ChevronDown className={cn('ml-1 h-3.5 w-3.5 transition-transform', showAlternatives && 'rotate-180')} />
                </Button>
                {showAlternatives && <div className="space-y-2">{matchSuggestions.slice(1, 3).map(renderSuggestion)}</div>}
              </>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border/40 px-4 py-3">
        <ExerciseActionSelect
          decision={decision}
          matchSuggestions={matchSuggestions}
          onActionChange={handleActionChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
