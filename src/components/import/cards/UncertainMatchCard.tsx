'use client';

import { AlertTriangle, Dumbbell, Repeat, Timer, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExerciseActionSelect } from '../ExerciseActionSelect';
import type {
  ExtractedExercise,
  MatchSuggestion,
  ExerciseDecision,
} from '@/types/import.types';

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
  const isSkipped = decision.action === 'skip';
  const selectedMatch = matchSuggestions.find(
    (m) => m.existingExerciseId === decision.reuseExerciseId
  );

  const handleActionChange = (
    action: 'create' | 'reuse' | 'skip',
    reuseExerciseId?: string
  ) => {
    onDecisionChange({
      action,
      reuseExerciseId,
    });
  };

  const handleSelectMatch = (matchId: string) => {
    onDecisionChange({
      action: 'reuse',
      reuseExerciseId: matchId,
    });
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.5) return 'Średnia zgodność';
    return 'Niska zgodność';
  };

  const getConfidenceBadgeClass = (confidence: number) => {
    if (confidence >= 0.5) return 'bg-yellow-500/20 text-yellow-600 border-0';
    return 'bg-orange-500/20 text-orange-600 border-0';
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
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              isSkipped ? 'bg-muted' : 'bg-yellow-500/20'
            )}
          >
            <AlertTriangle
              className={cn(
                'h-5 w-5',
                isSkipped ? 'text-muted-foreground' : 'text-yellow-500'
              )}
            />
          </div>

          {/* Title with hover preview */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3
                    className={cn(
                      'text-lg font-semibold text-foreground truncate cursor-help',
                      isSkipped && 'line-through text-muted-foreground'
                    )}
                  >
                    {exercise.name}
                  </h3>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    Oryginalny tekst z PDF:
                  </p>
                  <p className="text-sm italic">
                    &quot;{exercise.originalText || exercise.name}&quot;
                  </p>
                </TooltipContent>
              </Tooltip>
              <HelpCircle className="h-4 w-4 text-yellow-500 shrink-0" />
            </div>

            {/* Parameters */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {exercise.sets && (
                <span className="flex items-center gap-1">
                  <Repeat className="h-3.5 w-3.5" />
                  {exercise.sets} serii
                </span>
              )}
              {exercise.reps && (
                <span className="flex items-center gap-1">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {exercise.reps} powt.
                </span>
              )}
              {exercise.duration && (
                <span className="flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" />
                  {exercise.duration}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions section */}
        <div className="mt-4">
          <p className="text-sm font-medium text-yellow-600 mb-2">
            Czy chodziło Ci o jedno z tych ćwiczeń?
          </p>
          <div className="space-y-2">
            {matchSuggestions.slice(0, 3).map((match) => (
              <button
                key={match.existingExerciseId}
                type="button"
                onClick={() => handleSelectMatch(match.existingExerciseId)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-all',
                  decision.reuseExerciseId === match.existingExerciseId
                    ? 'bg-yellow-500/20 border-2 border-yellow-500/50'
                    : 'bg-surface hover:bg-surface-light border-2 border-transparent'
                )}
                data-testid={`import-uncertain-card-${exercise.tempId}-match-${match.existingExerciseId}`}
              >
                {/* Thumbnail */}
                {match.imageUrl ? (
                  <img
                    src={match.imageUrl}
                    alt={match.existingExerciseName}
                    className="h-10 w-10 rounded-lg object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light shrink-0">
                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* Match info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {match.existingExerciseName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {match.matchReason}
                  </p>
                </div>

                {/* Confidence badge */}
                <Badge
                  variant="secondary"
                  className={cn('text-xs shrink-0', getConfidenceBadgeClass(match.confidence))}
                >
                  {getConfidenceLabel(match.confidence)}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Selected match info */}
        {decision.action === 'reuse' && selectedMatch && (
          <div className="mt-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2.5">
            <p className="text-sm text-yellow-600">
              Użyjesz: <span className="font-medium">{selectedMatch.existingExerciseName}</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer with action select */}
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
