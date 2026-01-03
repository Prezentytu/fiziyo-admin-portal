'use client';

import { useState, useCallback, useMemo } from 'react';
import { Sparkles, Loader2, Check, X, RefreshCw, Wand2, AlertCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';
import { cn } from '@/lib/utils';
import { chatService } from '@/services/chatService';
import type { ParsedExercise } from '@/types/chat.types';

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
  aiExercise: ParsedExercise;
  matchedExercise: Exercise | null;
  matchScore: number; // 0-1
}

interface AISetGeneratorProps {
  exercises: Exercise[];
  onSelectExercises: (exerciseIds: string[]) => void;
  onCancel: () => void;
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

// Parse AI response to extract exercises
function parseExercisesFromResponse(response: string): ParsedExercise[] {
  const exercises: ParsedExercise[] = [];

  // Try to parse JSON blocks if present
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Continue with text parsing
    }
  }

  // Parse numbered list format
  const lines = response.split('\n');
  let currentExercise: Partial<ParsedExercise> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Match numbered exercise (e.g., "1. Unoszenie prostych nóg")
    const numberedMatch = trimmed.match(/^\d+\.\s*\*?\*?(.+?)\*?\*?\s*$/);
    if (numberedMatch) {
      if (currentExercise && currentExercise.name) {
        exercises.push({
          name: currentExercise.name,
          tags: currentExercise.tags || [],
          description: currentExercise.description || '',
          sets: currentExercise.sets,
          reps: currentExercise.reps,
        });
      }
      currentExercise = { name: numberedMatch[1].replace(/\*\*/g, '').trim(), tags: [], description: '' };
      continue;
    }

    // Match exercise name in bold (e.g., "**Przysiady**")
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*[-:]?\s*(.*)$/);
    if (boldMatch && !currentExercise) {
      currentExercise = { name: boldMatch[1].trim(), tags: [], description: boldMatch[2] || '' };
      continue;
    }

    // Add description to current exercise
    if (currentExercise && trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('•')) {
      if (!currentExercise.description) {
        currentExercise.description = trimmed;
      }
    }

    // Parse sets/reps
    const setsMatch = trimmed.match(/(\d+)\s*seri[ie]/i);
    const repsMatch = trimmed.match(/(\d+)\s*powt[oó]rze[nń]/i);
    if (setsMatch && currentExercise) {
      currentExercise.sets = setsMatch[1];
    }
    if (repsMatch && currentExercise) {
      currentExercise.reps = repsMatch[1];
    }
  }

  // Add last exercise
  if (currentExercise && currentExercise.name) {
    exercises.push({
      name: currentExercise.name,
      tags: currentExercise.tags || [],
      description: currentExercise.description || '',
      sets: currentExercise.sets,
      reps: currentExercise.reps,
    });
  }

  return exercises;
}

// Match AI exercises to database exercises
function matchExercises(aiExercises: ParsedExercise[], dbExercises: Exercise[]): GeneratedExerciseMatch[] {
  return aiExercises.map((aiEx) => {
    const aiName = aiEx.name.toLowerCase().trim();

    // Try exact match first
    let bestMatch: Exercise | null = null;
    let bestScore = 0;

    for (const dbEx of dbExercises) {
      const dbName = dbEx.name.toLowerCase().trim();

      // Exact match
      if (dbName === aiName) {
        bestMatch = dbEx;
        bestScore = 1;
        break;
      }

      // Partial match - check if names contain each other
      if (dbName.includes(aiName) || aiName.includes(dbName)) {
        const score = Math.min(aiName.length, dbName.length) / Math.max(aiName.length, dbName.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = dbEx;
        }
      }

      // Word-based matching
      const aiWords = aiName.split(/\s+/).filter((w) => w.length > 2);
      const dbWords = dbName.split(/\s+/).filter((w) => w.length > 2);
      const matchingWords = aiWords.filter((w) => dbWords.some((dw) => dw.includes(w) || w.includes(dw)));
      const wordScore = matchingWords.length / Math.max(aiWords.length, 1);

      if (wordScore > bestScore && wordScore > 0.3) {
        bestScore = wordScore;
        bestMatch = dbEx;
      }
    }

    return {
      aiExercise: aiEx,
      matchedExercise: bestScore > 0.3 ? bestMatch : null,
      matchScore: bestScore,
    };
  });
}

