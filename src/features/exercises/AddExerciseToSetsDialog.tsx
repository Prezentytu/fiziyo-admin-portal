'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Search,
  Loader2,
  Plus,
  FolderPlus,
  ChevronRight,
  Check,
  Sparkles,
  Wand2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import { formatDurationPolish } from '@/utils/durationPolish';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';

import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { aiService } from '@/services/aiService';

// ============================================
// Types
// ============================================

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
  thumbnailUrl?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultExecutionTime?: number;
  mainTags?: (string | ExerciseTag)[];
  additionalTags?: (string | ExerciseTag)[];
}

interface ExerciseInSet {
  id: string;
  name: string;
  type?: string;
  imageUrl?: string;
  images?: string[];
  thumbnailUrl?: string;
  mainTags?: string[];
  additionalTags?: string[];
}

interface ExerciseMapping {
  exerciseId: string;
  exercise: ExerciseInSet;
}

interface ExerciseSetFromDB {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  creationTime?: string;
  exerciseMappings?: ExerciseMapping[];
}

interface RankedSet {
  set: ExerciseSetFromDB;
  score: number;
  reasoning: string;
  isAlreadyAdded: boolean;
}

interface SimilarSetCandidate {
  setId: string;
  setName: string;
  similarity: number;
  isAlreadyAdded: boolean;
}

interface AddExerciseToSetsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly exercise: Exercise | null;
}

type Step = 'select-set' | 'preview-set' | 'create-set' | 'success';

// ============================================
// Smart Matching Algorithm
// ============================================

function getTagNames(tags: (string | ExerciseTag)[] | undefined): string[] {
  if (!tags) return [];
  return tags.map((tag) => (typeof tag === 'string' ? tag : tag.name));
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9\s]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function calculateNameSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeForComparison(left);
  const normalizedRight = normalizeForComparison(right);

  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return 0.88;

  const leftTokens = new Set(normalizedLeft.split(' ').filter((token) => token.length > 2));
  const rightTokens = new Set(normalizedRight.split(' ').filter((token) => token.length > 2));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  const commonTokenCount = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const tokenUnionCount = new Set([...leftTokens, ...rightTokens]).size;

  return tokenUnionCount > 0 ? commonTokenCount / tokenUnionCount : 0;
}

function getCreationTimestamp(creationTime?: string): number {
  if (!creationTime) return 0;
  const timestamp = Date.parse(creationTime);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getExerciseThumbnail(exerciseWithMedia: {
  imageUrl?: string;
  images?: string[];
  thumbnailUrl?: string;
}): string | null {
  const rawUrl = exerciseWithMedia.thumbnailUrl || exerciseWithMedia.imageUrl || exerciseWithMedia.images?.[0];
  return getMediaUrl(rawUrl) || null;
}

interface ExerciseCompactRowProps {
  name: string;
  imageUrl?: string;
  images?: string[];
  thumbnailUrl?: string;
  meta?: string;
  emphasize?: boolean;
}

function ExerciseCompactRow({ name, imageUrl, images, thumbnailUrl, meta, emphasize = false }: Readonly<ExerciseCompactRowProps>) {
  const thumbnail = getExerciseThumbnail({ imageUrl, images, thumbnailUrl });

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors',
        emphasize ? 'bg-primary/10' : 'bg-surface-light/40'
      )}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-light">
        {thumbnail ? (
          <Image src={thumbnail} alt={name} fill className="object-cover" sizes="40px" />
        ) : (
          <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
    </div>
  );
}

