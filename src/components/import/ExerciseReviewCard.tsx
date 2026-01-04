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
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
 * Karta ćwiczenia do review z opcjami: utwórz nowe, użyj istniejącego, pomiń
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.5) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Bardzo wysoka';
    if (confidence >= 0.8) return 'Wysoka';
    if (confidence >= 0.6) return 'Średnia';
    if (confidence >= 0.4) return 'Niska';
    return 'Bardzo niska';
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        decision.action === 'skip' && 'opacity-50',
        decision.action === 'reuse' && 'border-blue-500/30 bg-blue-500/5',
        decision.action === 'create' && 'border-primary/30 bg-primary/5',
        className
      )}
    >
      <CardContent className="p-4">
        {/* AI Suggestion banner */}
        {aiSuggestsReuse && decision.action === 'create' && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-sm">
            <Zap className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-blue-600">
              AI sugeruje użycie: <strong>{bestMatch.existingExerciseName}</strong>
            </span>
            <Badge variant="secondary" className="ml-auto shrink-0 text-xs bg-blue-500/20 text-blue-600 border-0">
              {Math.round(bestMatch.confidence * 100)}% podobne
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onDecisionChange({
                  action: 'reuse',
                  reuseExerciseId: bestMatch.existingExerciseId,
                });
              }}
              className="shrink-0 h-7 text-xs"
            >
              Użyj
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              decision.action === 'reuse'
                ? 'bg-blue-500/20'
                : decision.action === 'create'
                ? 'bg-primary/20'
                : 'bg-surface-light'
            )}
          >
            <Dumbbell
              className={cn(
                'h-5 w-5',
                decision.action === 'reuse'
                  ? 'text-blue-500'
                  : decision.action === 'create'
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">
                {exercise.name}
              </h3>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {getTypeLabel(exercise.type)}
              </Badge>
              {hasMatches && (
                <Badge
                  variant="secondary"
                  className="shrink-0 text-xs bg-blue-500/10 text-blue-600 border-0"
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  {matchSuggestions.length} dopas.
                </Badge>
              )}
            </div>

            {/* Parametry */}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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
              {exercise.holdTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {exercise.holdTime}s utrzymania
                </span>
              )}
            </div>

            {/* Match info when reuse selected */}
            {decision.action === 'reuse' && selectedMatch && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Link2 className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600">
                  Użyj: {selectedMatch.existingExerciseName}
                </span>
                <span className={cn('text-xs', getConfidenceColor(selectedMatch.confidence))}>
                  ({Math.round(selectedMatch.confidence * 100)}% podobieństwa)
                </span>
              </div>
            )}

            {/* Confidence indicator */}
            <div className="mt-2 flex items-center gap-2">
              <Sparkles className={cn('h-3.5 w-3.5 shrink-0', getConfidenceColor(exercise.confidence))} />
              <div className="flex-1 max-w-32">
                <Progress
                  value={exercise.confidence * 100}
                  className="h-1.5"
                  indicatorClassName={getConfidenceBgColor(exercise.confidence)}
                />
              </div>
              <span className={cn('text-xs', getConfidenceColor(exercise.confidence))}>
                {getConfidenceLabel(exercise.confidence)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-1">
            <Button
              variant={decision.action === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDecisionChange({ action: 'create', reuseExerciseId: undefined })}
              className={cn(
                'h-8',
                decision.action === 'create' && 'bg-primary hover:bg-primary-dark'
              )}
              title="Utwórz nowe ćwiczenie"
            >
              <Check className="h-4 w-4" />
            </Button>

            {hasMatches && (
              <Button
                variant={decision.action === 'reuse' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowMatches(!showMatches)}
                className={cn(
                  'h-8',
                  decision.action === 'reuse' && 'bg-blue-500 hover:bg-blue-600'
                )}
                title="Użyj istniejącego ćwiczenia"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant={decision.action === 'skip' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDecisionChange({ action: 'skip', reuseExerciseId: undefined })}
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

        {/* Match suggestions dropdown */}
        {showMatches && hasMatches && (
          <div className="mt-4 space-y-2 rounded-lg bg-surface-light p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Znalezione podobne ćwiczenia:
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
                  'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors',
                  decision.reuseExerciseId === match.existingExerciseId
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'hover:bg-surface-hover'
                )}
              >
                {match.imageUrl ? (
                  <img
                    src={match.imageUrl}
                    alt={match.existingExerciseName}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {match.existingExerciseName}
                    </p>
                    {index === 0 && match.confidence >= 0.7 && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] bg-blue-500/20 text-blue-600 border-0">
                        Najlepsze
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {match.matchReason}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', getConfidenceColor(match.confidence))}
                  >
                    {Math.round(match.confidence * 100)}%
                  </Badge>
                  <Progress
                    value={match.confidence * 100}
                    className="h-1 w-12"
                    indicatorClassName={getConfidenceBgColor(match.confidence)}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            {exercise.description && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Opis:
                </p>
                <p className="text-sm text-foreground">{exercise.description}</p>
              </div>
            )}

            {exercise.suggestedTags.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Sugerowane kategorie:
                </p>
                <div className="flex flex-wrap gap-1">
                  {exercise.suggestedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {exercise.originalText && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Oryginalny tekst:
                </p>
                <p className="rounded-lg bg-surface-light p-2 text-xs text-muted-foreground italic">
                  &quot;{exercise.originalText}&quot;
                </p>
              </div>
            )}

            {exercise.notes && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Notatki:
                </p>
                <p className="text-sm text-foreground">{exercise.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
