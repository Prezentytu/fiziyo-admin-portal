'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { Search, Loader2, Dumbbell, Check, ArrowRight, FolderPlus, Plus, Minus, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';

import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';

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
}

interface ExerciseParams {
  sets: number;
  reps: number;
  duration: number;
  restSets: number;
  restReps: number;
}

interface CreateSetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: (setId: string) => void;
}

type WizardStep = 'basics' | 'exercises';

const translateType = (type?: string) => {
  const types: Record<string, string> = {
    time: 'czasowe',
    reps: 'powtórzenia',
    hold: 'utrzymanie',
  };
  return type ? types[type] || type : '';
};

export function CreateSetWizard({ open, onOpenChange, organizationId, onSuccess }: CreateSetWizardProps) {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [exerciseParams, setExerciseParams] = useState<Map<string, ExerciseParams>>(new Map());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Check if there are unsaved changes
  const hasChanges = name.trim().length > 0 || description.trim().length > 0 || selectedExercises.size > 0;

  // Handle close attempt
  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  // Confirm close
  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      setCurrentStep('basics');
      setName('');
      setDescription('');
      setSearchQuery('');
      setSelectedExercises(new Set());
      setExerciseParams(new Map());
      setShowCloseConfirm(false);
    }
  }, [open]);

  const { data: exercisesData, loading: loadingExercises } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open || currentStep !== 'exercises',
  });

  const [createSet, { loading: creatingSet }] = useMutation(CREATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
  });

  const [addExercise, { loading: addingExercises }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const exercises: Exercise[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (exercisesData as { organizationExercises?: any[] })?.organizationExercises || [];
  }, [exercisesData]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter(
      (ex) => ex.name.toLowerCase().includes(query) || ex.description?.toLowerCase().includes(query)
    );
  }, [exercises, searchQuery]);

  const getExerciseParams = useCallback(
    (exercise: Exercise): ExerciseParams => {
      const saved = exerciseParams.get(exercise.id);
      if (saved) return saved;
      return {
        sets: exercise.sets || 3,
        reps: exercise.reps || 10,
        duration: exercise.duration || 30,
        restSets: exercise.restSets || 60,
        restReps: exercise.restReps || 0,
      };
    },
    [exerciseParams]
  );

  const updateExerciseParams = useCallback((exerciseId: string, field: keyof ExerciseParams, value: number) => {
    setExerciseParams((prev) => {
      const next = new Map(prev);
      const current = next.get(exerciseId) || { sets: 3, reps: 10, duration: 30, restSets: 60, restReps: 0 };
      next.set(exerciseId, { ...current, [field]: Math.max(0, value) });
      return next;
    });
  }, []);

  const toggleExercise = useCallback(
    (exercise: Exercise) => {
      setSelectedExercises((prev) => {
        const next = new Set(prev);
        if (next.has(exercise.id)) {
          next.delete(exercise.id);
        } else {
          next.add(exercise.id);
          if (!exerciseParams.has(exercise.id)) {
            setExerciseParams((p) => {
              const np = new Map(p);
              np.set(exercise.id, {
                sets: exercise.sets || 3,
                reps: exercise.reps || 10,
                duration: exercise.duration || 30,
                restSets: exercise.restSets || 60,
                restReps: exercise.restReps || 0,
              });
              return np;
            });
          }
        }
        return next;
      });
    },
    [exerciseParams]
  );

  const canProceedFromBasics = name.trim().length >= 2;
  const isLoading = creatingSet || addingExercises;

  const handleCreateSet = async (addExercisesAfter: boolean) => {
    if (!canProceedFromBasics) return;

    try {
      const result = await createSet({
        variables: {
          organizationId,
          name: name.trim(),
          description: description.trim() || null,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSetId = (result.data as any)?.createExerciseSet?.id;
      if (!newSetId) throw new Error('Nie udało się utworzyć zestawu');

      if (addExercisesAfter && selectedExercises.size > 0) {
        let order = 0;
        for (const exerciseId of selectedExercises) {
          const exercise = exercises.find((e) => e.id === exerciseId);
          if (!exercise) continue;
          const params = getExerciseParams(exercise);
          await addExercise({
            variables: {
              exerciseId,
              exerciseSetId: newSetId,
              order: order++,
              sets: params.sets || null,
              reps: params.reps || null,
              duration: params.duration || null,
              restSets: params.restSets || null,
              restReps: params.restReps || null,
            },
          });
        }
      }

      const exerciseCount = addExercisesAfter ? selectedExercises.size : 0;
      toast.success(
        exerciseCount > 0 ? `Zestaw "${name}" utworzony z ${exerciseCount} ćwiczeniami` : `Zestaw "${name}" utworzony`
      );

      onOpenChange(false);
      onSuccess?.(newSetId);
      router.push(`/exercise-sets/${newSetId}`);
    } catch (error) {
      console.error('Błąd tworzenia zestawu:', error);
      toast.error('Nie udało się utworzyć zestawu');
    }
  };

  const goToExercises = () => {
    if (canProceedFromBasics) setCurrentStep('exercises');
  };

  const selectedExercisesList = useMemo(() => {
    return exercises.filter((ex) => selectedExercises.has(ex.id));
  }, [exercises, selectedExercises]);

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-6xl w-[95vw] max-h-[90vh] h-[85vh] flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        {/* Header - step indicator between title and X */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Nowy zestaw ćwiczeń</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {currentStep === 'basics'
                    ? 'Podaj nazwę i opcjonalny opis'
                    : 'Wybierz ćwiczenia i dostosuj parametry'}
                </DialogDescription>
              </div>
            </div>

            {/* Center: Step indicator */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('basics')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    currentStep === 'basics'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/20 text-primary hover:bg-primary/30'
                  )}
                >
                  {currentStep !== 'basics' && <Check className="h-4 w-4" />}
                  <span>1. Podstawy</span>
                </button>
                <div
                  className={cn('w-8 h-0.5 rounded-full', currentStep === 'exercises' ? 'bg-primary' : 'bg-border')}
                />
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    currentStep === 'exercises'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-light text-muted-foreground'
                  )}
                >
                  <span>2. Ćwiczenia</span>
                </div>
              </div>
            </div>

            {/* Right: spacer for balance (X button is added by DialogContent) */}
            <div className="w-10" />
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'basics' ? (
            <div className="h-full p-8 flex items-start justify-center">
              <div className="w-full max-w-xl space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nazwa zestawu *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Rehabilitacja kolana - faza 1"
                    className="h-12 text-base"
                    autoFocus
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 2 znaki</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Opis <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ćwiczenia wzmacniające po rekonstrukcji ACL, koncentracja na stabilizacji stawu kolanowego..."
                    className="min-h-[160px] resize-none text-base"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex">
              {/* Left: Exercise picker */}
              <div className="flex-1 flex flex-col border-r border-border min-w-0">
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj ćwiczeń..."
                      className="h-11 pl-10"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{filteredExercises.length} ćwiczeń dostępnych</p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    {loadingExercises ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredExercises.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Dumbbell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak ćwiczeń w bibliotece'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {filteredExercises.map((exercise) => {
                          const isSelected = selectedExercises.has(exercise.id);
                          const imageUrl = exercise.imageUrl || exercise.images?.[0];

                          return (
                            <button
                              key={exercise.id}
                              type="button"
                              onClick={() => toggleExercise(exercise)}
                              className={cn(
                                'w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all',
                                isSelected
                                  ? 'bg-primary/10 ring-2 ring-primary/30'
                                  : 'bg-surface hover:bg-surface-light'
                              )}
                            >
                              <div
                                className={cn(
                                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                                  isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                                )}
                              >
                                {isSelected && <Check className="h-4 w-4" />}
                              </div>

                              <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0">
                                {imageUrl ? (
                                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{exercise.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {translateType(exercise.type)}
                                  {exercise.sets && ` • ${exercise.sets} serie`}
                                  {exercise.reps && ` • ${exercise.reps} powt.`}
                                  {exercise.duration && ` • ${exercise.duration}s`}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Selected exercises with params - WIDER */}
              <div className="w-[480px] flex flex-col bg-surface-light/30 shrink-0">
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Wybrane ćwiczenia</h3>
                    {selectedExercises.size > 0 && (
                      <Badge className="bg-primary text-primary-foreground">{selectedExercises.size}</Badge>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  {selectedExercisesList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                      <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
                        <Plus className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Kliknij ćwiczenie z listy aby je dodać</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {selectedExercisesList.map((exercise, index) => {
                        const params = getExerciseParams(exercise);
                        const imageUrl = exercise.imageUrl || exercise.images?.[0];
                        const isTimeType = exercise.type === 'time' || exercise.type === 'hold';

                        return (
                          <div key={exercise.id} className="rounded-xl border border-border bg-background p-4">
                            {/* Header */}
                            <div className="flex items-start gap-3 mb-4">
                              <span className="text-sm font-bold text-primary w-6 shrink-0">{index + 1}.</span>
                              <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0">
                                {imageUrl ? (
                                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold">{exercise.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{translateType(exercise.type)}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => toggleExercise(exercise)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Params - horizontal layout */}
                            <div className="flex items-center gap-4">
                              {/* Sets */}
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground block mb-1.5">Serie</label>
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-r-none"
                                    onClick={() => updateExerciseParams(exercise.id, 'sets', params.sets - 1)}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={params.sets}
                                    onChange={(e) =>
                                      updateExerciseParams(exercise.id, 'sets', parseInt(e.target.value) || 0)
                                    }
                                    className="h-9 w-14 text-center font-semibold rounded-none border-x-0"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-l-none"
                                    onClick={() => updateExerciseParams(exercise.id, 'sets', params.sets + 1)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Reps or Duration */}
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1">
                                  {isTimeType ? (
                                    <>
                                      <Clock className="h-3 w-3" /> Czas (s)
                                    </>
                                  ) : (
                                    'Powtórzenia'
                                  )}
                                </label>
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-r-none"
                                    onClick={() =>
                                      updateExerciseParams(
                                        exercise.id,
                                        isTimeType ? 'duration' : 'reps',
                                        isTimeType ? params.duration - 5 : params.reps - 1
                                      )
                                    }
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={isTimeType ? params.duration : params.reps}
                                    onChange={(e) =>
                                      updateExerciseParams(
                                        exercise.id,
                                        isTimeType ? 'duration' : 'reps',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="h-9 w-14 text-center font-semibold rounded-none border-x-0"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-l-none"
                                    onClick={() =>
                                      updateExerciseParams(
                                        exercise.id,
                                        isTimeType ? 'duration' : 'reps',
                                        isTimeType ? params.duration + 5 : params.reps + 1
                                      )
                                    }
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Rest */}
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground block mb-1.5">Przerwa (s)</label>
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-r-none"
                                    onClick={() => updateExerciseParams(exercise.id, 'restSets', params.restSets - 10)}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={params.restSets}
                                    onChange={(e) =>
                                      updateExerciseParams(exercise.id, 'restSets', parseInt(e.target.value) || 0)
                                    }
                                    className="h-9 w-14 text-center font-semibold rounded-none border-x-0"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-l-none"
                                    onClick={() => updateExerciseParams(exercise.id, 'restSets', params.restSets + 10)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          {currentStep === 'basics' ? (
            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" onClick={handleCloseAttempt} disabled={isLoading}>
                Anuluj
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => handleCreateSet(false)}
                  disabled={!canProceedFromBasics || isLoading}
                  className="text-muted-foreground"
                >
                  {creatingSet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Utwórz pusty zestaw
                </Button>

                <Button
                  onClick={goToExercises}
                  disabled={!canProceedFromBasics}
                  className="gap-2 shadow-lg shadow-primary/20"
                >
                  Dalej: Dodaj ćwiczenia
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" onClick={() => setCurrentStep('basics')} disabled={isLoading}>
                Wstecz
              </Button>

              <div className="flex items-center gap-3">
                {selectedExercises.size === 0 && (
                  <p className="text-sm text-muted-foreground">Możesz pominąć i dodać ćwiczenia później</p>
                )}

                <Button
                  onClick={() => handleCreateSet(true)}
                  disabled={isLoading}
                  className="gap-2 shadow-lg shadow-primary/20 min-w-[180px]"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedExercises.size > 0 ? (
                    <>
                      <Plus className="h-4 w-4" />
                      Utwórz z {selectedExercises.size} ćwiczeniami
                    </>
                  ) : (
                    'Utwórz pusty zestaw'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Confirm close dialog */}
      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}
