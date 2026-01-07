"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Search,
  Loader2,
  Plus,
  FolderPlus,
  ChevronRight,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { useOrganization } from "@/contexts/OrganizationContext";
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import type { ParsedExercise } from "@/types/chat.types";

interface ExerciseFromDB {
  id: string;
  name: string;
  type?: string;
  description?: string;
  sets?: number;
  reps?: number;
  duration?: number;
}

interface ExerciseSetFromDB {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  exerciseMappings?: Array<{
    exerciseId: string;
  }>;
}

interface AddToSetFromChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: ParsedExercise | null;
}

type Step = "select-set" | "create-set" | "success" | "not-found";

/**
 * Dialog do dodawania ćwiczenia z czatu AI do zestawu ćwiczeń
 */
export function AddToSetFromChatDialog({
  open,
  onOpenChange,
  exercise,
}: AddToSetFromChatDialogProps) {
  const { currentOrganization } = useOrganization();
  const [step, setStep] = useState<Step>("select-set");
  const [searchQuery, setSearchQuery] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get exercises from DB to find matching one
  const { data: exercisesData, loading: exercisesLoading } = useQuery(
    GET_ORGANIZATION_EXERCISES_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId || !open,
    }
  );

  // Get exercise sets
  const { data: setsData, loading: setsLoading, refetch: refetchSets } = useQuery(
    GET_ORGANIZATION_EXERCISE_SETS_QUERY,
    {
      variables: { organizationId: organizationId || "" },
      skip: !organizationId || !open,
    }
  );

  // Mutations
  const [createSet, { loading: creatingSet }] = useMutation(
    CREATE_EXERCISE_SET_MUTATION
  );
  const [addExerciseToSet, { loading: addingExercise }] = useMutation(
    ADD_EXERCISE_TO_EXERCISE_SET_MUTATION
  );

  // Find matching exercise in DB by name
  const matchingExercise = useMemo(() => {
    if (!exercise || !exercisesData) return null;

    const exercises = (exercisesData as { organizationExercises?: ExerciseFromDB[] })
      ?.organizationExercises || [];

    // Try exact match first
    let match = exercises.find(
      (e) => e.name.toLowerCase() === exercise.name.toLowerCase()
    );

    // If no exact match, try partial match
    if (!match) {
      match = exercises.find(
        (e) =>
          e.name.toLowerCase().includes(exercise.name.toLowerCase()) ||
          exercise.name.toLowerCase().includes(e.name.toLowerCase())
      );
    }

    return match;
  }, [exercise, exercisesData]);

  // Filter exercise sets
  const exerciseSets = useMemo(() => {
    const sets = (setsData as { exerciseSets?: ExerciseSetFromDB[] })?.exerciseSets || [];
    return sets.filter((s) => s.isActive);
  }, [setsData]);

  const filteredSets = useMemo(() => {
    if (!searchQuery.trim()) return exerciseSets;
    const query = searchQuery.toLowerCase();
    return exerciseSets.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
    );
  }, [exerciseSets, searchQuery]);

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setStep("select-set");
        setSearchQuery("");
        setNewSetName("");
        setSelectedSetId(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Check if exercise exists in set
  const isExerciseInSet = useCallback(
    (setId: string) => {
      if (!matchingExercise) return false;
      const set = exerciseSets.find((s) => s.id === setId);
      return set?.exerciseMappings?.some(
        (m) => m.exerciseId === matchingExercise.id
      );
    },
    [matchingExercise, exerciseSets]
  );

  // Add to existing set
  const handleAddToSet = useCallback(
    async (setId: string) => {
      if (!matchingExercise || !organizationId) return;

      try {
        await addExerciseToSet({
          variables: {
            exerciseId: matchingExercise.id,
            exerciseSetId: setId,
            order: 1,
            sets: matchingExercise.sets || null,
            reps: matchingExercise.reps || null,
            duration: matchingExercise.duration || null,
          },
          refetchQueries: [
            {
              query: GET_ORGANIZATION_EXERCISE_SETS_QUERY,
              variables: { organizationId },
            },
          ],
        });

        const setName = exerciseSets.find((s) => s.id === setId)?.name;
        toast.success(`Dodano "${matchingExercise.name}" do zestawu "${setName}"`);
        setStep("success");
        setTimeout(() => handleOpenChange(false), 1500);
      } catch (error) {
        console.error("Error adding exercise to set:", error);
        toast.error("Nie udało się dodać ćwiczenia do zestawu");
      }
    },
    [matchingExercise, organizationId, addExerciseToSet, exerciseSets, handleOpenChange]
  );

  // Create new set and add exercise
  const handleCreateAndAdd = useCallback(async () => {
    if (!matchingExercise || !organizationId || !newSetName.trim()) return;

    try {
      const result = await createSet({
        variables: {
          organizationId,
          name: newSetName.trim(),
          description: "",
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSetId = (result.data as any)?.createExerciseSet?.id;
      if (!newSetId) throw new Error("Failed to create set");

      await addExerciseToSet({
        variables: {
          exerciseId: matchingExercise.id,
          exerciseSetId: newSetId,
          order: 1,
          sets: matchingExercise.sets || null,
          reps: matchingExercise.reps || null,
          duration: matchingExercise.duration || null,
        },
      });

      await refetchSets();

      toast.success(
        `Utworzono zestaw "${newSetName}" i dodano "${matchingExercise.name}"`
      );
      setStep("success");
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (error) {
      console.error("Error creating set:", error);
      toast.error("Nie udało się utworzyć zestawu");
    }
  }, [
    matchingExercise,
    organizationId,
    newSetName,
    createSet,
    addExerciseToSet,
    refetchSets,
    handleOpenChange,
  ]);

  const isLoading = exercisesLoading || setsLoading;
  const isSaving = creatingSet || addingExercise;

  // If no matching exercise found
  if (open && !isLoading && !matchingExercise && exercise) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ćwiczenie nie znalezione</DialogTitle>
            <DialogDescription>
              Nie znaleziono ćwiczenia "{exercise.name}" w bazie danych.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              To ćwiczenie nie istnieje w Twojej bibliotece. Najpierw dodaj je
              do ćwiczeń organizacji, a potem będziesz mógł dodać je do zestawu.
            </p>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Zamknij
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" data-testid="ai-chat-add-to-set-dialog">
        <DialogHeader>
          <DialogTitle>
            {step === "create-set"
              ? "Utwórz nowy zestaw"
              : step === "success"
              ? "Dodano!"
              : "Dodaj do zestawu"}
          </DialogTitle>
          <DialogDescription>
            {step === "create-set"
              ? `Nowy zestaw z ćwiczeniem "${exercise?.name}"`
              : step === "success"
              ? "Ćwiczenie zostało dodane do zestawu"
              : `Wybierz zestaw dla "${exercise?.name}"`}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Success state */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
          </div>
        )}

        {/* Select set step */}
        {!isLoading && step === "select-set" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Create new button */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-dashed border-primary/50 hover:bg-primary/5 hover:border-primary"
              onClick={() => setStep("create-set")}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FolderPlus className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Utwórz nowy zestaw</p>
                <p className="text-xs text-muted-foreground">
                  Stwórz nowy zestaw z tym ćwiczeniem
                </p>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj zestawów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10"
                data-testid="ai-chat-add-to-set-search"
              />
            </div>

            {/* Sets list */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {filteredSets.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Nie znaleziono zestawów"
                      : "Brak zestawów - utwórz pierwszy!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSets.map((set) => {
                    const alreadyInSet = isExerciseInSet(set.id);
                    const exerciseCount = set.exerciseMappings?.length || 0;

                    return (
                      <button
                        key={set.id}
                        onClick={() => !alreadyInSet && handleAddToSet(set.id)}
                        disabled={alreadyInSet || isSaving}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                          alreadyInSet
                            ? "border-primary/20 bg-primary/5 cursor-not-allowed"
                            : "border-border hover:border-primary/40 hover:bg-surface-light cursor-pointer"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            alreadyInSet ? "bg-primary/20" : "bg-surface-light"
                          )}
                        >
                          {alreadyInSet ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "font-medium truncate",
                              alreadyInSet && "text-primary"
                            )}
                          >
                            {set.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {alreadyInSet
                              ? "Już dodane"
                              : `${exerciseCount} ćwiczeń`}
                          </p>
                        </div>
                        {!alreadyInSet && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Create set step */}
        {!isLoading && step === "create-set" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nazwa zestawu</label>
              <Input
                placeholder="np. Ćwiczenia na kręgosłup"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                autoFocus
                data-testid="ai-chat-new-set-name-input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("select-set")}>
                Wstecz
              </Button>
              <Button
                onClick={handleCreateAndAdd}
                disabled={!newSetName.trim() || isSaving}
                data-testid="ai-chat-create-set-submit-btn"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Utwórz i dodaj
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
