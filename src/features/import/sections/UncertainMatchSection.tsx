'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UncertainMatchCard } from '../cards/UncertainMatchCard';
import type { ExtractedExercise, MatchSuggestion, ExerciseDecision } from '@/types/import.types';

interface UncertainMatchSectionProps {
  /** Exercises with uncertain matches (confidence < 0.7) */
  exercises: ExtractedExercise[];
  /** Match suggestions map (tempId -> suggestions) */
  matchSuggestions: Record<string, MatchSuggestion[]>;
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
 * Section C: Uncertain Matches (confidence < 0.7)
 * - Full cards with "Czy chodziło Ci o...?" suggestions
 * - Yellow/warning accent
 * - Requires user attention
 */
export function UncertainMatchSection({
  exercises,
  matchSuggestions,
  decisions,
  onDecisionChange,
  disabled: _disabled = false,
  className,
}: UncertainMatchSectionProps) {
  if (exercises.length === 0) return null;

  // Count pending (not yet decided)
  const pendingCount = exercises.filter((e) => {
    const decision = decisions[e.tempId];
    return !decision || decision.action === 'create'; // Default is create, needs review
  }).length;

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)} data-testid="import-uncertain-section">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/20">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Wymaga decyzji ({exercises.length})</h3>
            {pendingCount > 0 && <p className="text-xs text-muted-foreground">{pendingCount} pozycji do sprawdzenia</p>}
          </div>
        </div>

        <div className="space-y-3">
          {exercises.map((exercise) => {
            const suggestions = matchSuggestions[exercise.tempId] || [];
            const decision = decisions[exercise.tempId];

            return (
              <UncertainMatchCard
                key={exercise.tempId}
                exercise={exercise}
                matchSuggestions={suggestions}
                decision={decision}
                onDecisionChange={(partial) => onDecisionChange(exercise.tempId, partial)}
              />
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
