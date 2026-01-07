'use client';

import { useState } from 'react';
import {
  Dumbbell,
  Check,
  Link2,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Repeat,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type {
  ExtractedExercise,
  MatchSuggestion,
  ExerciseDecision,
} from '@/types/import.types';

interface ExerciseReviewCardProps {
  exercise: ExtractedExercise;
  matchSuggestions: MatchSuggestion[];
  decision: ExerciseDecision;
  onDecisionChange: (decision: Partial<ExerciseDecision>) => void;
  className?: string;
}

/**
 * Karta ćwiczenia do review - uproszczona dla użytkowników 45+
 * Przyciski z tekstem, jasne etykiety, bez rozpraszających elementów
 */
export function ExerciseReviewCard({
  exercise,
  matchSuggestions,
  decision,
  onDecisionChange,
  className,
}: ExerciseReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMatches, setShowMatches] = useState(false);

  const hasMatches = matchSuggestions.length > 0;
  const bestMatch = matchSuggestions[0];
  const selectedMatch = matchSuggestions.find(
    (m) => m.existingExerciseId === decision.reuseExerciseId
  );

  // Czy AI sugeruje użycie istniejącego (wysoka pewność dopasowania)
  const aiSuggestsReuse = bestMatch && bestMatch.confidence >= 0.7;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reps':
        return 'Powtórzenia';
      case 'time':
        return 'Czasowe';
      case 'hold':
        return 'Utrzymanie';
      default:
        return type;
    }
  };

  // Prosty label zgodności (słowny, nie %)
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Wysoka zgodność';
    if (confidence >= 0.5) return 'Średnia zgodność';
    return 'Niska zgodność';
  };

  const getConfidenceBadgeClass = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/20 text-green-600 border-0';
    if (confidence >= 0.5) return 'bg-yellow-500/20 text-yellow-600 border-0';
    return 'bg-orange-500/20 text-orange-600 border-0';
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors duration-200',
        decision.action === 'skip' && 'opacity-60',
        decision.action === 'reuse' && 'border-blue-500/40 bg-blue-500/5',
        decision.action === 'create' && 'border-primary/40 bg-primary/5',
        className
      )}
      data-testid={`import-exercise-card-${exercise.tempId}`}
    >
      <CardContent className="p-5">
        {/* Header z nazwą i parametrami */}
        <div className="flex items-start gap-4">
          {/* Ikona */}
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              decision.action === 'reuse'
                ? 'bg-blue-500/20'
                : decision.action === 'create'
                ? 'bg-primary/20'
                : 'bg-surface-light'
            )}
          >
            <Dumbbell
              className={cn(
                'h-6 w-6',
                decision.action === 'reuse'
                  ? 'text-blue-500'
                  : decision.action === 'create'
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            />
          </div>

          {/* Treść */}
          <div className="min-w-0 flex-1">
            {/* Nazwa - większa, wyraźniejsza */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground">
                {exercise.name}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {getTypeLabel(exercise.type)}
              </Badge>
            </div>

            {/* Parametry ćwiczenia */}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {exercise.sets && (
                <span className="flex items-center gap-1.5">
                  <Repeat className="h-4 w-4" />
                  {exercise.sets} serii
                </span>
              )}
              {exercise.reps && (
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="h-4 w-4" />
                  {exercise.reps} powtórzeń
                </span>
              )}
              {exercise.duration && (
                <span className="flex items-center gap-1.5">
                  <Timer className="h-4 w-4" />
                  {exercise.duration} sekund
                </span>
              )}
              {exercise.holdTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {exercise.holdTime}s utrzymania
                </span>
              )}
            </div>

            {/* AI Suggestion - prosta forma */}
            {aiSuggestsReuse && decision.action !== 'reuse' && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  AI sugeruje:
                </span>
                <span className="text-sm font-medium text-blue-600">
                  {bestMatch.existingExerciseName}
                </span>
                <Badge variant="secondary" className={cn('text-xs', getConfidenceBadgeClass(bestMatch.confidence))}>
                  {getConfidenceLabel(bestMatch.confidence)}
                </Badge>
              </div>
            )}

            {/* Info o wybranym dopasowaniu */}
            {decision.action === 'reuse' && selectedMatch && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Link2 className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600 font-medium">
                  Używasz: {selectedMatch.existingExerciseName}
                </span>
              </div>
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

        {/* Przyciski akcji - Z TEKSTEM, jasne etykiety */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={decision.action === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDecisionChange({ action: 'create', reuseExerciseId: undefined })}
            className={cn(
              'gap-2 h-9 px-4',
              decision.action === 'create' && 'bg-primary hover:bg-primary-dark'
            )}
            data-testid={`import-exercise-card-${exercise.tempId}-create-btn`}
          >
            <Check className="h-4 w-4" />
            Utwórz nowe
          </Button>

          {hasMatches && (
            <Button
              variant={decision.action === 'reuse' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (decision.action === 'reuse') {
                  setShowMatches(!showMatches);
                } else {
                  // Automatycznie wybierz najlepsze dopasowanie
                  onDecisionChange({
                    action: 'reuse',
                    reuseExerciseId: bestMatch.existingExerciseId,
                  });
                }
              }}
              className={cn(
                'gap-2 h-9 px-4',
                decision.action === 'reuse' && 'bg-blue-500 hover:bg-blue-600'
              )}
            >
              <Link2 className="h-4 w-4" />
              {decision.action === 'reuse' ? 'Zmień dopasowanie' : 'Użyj istniejącego'}
            </Button>
          )}

          <Button
            variant={decision.action === 'skip' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onDecisionChange({ action: 'skip', reuseExerciseId: undefined })}
            className={cn(
              'gap-2 h-9 px-4',
              decision.action === 'skip' && 'bg-muted text-muted-foreground'
            )}
            data-testid={`import-exercise-card-${exercise.tempId}-skip-btn`}
          >
            <X className="h-4 w-4" />
            Pomiń
          </Button>
        </div>

        {/* Lista dopasowań - uproszczona */}
        {showMatches && hasMatches && (
          <div className="mt-4 space-y-2 rounded-xl bg-surface-light p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              Wybierz istniejące ćwiczenie:
            </p>
            {matchSuggestions.map((match, index) => (
              <button
                key={match.existingExerciseId}
                onClick={() => {
                  onDecisionChange({
                    action: 'reuse',
                    reuseExerciseId: match.existingExerciseId,
                  });
                  setShowMatches(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                  decision.reuseExerciseId === match.existingExerciseId
                    ? 'bg-blue-500/20 border-2 border-blue-500/40'
                    : 'bg-surface hover:bg-surface-hover border-2 border-transparent'
                )}
              >
                {match.imageUrl ? (
                  <img
                    src={match.imageUrl}
                    alt={match.existingExerciseName}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-hover">
                    <Dumbbell className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {match.existingExerciseName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {match.matchReason}
                  </p>
                </div>
                <div className="shrink-0">
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', getConfidenceBadgeClass(match.confidence))}
                  >
                    {index === 0 ? 'Najlepsze' : getConfidenceLabel(match.confidence)}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Rozwinięte szczegóły */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
            {exercise.description && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Opis:
                </p>
                <p className="text-sm text-muted-foreground">{exercise.description}</p>
              </div>
            )}

            {exercise.suggestedTags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Sugerowane kategorie:
                </p>
                <div className="flex flex-wrap gap-2">
                  {exercise.suggestedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {exercise.originalText && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Oryginalny tekst z dokumentu:
                </p>
                <p className="rounded-lg bg-surface-light p-3 text-sm text-muted-foreground italic">
                  &quot;{exercise.originalText}&quot;
                </p>
              </div>
            )}

            {exercise.notes && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Notatki:
                </p>
                <p className="text-sm text-muted-foreground">{exercise.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
