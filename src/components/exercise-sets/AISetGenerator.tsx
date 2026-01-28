'use client';

import { useState, useCallback, useMemo } from 'react';
import { Sparkles, Loader2, Check, X, RefreshCw, AlertCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';
import { cn } from '@/lib/utils';
import { aiService } from '@/services/aiService';
import type { GeneratedExercise as AIGeneratedExercise } from '@/types/ai.types';

interface ExerciseTag {
  id: string;
  name: string;
  color?: string;
}

interface Exercise {
  id: string;
  name: string;
  type?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  exerciseSide?: string;
  mainTags?: ExerciseTag[];
  additionalTags?: ExerciseTag[];
}

interface GeneratedExerciseMatch {
  aiExercise: AIGeneratedExercise;
  matchedExercise: Exercise | null;
}

interface AISetGeneratorProps {
  exercises: Exercise[];
  onSelectExercises: (exerciseIds: string[]) => void;
  onCancel: () => void;
  setName: string;
  onSetNameChange: (name: string) => void;
  patientContext?: {
    patientName?: string;
    diagnosis?: string[];
    painLocation?: string;
  };
  className?: string;
}

// Prompt templates for exercise set generation
const QUICK_PROMPTS = [
  {
    id: 'acl',
    label: 'Rehabilitacja ACL',
    prompt: 'Zaproponuj zestaw ćwiczeń do rehabilitacji po rekonstrukcji ACL, faza 2',
  },
  {
    id: 'lbp',
    label: 'Ból dolnego odcinka',
    prompt: 'Zestaw ćwiczeń na ból dolnego odcinka kręgosłupa dla osoby pracującej siedząco',
  },
  {
    id: 'shoulder',
    label: 'Bark - mobilność',
    prompt: 'Ćwiczenia na poprawę mobilności barku i wzmocnienie rotatorów',
  },
  { id: 'knee', label: 'Kolano - wzmocnienie', prompt: 'Ćwiczenia wzmacniające mięśnie stabilizujące kolano' },
  { id: 'core', label: 'Core - stabilizacja', prompt: 'Zestaw ćwiczeń stabilizacyjnych na core dla początkujących' },
  { id: 'posture', label: 'Korekta postawy', prompt: 'Ćwiczenia korygujące postawę przy pracy biurowej' },
];

// Find exercise by matched name from AI response
function findExerciseByName(matchedName: string | null, dbExercises: Exercise[]): Exercise | null {
  if (!matchedName) return null;

  const lowerName = matchedName.toLowerCase().trim();

  // Try exact match first
  const exactMatch = dbExercises.find(e => e.name.toLowerCase().trim() === lowerName);
  if (exactMatch) return exactMatch;

  // Try partial match
  const partialMatch = dbExercises.find(e =>
    e.name.toLowerCase().includes(lowerName) ||
    lowerName.includes(e.name.toLowerCase())
  );

  return partialMatch || null;
}

export function AISetGenerator({
  exercises,
  onSelectExercises,
  onCancel,
  setName,
  onSetNameChange,
  patientContext,
  className,
}: AISetGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMatches, setGeneratedMatches] = useState<GeneratedExerciseMatch[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get exercise names for AI matching
  const exerciseNames = useMemo(() => exercises.map(e => e.name), [exercises]);

  const handleGenerate = useCallback(
    async (customPrompt?: string) => {
      const promptToUse = customPrompt || prompt;
      if (!promptToUse.trim()) {
        toast.error('Wpisz opis potrzeb pacjenta');
        return;
      }

      setIsGenerating(true);
      setError(null);
      setGeneratedMatches([]);
      setSelectedMatchIds(new Set());

      try {
        // Use new AI service with structured JSON response
        const response = await aiService.generateExerciseSet(
          promptToUse,
          patientContext,
          exerciseNames
        );

        if (!response || response.exercises.length === 0) {
          throw new Error('Nie udało się wygenerować ćwiczeń');
        }

        // Map AI exercises to matches with database exercises
        const matches: GeneratedExerciseMatch[] = response.exercises.map(aiEx => ({
          aiExercise: aiEx,
          matchedExercise: findExerciseByName(aiEx.matchedExerciseName, exercises),
        }));

        setGeneratedMatches(matches);

        // Auto-select matched exercises
        const matchedIds = new Set<string>();
        matches.forEach((match, index) => {
          if (match.matchedExercise) {
            matchedIds.add(`${index}`);
          }
        });
        setSelectedMatchIds(matchedIds);

        const matchedCount = matches.filter((m) => m.matchedExercise).length;
        toast.success(`Wygenerowano ${response.exercises.length} ćwiczeń, dopasowano ${matchedCount}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Wystąpił błąd podczas generowania';
        setError(message);
        toast.error(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [prompt, exercises, exerciseNames, patientContext]
  );

  const handleQuickPrompt = useCallback(
    (quickPrompt: string) => {
      setPrompt(quickPrompt);
      handleGenerate(quickPrompt);
    },
    [handleGenerate]
  );

  const toggleMatch = useCallback((index: number) => {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev);
      const key = `${index}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const selectedExerciseIds: string[] = [];

    generatedMatches.forEach((match, index) => {
      if (selectedMatchIds.has(`${index}`) && match.matchedExercise) {
        selectedExerciseIds.push(match.matchedExercise.id);
      }
    });

    if (selectedExerciseIds.length === 0) {
      toast.error('Wybierz przynajmniej jedno ćwiczenie');
      return;
    }

    onSelectExercises(selectedExerciseIds);
  }, [generatedMatches, selectedMatchIds, onSelectExercises]);

  // Stats
  const matchedCount = generatedMatches.filter((m) => m.matchedExercise).length;
  const unmatchedCount = generatedMatches.length - matchedCount;
  const selectedCount = Array.from(selectedMatchIds).filter((id) => {
    const match = generatedMatches[parseInt(id)];
    return match?.matchedExercise;
  }).length;

  return (
    <div className={cn('flex flex-col h-full bg-surface', className)}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-secondary/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">Asystent doboru ćwiczeń</span>
              <p className="text-[10px] text-muted-foreground">Opisz cel terapii - dopasuję z Twojej bazy</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-surface-light" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Patient context banner */}
        {patientContext && (patientContext.diagnosis?.length || patientContext.painLocation) && (
          <div className="rounded-xl bg-surface-light border border-border p-3 mb-4">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Kontekst pacjenta
            </span>
            <p className="text-xs text-foreground mt-1">
              {patientContext.diagnosis?.join(', ')}
              {patientContext.painLocation && ` • ${patientContext.painLocation}`}
            </p>
          </div>
        )}

        {/* Set name input */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Nazwa zestawu
          </span>
          <Input
            id="ai-set-name"
            value={setName}
            onChange={(e) => onSetNameChange(e.target.value)}
            placeholder="np. Rehabilitacja kolana - tydzień 1"
            className="h-10 bg-surface border-border focus:border-primary/50 placeholder:text-muted-foreground/50"
            disabled={isGenerating}
          />
        </div>

        {/* Prompt input */}
        <div className="space-y-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Opisz cel terapii
          </span>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="np. Rehabilitacja po skręceniu kostki, faza 2, pacjent aktywny sportowo..."
            className="min-h-[80px] resize-none bg-surface border-border focus:border-primary/50 placeholder:text-muted-foreground/50"
            disabled={isGenerating}
          />

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="gap-2 bg-secondary hover:bg-secondary/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Szukam ćwiczeń...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Zaproponuj ćwiczenia
                </>
              )}
            </Button>

            {generatedMatches.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                title="Wygeneruj ponownie"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick prompts */}
        {generatedMatches.length === 0 && !isGenerating && (
          <div className="mt-4">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Popularne scenariusze
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.id}
                  type="button"
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-surface-light border border-border hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-4">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-secondary animate-pulse" />
                </div>
                <Loader2 className="absolute -top-1 -right-1 h-6 w-6 animate-spin text-secondary" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">Szukam pasujących ćwiczeń...</p>
            </div>
          )}

          {generatedMatches.length > 0 && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] sm:text-xs">
                <span className="text-muted-foreground whitespace-nowrap">
                  Wygenerowano: <span className="font-semibold text-foreground">{generatedMatches.length}</span>
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  Dopasowano: <span className="font-semibold text-primary">{matchedCount}</span>
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  Wybrano: <span className="font-semibold text-foreground">{selectedCount}</span>
                </span>
              </div>

              {/* Matched exercises */}
              <div className="grid gap-2">
                {generatedMatches.map((match, index) => {
                  if (!match.matchedExercise) return null;
                  const isSelected = selectedMatchIds.has(`${index}`);
                  const imageUrl = getMediaUrl(match.matchedExercise.imageUrl || match.matchedExercise.images?.[0]);

                  return (
                    <button
                      key={match.matchedExercise.id}
                      type="button"
                      onClick={() => toggleMatch(index)}
                      className={cn(
                        'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all border',
                        isSelected 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'bg-surface-light border-border hover:bg-surface-hover'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all mt-0.5',
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>

                      <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-surface mt-0.5">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm leading-tight mb-1">{match.matchedExercise.name}</p>
                          <Badge variant="secondary" className="text-[9px] px-1.5 h-4 shrink-0 bg-primary/10 text-primary border-none hidden sm:flex">
                            Dopasowane
                          </Badge>
                        </div>
                        {match.aiExercise.reasoning && (
                          <p className="text-xs text-muted-foreground leading-normal line-clamp-2 sm:line-clamp-none">
                            {match.aiExercise.reasoning}
                          </p>
                        )}
                        <Badge variant="secondary" className="text-[9px] px-1.5 h-4 mt-2 shrink-0 bg-primary/10 text-primary border-none flex sm:hidden w-fit">
                          Dopasowane
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Unmatched exercises */}
              {unmatchedCount > 0 && (
                <Collapsible open={showUnmatched} onOpenChange={setShowUnmatched}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {showUnmatched ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {unmatchedCount} niedopasowanych ćwiczeń
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2">
                      {generatedMatches.map((match, index) => {
                        if (match.matchedExercise) return null;
                        return (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-xl bg-surface-light/50 border border-border/50 opacity-60"
                          >
                            <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight mb-1">{match.aiExercise.name}</p>
                              <p className="text-xs text-muted-foreground">Nie znaleziono w bazie</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 gap-1 shrink-0" disabled>
                              <Plus className="h-3 w-3" />
                              <span className="hidden xs:inline">Utwórz</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex-1 border-zinc-700 hover:bg-zinc-800"
          >
            Zamknij
          </Button>
          {generatedMatches.length > 0 && (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Dodaj {selectedCount} ćwiczeń
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