export function AISetGenerator({
  exercises,
  onSelectExercises,
  onCancel,
  patientContext,
  className,
}: AISetGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMatches, setGeneratedMatches] = useState<GeneratedExerciseMatch[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build prompt with patient context
  const buildPrompt = useCallback(
    (basePrompt: string) => {
      let fullPrompt = basePrompt;

      if (patientContext) {
        const contextParts: string[] = [];
        if (patientContext.patientName) {
          contextParts.push(`Pacjent: ${patientContext.patientName}`);
        }
        if (patientContext.diagnosis && patientContext.diagnosis.length > 0) {
          contextParts.push(`Diagnoza: ${patientContext.diagnosis.join(', ')}`);
        }
        if (patientContext.painLocation) {
          contextParts.push(`Lokalizacja bólu: ${patientContext.painLocation}`);
        }

        if (contextParts.length > 0) {
          fullPrompt = `${contextParts.join('. ')}.\n\n${basePrompt}`;
        }
      }

      return `Jako fizjoterapeuta, zaproponuj zestaw 5-8 ćwiczeń. Dla każdego podaj nazwę i krótki opis. Format: numerowana lista z nazwami ćwiczeń.\n\n${fullPrompt}`;
    },
    [patientContext]
  );

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
        const fullPrompt = buildPrompt(promptToUse);
        const response = await chatService.sendMessage(fullPrompt);

        const responseText = response.response?.response || '';
        if (!responseText) {
          throw new Error('Brak odpowiedzi od AI');
        }

        const parsedExercises = parseExercisesFromResponse(responseText);
        if (parsedExercises.length === 0) {
          throw new Error('Nie udało się rozpoznać ćwiczeń w odpowiedzi');
        }

        const matches = matchExercises(parsedExercises, exercises);
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
        toast.success(`Wygenerowano ${parsedExercises.length} ćwiczeń, dopasowano ${matchedCount}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Wystąpił błąd podczas generowania';
        setError(message);
        toast.error(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [prompt, exercises, buildPrompt]
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
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI Generator zestawów</h3>
            <p className="text-xs text-muted-foreground">Opisz potrzeby pacjenta, AI zaproponuje ćwiczenia</p>
          </div>
        </div>

        {/* Patient context banner */}
        {patientContext && (patientContext.diagnosis?.length || patientContext.painLocation) && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 mb-4">
            <p className="text-xs text-primary font-medium">Kontekst pacjenta:</p>
            <p className="text-xs text-muted-foreground mt-1">
              {patientContext.diagnosis?.join(', ')}
              {patientContext.painLocation && ` • ${patientContext.painLocation}`}
            </p>
          </div>
        )}

        {/* Input */}
        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="np. Rehabilitacja po skręceniu kostki, faza 2, pacjent aktywny sportowo..."
            className="min-h-[80px] resize-none"
            disabled={isGenerating}
          />

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="gap-2 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generowanie...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Wygeneruj zestaw
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
            <p className="text-xs text-muted-foreground mb-2">Szybkie prompty:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.id}
                  type="button"
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  className="px-2.5 py-1 rounded-md text-xs bg-surface-light hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
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
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-violet-500 animate-pulse" />
                </div>
                <Loader2 className="absolute -top-1 -right-1 h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">AI analizuje potrzeby...</p>
            </div>
          )}

          {generatedMatches.length > 0 && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">
                  Wygenerowano: <span className="font-semibold text-foreground">{generatedMatches.length}</span>
                </span>
                <span className="text-muted-foreground">
                  Dopasowano: <span className="font-semibold text-primary">{matchedCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Wybrano: <span className="font-semibold text-foreground">{selectedCount}</span>
                </span>
              </div>

              {/* Matched exercises */}
              <div className="space-y-2">
                {generatedMatches.map((match, index) => {
                  if (!match.matchedExercise) return null;
                  const isSelected = selectedMatchIds.has(`${index}`);
                  const imageUrl = getMediaUrl(match.matchedExercise.imageUrl || match.matchedExercise.images?.[0]);

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleMatch(index)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                        isSelected ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-surface hover:bg-surface-light'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>

                      <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{match.matchedExercise.name}</p>
                        <p className="text-xs text-muted-foreground truncate">AI: {match.aiExercise.name}</p>
                      </div>

                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {Math.round(match.matchScore * 100)}% match
                      </Badge>
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
                            className="flex items-center gap-3 p-3 rounded-xl bg-surface-light/50 opacity-60"
                          >
                            <X className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{match.aiExercise.name}</p>
                              <p className="text-xs text-muted-foreground">Nie znaleziono w bazie</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled>
                              <Plus className="h-3 w-3" />
                              Utwórz
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
      <div className="p-4 border-t border-border flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onCancel}>
          Anuluj
        </Button>

        {generatedMatches.length > 0 && (
          <Button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="gap-2 bg-gradient-to-br from-primary to-primary-dark"
          >
            <Check className="h-4 w-4" />
            Dodaj {selectedCount} ćwiczeń
          </Button>
        )}
      </div>
    </div>
  );
}


