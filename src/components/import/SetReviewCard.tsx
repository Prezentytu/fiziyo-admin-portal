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
 * Karta zestawu ćwiczeń do review - uproszczona
 * Przyciski z tekstem dla lepszej czytelności
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
        'overflow-hidden transition-colors duration-200',
        decision.action === 'skip' && 'opacity-60',
        decision.action === 'create' && hasActiveExercises && 'border-primary/40 bg-primary/5',
        !hasActiveExercises && 'border-warning/40 bg-warning/5',
        className
      )}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              decision.action === 'create' && hasActiveExercises
                ? 'bg-primary/20'
                : !hasActiveExercises
                ? 'bg-warning/20'
                : 'bg-surface-light'
            )}
          >
            <Layers
              className={cn(
                'h-6 w-6',
                decision.action === 'create' && hasActiveExercises
                  ? 'text-primary'
                  : !hasActiveExercises
                  ? 'text-warning'
                  : 'text-muted-foreground'
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* Nazwa zestawu - większa */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground">
                {decision.editedName || exerciseSet.name}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {activeExercises.length} z {setExercises.length} ćwiczeń
              </Badge>
            </div>

            {/* Opis */}
            {(decision.editedDescription || exerciseSet.description) && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {decision.editedDescription || exerciseSet.description}
              </p>
            )}

            {/* Ostrzeżenie gdy brak aktywnych ćwiczeń */}
            {!hasActiveExercises && (
              <p className="mt-2 text-sm text-warning font-medium">
                Wszystkie ćwiczenia w tym zestawie zostały pominięte
              </p>
            )}

            {/* Sugerowana częstotliwość */}
            {exerciseSet.suggestedFrequency && hasActiveExercises && (
              <p className="mt-2 text-sm text-muted-foreground">
                Sugerowana częstotliwość: {exerciseSet.suggestedFrequency}
              </p>
            )}
          </div>

          {/* Przycisk rozwijania */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0 h-10 w-10"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Przyciski akcji - czytelne etykiety dla fizjoterapeutów */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={decision.action === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDecisionChange({ action: 'create' })}
            disabled={!hasActiveExercises}
            className={cn(
              'gap-2 h-9 px-4',
              decision.action === 'create' && hasActiveExercises && 'bg-primary hover:bg-primary-dark'
            )}
            data-testid={`import-set-card-${exerciseSet.tempId}-create-btn`}
          >
            <Check className="h-4 w-4" />
            Zapisz ten zestaw
          </Button>

          <Button
            variant={decision.action === 'skip' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onDecisionChange({ action: 'skip' })}
            className={cn(
              'gap-2 h-9 px-4',
              decision.action === 'skip' && 'bg-muted text-muted-foreground'
            )}
            data-testid={`import-set-card-${exerciseSet.tempId}-skip-btn`}
          >
            <X className="h-4 w-4" />
            Nie importuj zestawu
          </Button>
        </div>

        {/* Expanded: lista ćwiczeń */}
        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            <p className="text-sm font-medium text-foreground">
              Ćwiczenia w zestawie:
            </p>
            <div className="space-y-2">
              {setExercises.map((exercise, index) => {
                const exDecision = exerciseDecisions[exercise.tempId];
                const isActive = exDecision && exDecision.action !== 'skip';

                return (
                  <div
                    key={exercise.tempId}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3',
                      isActive ? 'bg-surface-light' : 'bg-surface-light/50 opacity-60'
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-medium">
                      {index + 1}
                    </span>
                    <Dumbbell className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        isActive ? 'text-foreground' : 'text-muted-foreground line-through'
                      )}
                    >
                      {exercise.name}
                    </span>
                    {exDecision?.action === 'reuse' && (
                      <Badge variant="secondary" className="shrink-0 text-xs bg-blue-500/20 text-blue-600 border-0">
                        Z mojej bazy
                      </Badge>
                    )}
                    {exDecision?.action === 'create' && (
                      <Badge className="shrink-0 bg-primary/20 text-primary text-xs border-0">
                        Nowe ćwiczenie
                      </Badge>
                    )}
                    {exDecision?.action === 'skip' && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Nie importowane
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
