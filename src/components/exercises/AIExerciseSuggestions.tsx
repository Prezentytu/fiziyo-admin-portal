'use client';

import { Sparkles, Wand2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { ExerciseSuggestionResponse } from '@/types/ai.types';

interface AIExerciseSuggestionsProps {
  suggestion: ExerciseSuggestionResponse | null;
  isLoading: boolean;
  onApply: () => void;
  onDismiss: () => void;
  className?: string;
}

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  reps: 'Powtórzenia',
  time: 'Czasowe',
};

/**
 * Komponent wyświetlający sugestie AI dla ćwiczenia
 */
export function AIExerciseSuggestions({
  suggestion,
  isLoading,
  onApply,
  onDismiss,
  className,
}: AIExerciseSuggestionsProps) {
  if (!suggestion && !isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent',
        'p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300',
        'animate-ai-glow',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-primary">
          <div className="relative">
            <Sparkles className="h-4 w-4" />
            {isLoading && (
              <span className="absolute -inset-1 animate-ping rounded-full bg-primary/30" />
            )}
          </div>
          <span className="font-medium">Sugestie AI</span>
          {isLoading && (
            <div className="flex items-center gap-1">
              <span className="animate-typing-dot" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-typing-dot" style={{ animationDelay: '200ms' }}>.</span>
              <span className="animate-typing-dot" style={{ animationDelay: '400ms' }}>.</span>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          <div className="h-4 bg-surface-light rounded animate-shimmer" style={{ width: '90%' }} />
          <div className="h-4 bg-surface-light rounded animate-shimmer" style={{ width: '75%' }} />
          <div className="h-4 bg-surface-light rounded animate-shimmer" style={{ width: '60%' }} />
        </div>
      )}

      {/* Suggestion content */}
      {suggestion && !isLoading && (
        <>
          {/* Description */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {suggestion.description}
            </p>
          </div>

          {/* Parameters */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {EXERCISE_TYPE_LABELS[suggestion.type] || suggestion.type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {suggestion.sets} serii
            </Badge>
            {suggestion.type === 'reps' && suggestion.reps && (
              <Badge variant="outline" className="text-xs">{suggestion.reps} powt.</Badge>
            )}
            {suggestion.type !== 'reps' && suggestion.duration && (
              <Badge variant="outline" className="text-xs">{suggestion.duration}s</Badge>
            )}
            {suggestion.suggestedTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs text-primary border-primary/30">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Apply button */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Zastosuj
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
