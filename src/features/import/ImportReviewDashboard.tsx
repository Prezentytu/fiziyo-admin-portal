'use client';

import { useMemo } from 'react';
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ConfidentMatchSection } from './sections/ConfidentMatchSection';
import { NewExercisesSection } from './sections/NewExercisesSection';
import { UncertainMatchSection } from './sections/UncertainMatchSection';
import { ImportStickyFooter } from './ImportStickyFooter';
import { IMPORT_CONFIDENT_MATCH_THRESHOLD } from './importMatching.constants';
import type { ExtractedExercise, MatchSuggestion, ExerciseDecision } from '@/types/import.types';

interface ImportReviewDashboardProps {
  /** All extracted exercises */
  exercises: ExtractedExercise[];
  /** Match suggestions map (tempId -> suggestions) */
  matchSuggestions: Record<string, MatchSuggestion[]>;
  /** Current decisions map (tempId -> decision) */
  decisions: Record<string, ExerciseDecision>;
  /** Callback when a decision changes */
  onDecisionChange: (tempId: string, decision: Partial<ExerciseDecision>) => void;
  /** Callback to approve all confident matches at once */
  onApproveAllConfident: () => void;
  /** Callback when user proceeds to next step */
  onNext: () => void;
  /** Whether to create a set after import */
  createSetAfterImport: boolean;
  /** Callback when "create set" checkbox changes */
  onCreateSetChange: (checked: boolean) => void;
  /** Whether next action is in progress */
  isLoading?: boolean;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Main dashboard for reviewing imported exercises
 * Categorizes exercises into 3 sections:
 * - A: Confident matches (green) - collapsible, bulk approve
 * - B: New exercises (blue) - inline edit
 * - C: Uncertain matches (yellow) - requires attention
 */
export function ImportReviewDashboard({
  exercises,
  matchSuggestions,
  decisions,
  onDecisionChange,
  onApproveAllConfident,
  onNext,
  createSetAfterImport,
  onCreateSetChange,
  isLoading = false,
  disabled = false,
  className,
}: ImportReviewDashboardProps) {
  // Categorize exercises
  const { confidentMatches, newExercises, uncertainMatches } = useMemo(() => {
    const confident: ExtractedExercise[] = [];
    const newOnes: ExtractedExercise[] = [];
    const uncertain: ExtractedExercise[] = [];

    exercises.forEach((exercise) => {
      const suggestions = matchSuggestions[exercise.tempId];
      const bestMatch = suggestions?.[0];

      if (!suggestions || suggestions.length === 0) {
        // No matches -> new exercise
        newOnes.push(exercise);
      } else if (bestMatch && bestMatch.confidence >= IMPORT_CONFIDENT_MATCH_THRESHOLD) {
        // High confidence -> confident match
        confident.push(exercise);
      } else {
        // Low confidence -> uncertain match
        uncertain.push(exercise);
      }
    });

    return {
      confidentMatches: confident,
      newExercises: newOnes,
      uncertainMatches: uncertain,
    };
  }, [exercises, matchSuggestions]);

  // Calculate stats for footer
  const stats = useMemo(() => {
    let reuseCount = 0;
    let createCount = 0;
    let skipCount = 0;

    Object.values(decisions).forEach((decision) => {
      if (decision.action === 'reuse') reuseCount++;
      else if (decision.action === 'create') createCount++;
      else if (decision.action === 'skip') skipCount++;
    });

    return { reuseCount, createCount, skipCount };
  }, [decisions]);

  // Handle decision change with proper merging
  const handleDecisionChange = (tempId: string, partial: Partial<ExerciseDecision>) => {
    onDecisionChange(tempId, partial);
  };

  // Empty state
  if (exercises.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Dumbbell className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">Nie znaleziono ćwiczeń w dokumencie</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6 pb-24', className)} data-testid="import-review-dashboard">
      <Card className="border-border/60">
        <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm">
          <span className="font-medium text-foreground">Najpierw sprawdź pozycje wymagające decyzji.</span>
          <span className="text-muted-foreground">Potem zatwierdź nowe i pewne dopasowania.</span>
        </CardContent>
      </Card>

      {uncertainMatches.length > 0 && (
        <UncertainMatchSection
          exercises={uncertainMatches}
          matchSuggestions={matchSuggestions}
          decisions={decisions}
          onDecisionChange={handleDecisionChange}
          disabled={disabled}
        />
      )}

      {newExercises.length > 0 && (
        <NewExercisesSection
          exercises={newExercises}
          decisions={decisions}
          onDecisionChange={handleDecisionChange}
          disabled={disabled}
        />
      )}

      {confidentMatches.length > 0 && (
        <ConfidentMatchSection
          exercises={confidentMatches}
          matchSuggestions={matchSuggestions}
          decisions={decisions}
          onDecisionChange={handleDecisionChange}
          onApproveAll={onApproveAllConfident}
          disabled={disabled}
        />
      )}

      {/* Sticky Footer */}
      <ImportStickyFooter
        reuseCount={stats.reuseCount}
        createCount={stats.createCount}
        skipCount={stats.skipCount}
        createSetAfterImport={createSetAfterImport}
        onCreateSetChange={onCreateSetChange}
        onAction={onNext}
        actionLabel="Dalej"
        isLoading={isLoading}
        disabled={disabled}
      />
    </div>
  );
}
