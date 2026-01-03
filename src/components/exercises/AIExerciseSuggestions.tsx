'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles,
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Shield,
  Shuffle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import {
  exerciseAIService,
  type ExerciseSuggestion
} from '@/services/exerciseAIService';

interface AIExerciseSuggestionsProps {
  exerciseName: string;
  suggestion: ExerciseSuggestion | null;
  isLoading: boolean;
  onApply: () => void;
  onDismiss: () => void;
  className?: string;
}

const EXERCISE_TYPE_LABELS = {
  reps: 'Powtórzenia',
  time: 'Czasowe',
  hold: 'Utrzymywanie',
};

/**
 * Komponent wyświetlający sugestie AI dla ćwiczenia
 * z animacjami typing effect i możliwością rozszerzenia opisu
 */
export function AIExerciseSuggestions({
  exerciseName,
  suggestion,
  isLoading,
  onApply,
  onDismiss,
  className,
}: AIExerciseSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [enhancementType, setEnhancementType] = useState<'technical' | 'safety' | 'variations' | null>(null);
  const [enhancedContent, setEnhancedContent] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Enhance description with AI
  const handleEnhance = useCallback(async (type: 'technical' | 'safety' | 'variations') => {
    if (!suggestion || isEnhancing) return;

    setEnhancementType(type);
    setIsEnhancing(true);

    try {
      const result = await exerciseAIService.enhanceDescription(
        exerciseName,
        suggestion.description,
        type
      );
      if (result) {
        setEnhancedContent(result);
      } else {
        toast.error('Nie udało się wygenerować rozszerzenia');
      }
    } catch {
      toast.error('Błąd podczas generowania');
    } finally {
      setIsEnhancing(false);
    }
  }, [exerciseName, suggestion, isEnhancing]);

  if (!suggestion && !isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent",
        "p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300",
        "animate-ai-glow",
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

            {/* Enhanced content */}
            {enhancedContent && (
              <div className="p-3 rounded-lg bg-surface/50 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 text-xs text-primary mb-1.5">
                  {enhancementType === 'technical' && <FileText className="h-3 w-3" />}
                  {enhancementType === 'safety' && <Shield className="h-3 w-3" />}
                  {enhancementType === 'variations' && <Shuffle className="h-3 w-3" />}
                  <span className="font-medium">
                    {enhancementType === 'technical' && 'Szczegóły techniczne'}
                    {enhancementType === 'safety' && 'Wskazówki bezpieczeństwa'}
                    {enhancementType === 'variations' && 'Warianty ćwiczenia'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{enhancedContent}</p>
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {EXERCISE_TYPE_LABELS[suggestion.type]}
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
            {suggestion.suggestedTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs text-primary border-primary/30">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Expandable AI actions */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
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

              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                >
                  Rozszerz opis
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="pt-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhance('technical')}
                  disabled={isEnhancing}
                  className="gap-1.5 text-xs"
                >
                  <FileText className="h-3 w-3" />
                  Szczegóły techniczne
                  {isEnhancing && enhancementType === 'technical' && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhance('safety')}
                  disabled={isEnhancing}
                  className="gap-1.5 text-xs"
                >
                  <Shield className="h-3 w-3" />
                  Bezpieczeństwo
                  {isEnhancing && enhancementType === 'safety' && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhance('variations')}
                  disabled={isEnhancing}
                  className="gap-1.5 text-xs"
                >
                  <Shuffle className="h-3 w-3" />
                  Warianty
                  {isEnhancing && enhancementType === 'variations' && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