function calculateSetRelevance(
  exercise: Exercise,
  exerciseSet: ExerciseSetFromDB
): { score: number; reasoning: string } {
  const exerciseTags = [...getTagNames(exercise.mainTags), ...getTagNames(exercise.additionalTags)];

  if (exerciseTags.length === 0 || !exerciseSet.exerciseMappings?.length) {
    return { score: 0, reasoning: '' };
  }

  // Collect all tags from exercises in the set
  const setTags: string[] = [];
  const setTypes: string[] = [];

  exerciseSet.exerciseMappings.forEach((mapping) => {
    if (mapping.exercise) {
      setTags.push(...(mapping.exercise.mainTags || []), ...(mapping.exercise.additionalTags || []));
      if (mapping.exercise.type) {
        setTypes.push(mapping.exercise.type);
      }
    }
  });

  // Calculate tag overlap
  const lowerExerciseTags = exerciseTags.map((t) => t.toLowerCase());
  const lowerSetTags = new Set(setTags.map((tag) => tag.toLowerCase()));
  const commonTags = lowerExerciseTags.filter((tag) => lowerSetTags.has(tag));

  // Score calculation
  let score = 0;
  const reasons: string[] = [];

  // Tag matching (max 70 points)
  if (commonTags.length > 0) {
    const tagScore = Math.min((commonTags.length / lowerExerciseTags.length) * 70, 70);
    score += tagScore;

    // Find original tag names for display
    const displayTags = exerciseTags.filter((t) => commonTags.includes(t.toLowerCase()));
    if (displayTags.length === 1) {
      reasons.push(`Wspólny tag: ${displayTags[0]}`);
    } else if (displayTags.length <= 3) {
      reasons.push(`Wspólne tagi: ${displayTags.join(', ')}`);
    } else {
      reasons.push(`${displayTags.length} wspólnych tagów`);
    }
  }

  // Type matching contributes internally, but is not surfaced in therapist-facing labels.
  if (exercise.type && setTypes.includes(exercise.type)) {
    score += 20;
  }

  // Set size bonus (max 10 points) - prefer sets with more exercises
  const sizeBonus = Math.min(exerciseSet.exerciseMappings.length * 2, 10);
  score += sizeBonus;

  if (exerciseSet.exerciseMappings.length >= 3 && reasons.length === 0) {
    reasons.push(`Zawiera ${exerciseSet.exerciseMappings.length} ćwiczeń`);
  }

  return {
    score: Math.round(score),
    reasoning: reasons.join(' • ') || 'Pasujący zestaw',
  };
}

// ============================================
// Component
// ============================================

