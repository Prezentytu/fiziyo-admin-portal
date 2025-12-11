"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Search,
  Loader2,
  Dumbbell,
  Check,
  ArrowLeft,
  ArrowRight,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { cn } from "@/lib/utils";

import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { ADD_EXERCISE_TO_EXERCISE_SET_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY } from "@/graphql/queries/exerciseSets.queries";

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
  exerciseSide?: string;
}

interface ExerciseParams {
  exerciseId: string;
  sets: number;
  reps: number;
  duration: number;
}

interface AddExerciseToSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseSetId: string;
  organizationId: string;
  existingExerciseIds?: string[];
  onSuccess?: () => void;
}

export function AddExerciseToSetDialog({
  open,
  onOpenChange,
  exerciseSetId,
  organizationId,
  existingExerciseIds = [],
  onSuccess,
}: AddExerciseToSetDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(
    new Set()
  );
  const [exerciseParams, setExerciseParams] = useState<
    Map<string, ExerciseParams>
  >(new Map());

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setSearchQuery("");
      setSelectedExercises(new Set());
      setExerciseParams(new Map());
    }
  }, [open]);

  // Get exercises
  const { data, loading } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  // Add exercise mutation
  const [addExercise, { loading: adding }] = useMutation(
    ADD_EXERCISE_TO_EXERCISE_SET_MUTATION
  );

  const exercises: Exercise[] = useMemo(() => {
    const allExercises =
      (data as { organizationExercises?: Exercise[] })?.organizationExercises ||
      [];
    // Filter out already added exercises
    return allExercises.filter((ex) => !existingExerciseIds.includes(ex.id));
  }, [data, existingExerciseIds]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(query) ||
        ex.description?.toLowerCase().includes(query) ||
        ex.type?.toLowerCase().includes(query)
    );
  }, [exercises, searchQuery]);

  const selectedExercisesList = useMemo(() => {
    return exercises.filter((ex) => selectedExercises.has(ex.id));
  }, [exercises, selectedExercises]);

  const toggleExercise = (exerciseId: string) => {
    const newSelected = new Set(selectedExercises);
    if (newSelected.has(exerciseId)) {
      newSelected.delete(exerciseId);
    } else {
      newSelected.add(exerciseId);
    }
    setSelectedExercises(newSelected);
  };

  const initializeParams = () => {
    const params = new Map<string, ExerciseParams>();
    selectedExercisesList.forEach((ex) => {
      params.set(ex.id, {
        exerciseId: ex.id,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        duration: ex.duration || 0,
      });
    });
    setExerciseParams(params);
  };

  const updateParam = (
    exerciseId: string,
    field: keyof ExerciseParams,
    value: number
  ) => {
    const newParams = new Map(exerciseParams);
    const current = newParams.get(exerciseId);
    if (current) {
      newParams.set(exerciseId, { ...current, [field]: Math.max(0, value) });
    }
    setExerciseParams(newParams);
  };

  const handleNextStep = () => {
    if (selectedExercises.size === 0) {
      toast.error("Wybierz przynajmniej jedno ćwiczenie");
      return;
    }
    initializeParams();
    setStep(2);
  };

  const handleSave = async () => {
    try {
      const exercisesToAdd = Array.from(exerciseParams.values());

      for (let i = 0; i < exercisesToAdd.length; i++) {
        const params = exercisesToAdd[i];
        await addExercise({
          variables: {
            exerciseId: params.exerciseId,
            exerciseSetId,
            order: i + 1,
            sets: params.sets || null,
            reps: params.reps || null,
            duration: params.duration || null,
          },
          refetchQueries: [
            {
              query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
              variables: { exerciseSetId },
            },
          ],
        });
      }

      toast.success(
        `Dodano ${exercisesToAdd.length} ${
          exercisesToAdd.length === 1 ? "ćwiczenie" : "ćwiczeń"
        } do zestawu`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas dodawania ćwiczeń:", error);
      toast.error("Nie udało się dodać ćwiczeń do zestawu");
    }
  };

  const getExerciseImage = (exercise: Exercise) => {
    return exercise.imageUrl || exercise.images?.[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {step === 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === 1 ? "Dodaj ćwiczenia" : "Ustaw parametry"}
              </DialogTitle>
              <DialogDescription>
                {step === 1
                  ? "Wybierz ćwiczenia, które chcesz dodać do zestawu"
                  : "Ustaw serie, powtórzenia i czas dla wybranych ćwiczeń"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
              step >= 1
                ? "bg-primary text-primary-foreground"
                : "bg-surface-light text-muted-foreground"
            )}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <div
            className={cn(
              "h-0.5 w-12 transition-colors",
              step > 1 ? "bg-primary" : "bg-border"
            )}
          />
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
              step >= 2
                ? "bg-primary text-primary-foreground"
                : "bg-surface-light text-muted-foreground"
            )}
          >
            2
          </div>
        </div>

        {/* Step 1: Select exercises */}
        {step === 1 && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj ćwiczeń..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-10"
              />
            </div>

            {/* Selected count */}
            {selectedExercises.size > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2">
                <span className="text-sm text-muted-foreground">
                  Wybrano{" "}
                  <span className="font-semibold text-foreground">
                    {selectedExercises.size}
                  </span>{" "}
                  {selectedExercises.size === 1 ? "ćwiczenie" : "ćwiczeń"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedExercises(new Set())}
                  className="h-7 text-xs"
                >
                  Wyczyść
                </Button>
              </div>
            )}

            {/* Exercise list */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
                    <Dumbbell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Nie znaleziono ćwiczeń"
                      : "Brak dostępnych ćwiczeń do dodania"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredExercises.map((exercise) => {
                    const isSelected = selectedExercises.has(exercise.id);
                    const imageUrl = getExerciseImage(exercise);

                    return (
                      <div
                        key={exercise.id}
                        className={cn(
                          "flex items-center gap-4 rounded-xl border p-3 cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-border-light hover:bg-surface-light"
                        )}
                        onClick={() => toggleExercise(exercise.id)}
                      >
                        {/* Checkbox indicator */}
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all flex-shrink-0",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          )}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>

                        {/* Image */}
                        <div className="h-14 w-14 rounded-lg overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={exercise.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlaceholder
                              type="exercise"
                              iconClassName="h-5 w-5"
                            />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {exercise.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {exercise.type && (
                              <Badge variant="secondary" className="text-xs">
                                {exercise.type}
                              </Badge>
                            )}
                            {exercise.exerciseSide && (
                              <Badge variant="outline" className="text-xs">
                                {exercise.exerciseSide}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={selectedExercises.size === 0}
                className="rounded-xl font-semibold"
              >
                Dalej
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Set parameters */}
        {step === 2 && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4">
                {selectedExercisesList.map((exercise) => {
                  const params = exerciseParams.get(exercise.id);
                  const imageUrl = getExerciseImage(exercise);

                  return (
                    <div
                      key={exercise.id}
                      className="rounded-xl border border-border bg-surface p-4 space-y-4"
                    >
                      {/* Exercise header */}
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={exercise.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlaceholder
                              type="exercise"
                              iconClassName="h-4 w-4"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {exercise.name}
                          </p>
                          {exercise.type && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {exercise.type}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            toggleExercise(exercise.id);
                            const newParams = new Map(exerciseParams);
                            newParams.delete(exercise.id);
                            setExerciseParams(newParams);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Parameters */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* Sets */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Serie
                          </Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() =>
                                updateParam(
                                  exercise.id,
                                  "sets",
                                  (params?.sets || 0) - 1
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={params?.sets || 0}
                              onChange={(e) =>
                                updateParam(
                                  exercise.id,
                                  "sets",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-9 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() =>
                                updateParam(
                                  exercise.id,
                                  "sets",
                                  (params?.sets || 0) + 1
                                )
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Reps */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Powtórzenia
                          </Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() =>
                                updateParam(
                                  exercise.id,
                                  "reps",
                                  (params?.reps || 0) - 1
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={params?.reps || 0}
                              onChange={(e) =>
                                updateParam(
                                  exercise.id,
                                  "reps",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-9 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() =>
                                updateParam(
                                  exercise.id,
                                  "reps",
                                  (params?.reps || 0) + 1
                                )
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Czas (s)
                          </Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() =>
                                updateParam(
                                  exercise.id,
                                  "duration",
                                  (params?.duration || 0) - 5
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={params?.duration || 0}
                              onChange={(e) =>
                                updateParam(
                                  exercise.id,
                                  "duration",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-9 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() =>
                                updateParam(
                                  exercise.id,
                                  "duration",
                                  (params?.duration || 0) + 5
                                )
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setStep(1)}>
                Wstecz
              </Button>
              <Button
                onClick={handleSave}
                disabled={adding || selectedExercises.size === 0}
                className="rounded-xl font-semibold"
              >
                {adding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Dodaj {selectedExercises.size}{" "}
                {selectedExercises.size === 1 ? "ćwiczenie" : "ćwiczeń"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
