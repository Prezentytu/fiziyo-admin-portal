'use client';

import { useState } from 'react';
import { Layers, Check, X, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type {
  ExtractedExerciseSet,
  ExtractedExercise,
  ExerciseSetDecision,
  ExerciseDecision,
} from '@/types/import.types';

interface SetReviewCardProps {
  exerciseSet: ExtractedExerciseSet;
  exercises: ExtractedExercise[];
  exerciseDecisions: Record<string, ExerciseDecision>;
  decision: ExerciseSetDecision;
  onDecisionChange: (decision: Partial<ExerciseSetDecision>) => void;
  className?: string;
}

/**
 * Karta zestawu ćwiczeń do review
 */
export function SetReviewCard({
  exerciseSet,
  exercises,
  exerciseDecisions,
  decision,
  onDecisionChange,
  className,
}: SetReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filtruj ćwiczenia w zestawie
  const setExercises = exerciseSet.exerciseTempIds
    .map((tempId) => exercises.find((e) => e.tempId === tempId))
    .filter(Boolean) as ExtractedExercise[];

  // Sprawdź ile ćwiczeń jest aktywnych (nie pominiętych)
  const activeExercises = setExercises.filter((e) => {
    const d = exerciseDecisions[e.tempId];
    return d && d.action !== 'skip';
  });

  const hasActiveExercises = activeExercises.length > 0;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        decision.action === 'skip' && 'opacity-50',
        decision.action === 'create' && hasActiveExercises && 'border-primary/30 bg-primary/5',
        !hasActiveExercises && 'border-orange-500/30 bg-orange-500/5',
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              decision.action === 'create' && hasActiveExercises
                ? 'bg-primary/20'
                : !hasActiveExercises
                ? 'bg-orange-500/20'
                : 'bg-surface-light'
            )}
          >
            <Layers
              className={cn(
                'h-5 w-5',
                decision.action === 'create' && hasActiveExercises
                  ? 'text-primary'
                  : !hasActiveExercises
                  ? 'text-orange-500'
                  : 'text-muted-foreground'
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">
                {decision.editedName || exerciseSet.name}
              </h3>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {activeExercises.length}/{setExercises.length} ćwiczeń
              </Badge>
            </div>

            {(decision.editedDescription || exerciseSet.description) && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {decision.editedDescription || exerciseSet.description}
              </p>
            )}

            {!hasActiveExercises && (
              <p className="mt-2 text-sm text-orange-500">
                ⚠️ Wszystkie ćwiczenia w tym zestawie zostały pominięte
              </p>
            )}

            {exerciseSet.suggestedFrequency && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sugerowana częstotliwość: {exerciseSet.suggestedFrequency}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-1">
            <Button
              variant={decision.action === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDecisionChange({ action: 'create' })}
              disabled={!hasActiveExercises}
              className={cn(
                'h-8',
                decision.action === 'create' && hasActiveExercises && 'bg-primary hover:bg-primary-dark'
              )}
              title="Utwórz zestaw"
            >
              <Check className="h-4 w-4" />
            </Button>

            <Button
              variant={decision.action === 'skip' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDecisionChange({ action: 'skip' })}
              className={cn(
                'h-8',
                decision.action === 'skip' && 'bg-muted hover:bg-muted'
              )}
              title="Pomiń"
            >
              <X className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded: lista ćwiczeń */}
        {isExpanded && (
          <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Ćwiczenia w zestawie:
            </p>
            <div className="space-y-1">
              {setExercises.map((exercise, index) => {
                const exDecision = exerciseDecisions[exercise.tempId];
                const isActive = exDecision && exDecision.action !== 'skip';

                return (
                  <div
                    key={exercise.tempId}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2',
                      isActive ? 'bg-surface-light' : 'bg-surface-light/50 opacity-50'
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium">
                      {index + 1}
                    </span>
                    <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        isActive ? 'text-foreground' : 'text-muted-foreground line-through'
                      )}
                    >
                      {exercise.name}
                    </span>
                    {exDecision?.action === 'reuse' && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Istniejące
                      </Badge>
                    )}
                    {exDecision?.action === 'create' && (
                      <Badge className="shrink-0 bg-primary/20 text-primary text-xs border-0">
                        Nowe
                      </Badge>
                    )}
                    {exDecision?.action === 'skip' && (
                      <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                        Pominięte
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