export function AddExerciseToSetsDialog({ open, onOpenChange, exercise }: AddExerciseToSetsDialogProps) {
  const { currentOrganization } = useOrganization();
  const [step, setStep] = useState<Step>('select-set');
  const [selectedSet, setSelectedSet] = useState<ExerciseSetFromDB | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [aiSuggestedName, setAiSuggestedName] = useState<string | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);

  const organizationId = currentOrganization?.organizationId;

  // Get exercise sets
  const {
    data: setsData,
    loading: setsLoading,
    refetch: refetchSets,
  } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId: organizationId || '' },
    skip: !organizationId || !open,
  });

  // Mutations
  const [createSet, { loading: creatingSet }] = useMutation(CREATE_EXERCISE_SET_MUTATION);
  const [addExerciseToSet, { loading: addingExercise }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setStep('select-set');
        setSelectedSet(null);
        setSearchQuery('');
        setNewSetName('');
        setAiSuggestedName(null);
        setIsGeneratingName(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Generate AI name suggestion when entering create-set step
  const generateAiName = useCallback(async () => {
    if (!exercise) return;

    setIsGeneratingName(true);
    try {
      const tags = [...getTagNames(exercise.mainTags), ...getTagNames(exercise.additionalTags)];

      const existingSetNames =
        ((setsData as { exerciseSets?: ExerciseSetFromDB[] })?.exerciseSets || [])
          .filter((set) => set.isActive)
          .map((set) => set.name)
          .filter(Boolean) ?? [];

      const prompt = `
Jesteś ekspertem klinicznym i UX writerem dla fizjoterapii.
Na podstawie ćwiczenia "${exercise.name}" zaproponuj nazwę zestawu (maksymalnie 5 słów, profesjonalnie, po polsku).
Jeśli nazwa ćwiczenia zawiera błąd lub niezręczną formę, popraw ją i użyj poprawnej formy przy tworzeniu nazwy zestawu.
Uwzględnij kontekst tagów: ${tags.length > 0 ? tags.join(', ') : 'brak'}.
Uwzględnij typ ćwiczenia: ${exercise.type || 'brak'}.
Unikaj tworzenia nazwy bardzo podobnej do istniejących zestawów: ${existingSetNames.join(', ') || 'brak'}.
Zwróć wyłącznie propozycję nazwy zestawu.
      `.trim();

      const response = await aiService.generateExerciseSet(prompt);

      if (response?.setName) {
        setAiSuggestedName(response.setName);
        setNewSetName(response.setName);
      }
    } catch (error) {
      console.error('Error generating AI name:', error);
    } finally {
      setIsGeneratingName(false);
    }
  }, [exercise, setsData]);

  // Process and rank exercise sets
  const { rankedSets, recommendedSets, otherSets } = useMemo(() => {
    const sets = (setsData as { exerciseSets?: ExerciseSetFromDB[] })?.exerciseSets || [];
    const activeSets = sets.filter((s) => s.isActive);

    if (!exercise) {
      return {
        rankedSets: [] as RankedSet[],
        recommendedSets: [] as RankedSet[],
        otherSets: [] as RankedSet[],
      };
    }

    // Calculate relevance for each set
    const ranked: RankedSet[] = activeSets.map((set) => {
      const { score, reasoning } = calculateSetRelevance(exercise, set);
      const isAlreadyAdded = set.exerciseMappings?.some((m) => m.exerciseId === exercise.id) || false;

      return { set, score, reasoning, isAlreadyAdded };
    });

    // Sort by score (descending), already added at bottom
    ranked.sort((a, b) => {
      if (a.isAlreadyAdded !== b.isAlreadyAdded) {
        return a.isAlreadyAdded ? 1 : -1;
      }
      return b.score - a.score;
    });

    // Split into recommended (score >= 30) and others
    const recommended = ranked.filter((r) => r.score >= 30 && !r.isAlreadyAdded);
    const others = ranked
      .filter((r) => r.score < 30 || r.isAlreadyAdded)
      .sort((left, right) => getCreationTimestamp(right.set.creationTime) - getCreationTimestamp(left.set.creationTime));

    return {
      rankedSets: ranked,
      recommendedSets: recommended.slice(0, 3), // Top 3 recommendations
      otherSets: others,
    };
  }, [setsData, exercise]);

  const similarExistingSets = useMemo((): SimilarSetCandidate[] => {
    const draftSetName = newSetName.trim();
    if (!draftSetName) return [];

    const allSets = (setsData as { exerciseSets?: ExerciseSetFromDB[] })?.exerciseSets || [];
    return allSets
      .filter((set) => set.isActive)
      .map((set) => {
        const similarity = calculateNameSimilarity(draftSetName, set.name);
        const isAlreadyAdded = set.exerciseMappings?.some((mapping) => mapping.exerciseId === exercise?.id) || false;
        return {
          setId: set.id,
          setName: set.name,
          similarity,
          isAlreadyAdded,
        };
      })
      .filter((candidate) => candidate.similarity >= 0.55)
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, 3);
  }, [setsData, newSetName, exercise?.id]);

  // Filter sets based on search
  const filteredOtherSets = useMemo(() => {
    if (!searchQuery.trim()) return otherSets;
    const query = searchQuery.toLowerCase();
    return otherSets.filter(
      (r) => r.set.name.toLowerCase().includes(query) || r.set.description?.toLowerCase().includes(query)
    );
  }, [otherSets, searchQuery]);

  const handleOpenPreview = useCallback((setId: string) => {
    const allSets = (setsData as { exerciseSets?: ExerciseSetFromDB[] })?.exerciseSets || [];
    const matchedSet = allSets.find((set) => set.id === setId) || null;
    setSelectedSet(matchedSet);
    setStep('preview-set');
  }, [setsData]);

  // Add to existing set
  const handleAddToSet = useCallback(
    async (setId: string, closeAfterSuccess: boolean = true) => {
      if (!exercise || !organizationId) return;

      try {
        await addExerciseToSet({
          variables: {
            exerciseId: exercise.id,
            exerciseSetId: setId,
            order: 1,
            sets: exercise.defaultSets ?? exercise.sets ?? null,
            reps: exercise.defaultReps ?? exercise.reps ?? null,
            duration: exercise.defaultDuration ?? exercise.duration ?? null,
          },
          refetchQueries: [
            {
              query: GET_ORGANIZATION_EXERCISE_SETS_QUERY,
              variables: { organizationId },
            },
          ],
        });

        const setName = rankedSets.find((r) => r.set.id === setId)?.set.name;
        toast.success(`Dodano "${exercise.name}" do zestawu "${setName}"`);
        if (closeAfterSuccess) {
          setStep('success');
          setTimeout(() => handleOpenChange(false), 1500);
        }
      } catch (error) {
        console.error('Error adding exercise to set:', error);
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          toast.error('Przekroczono limit czasu. Serwer jest przeciążony - spróbuj ponownie.');
        } else {
          toast.error('Nie udało się dodać ćwiczenia do zestawu');
        }
      }
    },
    [exercise, organizationId, addExerciseToSet, rankedSets, handleOpenChange]
  );

  // Create new set and add exercise
  const handleCreateAndAdd = useCallback(async () => {
    if (!exercise || !organizationId || !newSetName.trim()) return;

    try {
      const result = await createSet({
        variables: {
          organizationId,
          name: newSetName.trim(),
          description: '',
          kind: 'TEMPLATE',
          templateSource: 'ORGANIZATION_PRIVATE',
          isTemplate: true,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSetId = (result.data as any)?.createExerciseSet?.id;
      if (!newSetId) throw new Error('Failed to create set');

      await addExerciseToSet({
        variables: {
          exerciseId: exercise.id,
          exerciseSetId: newSetId,
          order: 1,
          sets: exercise.defaultSets ?? exercise.sets ?? null,
          reps: exercise.defaultReps ?? exercise.reps ?? null,
          duration: exercise.defaultDuration ?? exercise.duration ?? null,
        },
      });

      await refetchSets();

      toast.success(`Utworzono zestaw "${newSetName}" i dodano "${exercise.name}"`);
      setStep('success');
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (error) {
      console.error('Error creating set:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        toast.error('Przekroczono limit czasu. Serwer jest przeciążony - spróbuj ponownie za chwilę.');
      } else {
        toast.error('Nie udało się utworzyć zestawu. Spróbuj ponownie.');
      }
    }
  }, [exercise, organizationId, newSetName, createSet, addExerciseToSet, refetchSets, handleOpenChange]);

  const isLoading = setsLoading;
  const isSaving = creatingSet || addingExercise;

  if (!exercise) return null;

  const dialogTitleByStep: Record<Step, string> = {
    'select-set': 'Dodaj do zestawu',
    'preview-set': 'Podgląd przed dodaniem',
    'create-set': 'Utwórz nowy zestaw',
    success: 'Dodano!',
  };

  const dialogDescriptionByStep: Record<Step, string> = {
    'select-set': `Wybierz zestaw dla "${exercise.name}"`,
    'preview-set': `Sprawdź zestaw "${selectedSet?.name ?? ''}" przed potwierdzeniem`,
    'create-set': `Nowy zestaw z ćwiczeniem "${exercise.name}"`,
    success: 'Ćwiczenie zostało dodane do zestawu',
  };

  let emptySetsMessage = 'Wszystkie zestawy są w rekomendacjach';
  if (searchQuery) {
    emptySetsMessage = 'Nie znaleziono zestawów';
  } else if (rankedSets.length === 0) {
    emptySetsMessage = 'Brak zestawów - utwórz pierwszy!';
  }

  const setsValue = exercise.defaultSets ?? exercise.sets ?? null;
  const repsValue = exercise.defaultReps ?? exercise.reps ?? null;
  const durationValue = exercise.defaultDuration ?? exercise.duration ?? null;
  const executionTimeValue = exercise.defaultExecutionTime ?? exercise.executionTime ?? null;
  const durationLabel = durationValue ? formatDurationPolish(durationValue) : '—';
  const exerciseMeta = `${setsValue ?? '—'} serii • ${repsValue ?? '—'} powt. • Czas powtórzenia: ${
    executionTimeValue ?? '—'
  } • Czas serii: ${durationLabel}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[85vh] overflow-hidden bg-surface shadow-xl flex flex-col p-0">
        <DialogHeader className="border-b border-border/40 px-6 pb-4 pt-5">
          <DialogTitle className="text-lg font-semibold tracking-tight">{dialogTitleByStep[step]}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground/80">{dialogDescriptionByStep[step]}</DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Success state */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-in zoom-in-50 duration-300">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground animate-in fade-in duration-500">
              Gotowe! Ćwiczenie dodane do zestawu.
            </p>
          </div>
        )}

        {/* Select set step */}
        {!isLoading && step === 'select-set' && (
          <div className="flex-1 flex min-h-0 flex-col space-y-4 px-6 py-4">
            {/* AI Recommendations Section */}
            {recommendedSets.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet/10">
                    <Sparkles className="h-3 w-3 text-violet-light" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asystent AI rekomenduje</span>
                </div>

                <div className="divide-y divide-border/20 rounded-lg bg-surface-light/30">
                  {recommendedSets.map((ranked) => (
                    <button
                      key={ranked.set.id}
                      onClick={() => handleOpenPreview(ranked.set.id)}
                      disabled={isSaving}
                      className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-light/70"
                      data-testid={`exercise-add-set-recommended-${ranked.set.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{ranked.set.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{ranked.reasoning}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-violet-light">{ranked.score}%</span>
                        <TrendingUp className="h-4 w-4 text-violet-light opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Create new with AI button */}
            <Button
              variant="outline"
              className="h-12 w-full justify-start gap-3 border-border/50 bg-surface-light/20 hover:bg-surface-light/50"
              onClick={() => setStep('create-set')}
              data-testid="exercise-add-set-create-ai-btn"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Wand2 className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Utwórz nowy zestaw z AI</p>
                <p className="text-xs text-muted-foreground">AI zaproponuje nazwę zestawu</p>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>

            {/* Separator */}
            {(recommendedSets.length > 0 || filteredOtherSets.length > 0) && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    {recommendedSets.length > 0 ? 'Pozostałe zestawy' : 'Wszystkie zestawy'}
                  </span>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj zestawów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            {/* Other sets list */}
            <ScrollArea className="flex-1">
              {filteredOtherSets.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">{emptySetsMessage}</p>
                </div>
              ) : (
                <div className="divide-y divide-border/20 rounded-lg bg-surface-light/20">
                  {filteredOtherSets.map((ranked) => {
                    const exerciseCount = ranked.set.exerciseMappings?.length || 0;

                    return (
                      <button
                        key={ranked.set.id}
                        onClick={() => !ranked.isAlreadyAdded && handleOpenPreview(ranked.set.id)}
                        disabled={ranked.isAlreadyAdded || isSaving}
                        data-testid={`exercise-add-set-other-${ranked.set.id}`}
                        className={cn(
                          'group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-150',
                          ranked.isAlreadyAdded
                            ? 'cursor-not-allowed bg-primary/8'
                            : 'cursor-pointer hover:bg-surface-light/60'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                            ranked.isAlreadyAdded ? 'bg-primary/20' : 'bg-surface-light'
                          )}
                        >
                          {ranked.isAlreadyAdded ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate text-sm font-medium', ranked.isAlreadyAdded && 'text-primary')}>
                            {ranked.set.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ranked.isAlreadyAdded ? 'Już dodane' : `${exerciseCount} ćwiczeń`}
                          </p>
                        </div>

                        {!ranked.isAlreadyAdded && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Create set step */}
        {!isLoading && step === 'create-set' && (
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <label htmlFor="exercise-add-set-name-input" className="text-sm font-medium">
                Nazwa zestawu
              </label>
              <div className="relative">
                <Input
                  id="exercise-add-set-name-input"
                  placeholder="np. Ćwiczenia na kręgosłup"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  autoFocus
                  className="pr-28"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={generateAiName}
                    disabled={isGeneratingName}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    data-testid="exercise-add-set-generate-name-btn"
                  >
                    {isGeneratingName ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        Generuję
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        Generuj AI
                      </>
                    )}
                  </Button>
                </div>
                {isGeneratingName && (
                  <div className="sr-only" aria-live="polite">
                    Generowanie sugestii AI
                  </div>
                )}
              </div>

              {aiSuggestedName && newSetName === aiSuggestedName && (
                <div className="flex items-center gap-2 text-xs text-violet-light">
                  <Sparkles className="h-3 w-3" />
                  <span>Sugestia AI</span>
                </div>
              )}
            </div>

            {similarExistingSets.length > 0 && (
              <div className="rounded-xl bg-surface-light/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span>Wykryto zestawy o zbliżonej nazwie</span>
                </div>
                <div className="space-y-2">
                  {similarExistingSets.map((candidate) => (
                    <div
                      key={candidate.setId}
                      className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{candidate.setName}</p>
                        <p className="text-xs text-muted-foreground">
                          Podobieństwo: {Math.round(candidate.similarity * 100)}%
                          {candidate.isAlreadyAdded ? ' • ćwiczenie już dodane' : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={candidate.isAlreadyAdded || isSaving}
                        onClick={() => handleOpenPreview(candidate.setId)}
                        data-testid={`exercise-add-set-duplicate-suggestion-${candidate.setId}`}
                      >
                        {candidate.isAlreadyAdded ? 'Już dodane' : 'Dodaj do tego'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick exercise preview */}
            <div className="space-y-2 rounded-xl bg-surface-light/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ćwiczenie do dodania</p>
              <ExerciseCompactRow
                name={exercise.name}
                imageUrl={exercise.imageUrl}
                images={exercise.images}
                thumbnailUrl={exercise.thumbnailUrl}
                meta={exerciseMeta}
                emphasize
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-border/30 pt-4">
              <Button variant="outline" onClick={() => setStep('select-set')}>
                Wstecz
              </Button>
              <Button onClick={handleCreateAndAdd} disabled={!newSetName.trim() || isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                Utwórz i dodaj
              </Button>
            </div>
          </div>
        )}

        {/* Preview set step */}
        {!isLoading && step === 'preview-set' && selectedSet && (
          <div className="space-y-4 px-6 py-4">
            <div className="rounded-xl bg-surface-light/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">{selectedSet.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Aktualnie w zestawie: {selectedSet.exerciseMappings?.length ?? 0}{' '}
                    {(selectedSet.exerciseMappings?.length ?? 0) === 1 ? 'ćwiczenie' : 'ćwiczeń'}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Podgląd
                </Badge>
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-surface-light/25 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dołącza do zestawu</p>
              <ExerciseCompactRow
                name={exercise.name}
                imageUrl={exercise.imageUrl}
                images={exercise.images}
                thumbnailUrl={exercise.thumbnailUrl}
                meta={exerciseMeta}
                emphasize
              />
            </div>

            <div className="space-y-2 rounded-xl bg-surface-light/25 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ćwiczenia już w zestawie</p>
              {selectedSet.exerciseMappings && selectedSet.exerciseMappings.length > 0 ? (
                <ScrollArea className="max-h-44 pr-2">
                  <div className="space-y-1.5">
                    {selectedSet.exerciseMappings.map((mapping) => (
                      <ExerciseCompactRow
                        key={mapping.exerciseId}
                        name={mapping.exercise?.name ?? 'Ćwiczenie'}
                        imageUrl={mapping.exercise?.imageUrl}
                        images={mapping.exercise?.images}
                        thumbnailUrl={mapping.exercise?.thumbnailUrl}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Ten zestaw jest pusty. Dodawane ćwiczenie będzie pierwsze.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border/30 pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('select-set');
                  setSelectedSet(null);
                }}
                data-testid="exercise-add-set-preview-back-btn"
              >
                Wstecz
              </Button>
              <Button
                onClick={() => handleAddToSet(selectedSet.id)}
                disabled={isSaving}
                className="gap-2"
                data-testid="exercise-add-set-preview-confirm-btn"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                Potwierdź i dodaj
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
