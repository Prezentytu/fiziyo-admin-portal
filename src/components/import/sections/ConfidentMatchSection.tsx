'use client';

import { useState } from 'react';
import { CheckCircle, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfidentMatchRow } from '../cards/ConfidentMatchRow';
import type {
  ExtractedExercise,
  MatchSuggestion,
  ExerciseDecision,
} from '@/types/import.types';

interface ConfidentMatchSectionProps {
  /** Exercises with confident matches (confidence >= 0.7) */
  exercises: ExtractedExercise[];
  /** Match suggestions map (tempId -> suggestions) */
  matchSuggestions: Record<string, MatchSuggestion[]>;
  /** Decisions map (tempId -> decision) */
  decisions: Record<string, ExerciseDecision>;
  /** Callback when a decision changes */
  onDecisionChange: (tempId: string, decision: Partial<ExerciseDecision>) => void;
  /** Callback to approve all confident matches */
  onApproveAll: () => void;
  /** Callback when user wants to change a match (opens modal/drawer) */
  onChangeMatch?: (tempId: string) => void;
  /** Whether section is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Section A: Confident Matches (confidence >= 0.7)
 * - Collapsible by default (user trusts AI)
 * - Bulk action "Zatwierdź wszystkie" in header
 * - Compact rows with hover preview
 */
export function ConfidentMatchSection({
  exercises,
  matchSuggestions,
  decisions,
  onDecisionChange,
  onApproveAll,
  onChangeMatch,
  disabled = false,
  className,
}: ConfidentMatchSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (exercises.length === 0) return null;

  // Count how many are already set to reuse
  const approvedCount = exercises.filter(
    (e) => decisions[e.tempId]?.action === 'reuse'
  ).length;

  const allApproved = approvedCount === exercises.length;

  return (
    <TooltipProvider>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn('rounded-xl border border-green-500/30 overflow-hidden', className)}
        data-testid="import-confident-section"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-green-500/5 px-4 py-3">
          <CollapsibleTrigger
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            data-testid="import-confident-section-trigger"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">
                Znalezione w bazie ({exercises.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                {allApproved
                  ? 'Wszystkie zatwierdzone'
                  : `${approvedCount} z ${exercises.length} zatwierdzonych`}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>

          {/* Bulk action button */}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onApproveAll();
            }}
            disabled={disabled || allApproved}
            className={cn(
              'gap-2',
              allApproved
                ? 'text-green-600 border-green-500/50 bg-green-500/10'
                : 'text-green-600 border-green-500/50 hover:bg-green-500/10'
            )}
            data-testid="import-confident-section-approve-all-btn"
          >
            <Check className="h-4 w-4" />
            {allApproved ? 'Zatwierdzone' : `Zatwierdź wszystkie (${exercises.length})`}
          </Button>
        </div>

        {/* Content - list of rows */}
        <CollapsibleContent>
          <div className="divide-y divide-border/40 bg-surface/50">
            {exercises.map((exercise) => {
              const suggestions = matchSuggestions[exercise.tempId] || [];
              const bestMatch = suggestions[0];
              const decision = decisions[exercise.tempId];

              if (!bestMatch) return null;

              return (
                <ConfidentMatchRow
                  key={exercise.tempId}
                  exercise={exercise}
                  match={bestMatch}
                  decision={decision}
                  onSkip={() => {
                    const currentAction = decision?.action;
                    onDecisionChange(exercise.tempId, {
                      action: currentAction === 'skip' ? 'reuse' : 'skip',
                      reuseExerciseId:
                        currentAction === 'skip' ? bestMatch.existingExerciseId : undefined,
                    });
                  }}
                  onChange={() => {
                    if (onChangeMatch) {
                      onChangeMatch(exercise.tempId);
                    }
                  }}
                />
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
}
