"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Search,
  Plus,
  Minus,
  Loader2,
  Dumbbell,
  Clock,
  X,
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUrl";

import { GET_AVAILABLE_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";
import type { PatientAssignment, ExerciseOverride } from "./PatientAssignmentCard";

// Types
interface Exercise {
  id: string;
  name: string;
  description?: string;
  type?: string;
  exerciseSide?: string;
  imageUrl?: string;
  images?: string[];
  sets?: number;
  reps?: number;
  duration?: number;
}

interface AddExerciseToPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: PatientAssignment | null;
  patientId: string;
  organizationId: string;
  onSuccess?: () => void;
}

// Helper to translate exercise type
const translateType = (type?: string) => {
  const types: Record<string, string> = {
    time: "czasowe",
    reps: "powtórzenia",
  };
  return type ? types[type] || type : "";
};

// Generate unique ID for patient-added exercises
const generatePatientExerciseId = () => {
  return `patient-added-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

export function AddExerciseToPatientDialog({
  open,
  onOpenChange,
  assignment,
  patientId,
  organizationId,
  onSuccess,
}: AddExerciseToPatientDialogProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setHasChanges(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Reset when dialog closes
  if (!open && hasChanges) {
    setHasChanges(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      {open && assignment && (
        <AddExerciseToPatientDialogContent
          assignment={assignment}
          patientId={patientId}
          organizationId={organizationId}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
          onCloseAttempt={handleCloseAttempt}
          onHasChanges={setHasChanges}
        />
      )}

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}

// Inner component
interface AddExerciseToPatientDialogContentProps {
  assignment: PatientAssignment;
  patientId: string;
  organizationId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCloseAttempt: () => void;
  onHasChanges: (hasChanges: boolean) => void;
}

function AddExerciseToPatientDialogContent({
  assignment,
  patientId,
  organizationId,
  onOpenChange,
  onSuccess,
  onCloseAttempt,
  onHasChanges,
}: AddExerciseToPatientDialogContentProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [duration, setDuration] = useState(30);

  // Get exercises from organization
  const { data: exercisesData, loading: loadingExercises } = useQuery(
    GET_AVAILABLE_EXERCISES_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  // Mutation
  const [updateOverrides, { loading: saving }] = useMutation(
    UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION
  );

  // Get existing exercise IDs in the assignment to filter them out
  const existingExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    assignment.exerciseSet?.exerciseMappings?.forEach((m) => {
      if (m.exerciseId) ids.add(m.exerciseId);
    });
    return ids;
  }, [assignment]);

  // Filter exercises
  const exercises: Exercise[] = useMemo(() => {
    const data = exercisesData as { availableExercises?: Exercise[] } | undefined;
    const all = data?.availableExercises || [];
    
    // Filter out exercises already in the set
    const filtered = all.filter((e) => !existingExerciseIds.has(e.id));
    
    // Apply search filter
    if (!searchQuery.trim()) return filtered;
    
    const query = searchQuery.toLowerCase();
    return filtered.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
    );
  }, [exercisesData, existingExerciseIds, searchQuery]);

  // Track changes
  const hasChanges = selectedExercise !== null;

  React.useEffect(() => {
    onHasChanges(hasChanges);
  }, [hasChanges, onHasChanges]);

  // When exercise is selected, initialize params
  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setSets(exercise.sets || 3);
    setReps(exercise.reps || 10);
    setDuration(exercise.duration || 30);
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedExercise) return;

    try {
      // Parse existing overrides
      let existingOverrides: Record<string, ExerciseOverride & { exerciseId?: string; isPatientAdded?: boolean }> = {};
      if (assignment.exerciseOverrides) {
        try {
          existingOverrides = JSON.parse(assignment.exerciseOverrides);
        } catch {
          existingOverrides = {};
        }
      }

      // Create new override for patient-added exercise
      const newId = generatePatientExerciseId();
      const newOverride = {
        exerciseId: selectedExercise.id,
        sets,
        reps: selectedExercise.type === "reps" ? reps : undefined,
        duration: selectedExercise.type === "time" ? duration : undefined,
        isPatientAdded: true,
      };

      const updatedOverrides = {
        ...existingOverrides,
        [newId]: newOverride,
      };

      await updateOverrides({
        variables: {
          assignmentId: assignment.id,
          exerciseOverrides: JSON.stringify(updatedOverrides),
        },
        refetchQueries: [
          {
            query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
            variables: { userId: patientId },
          },
        ],
      });

      toast.success(`Ćwiczenie "${selectedExercise.name}" zostało dodane do zestawu`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd dodawania ćwiczenia:", error);
      toast.error("Nie udało się dodać ćwiczenia");
    }
  };

  const setName = assignment.exerciseSet?.name || "Nieznany zestaw";

  return (
    <DialogContent
      className="max-w-2xl max-h-[90vh] flex flex-col p-0"
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => {
        e.preventDefault();
        onCloseAttempt();
      }}
      data-testid="add-exercise-to-patient-dialog"
    >
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
        <DialogTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Dodaj ćwiczenie
        </DialogTitle>
        <DialogDescription>
          Dodaj ćwiczenie do zestawu &quot;{setName}&quot; tylko dla tego pacjenta
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Search */}
        <div className="px-6 py-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj ćwiczeń..."
              className="pl-9"
              data-testid="add-exercise-search-input"
            />
          </div>
        </div>

        {selectedExercise ? (
          // Selected exercise - configure params
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="space-y-6">
              {/* Selected exercise preview */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
                <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-surface-light">
                  {getMediaUrl(selectedExercise.imageUrl || selectedExercise.images?.[0]) ? (
                    <img
                      src={getMediaUrl(selectedExercise.imageUrl || selectedExercise.images?.[0]) || ""}
                      alt={selectedExercise.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder type="exercise" iconClassName="h-8 w-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">{selectedExercise.name}</p>
                    {selectedExercise.type && (
                      <Badge variant="secondary" className="text-xs">
                        {translateType(selectedExercise.type)}
                      </Badge>
                    )}
                  </div>
                  {selectedExercise.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {selectedExercise.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSelectedExercise(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Parameters */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Parametry dla pacjenta
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Sets */}
                  <div className="space-y-2">
                    <Label className="text-sm">Serie</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setSets(Math.max(1, sets - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={sets}
                        onChange={(e) => setSets(Math.max(1, Number.parseInt(e.target.value) || 1))}
                        className="h-11 text-center text-lg font-semibold"
                        data-testid="add-exercise-sets-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setSets(sets + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Reps or Duration based on type */}
                  {selectedExercise.type === "time" ? (
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Czas (sekundy)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          onClick={() => setDuration(Math.max(5, duration - 5))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(Math.max(5, Number.parseInt(e.target.value) || 5))}
                          className="h-11 text-center text-lg font-semibold"
                          step={5}
                          data-testid="add-exercise-duration-input"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          onClick={() => setDuration(duration + 5)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm">Powtórzenia</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          onClick={() => setReps(Math.max(1, reps - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={reps}
                          onChange={(e) => setReps(Math.max(1, Number.parseInt(e.target.value) || 1))}
                          className="h-11 text-center text-lg font-semibold"
                          data-testid="add-exercise-reps-input"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          onClick={() => setReps(reps + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info note */}
              <div className="rounded-xl bg-info/5 border border-info/20 p-3">
                <p className="text-xs text-muted-foreground">
                  To ćwiczenie zostanie dodane <strong>tylko dla tego pacjenta</strong>. 
                  Oryginalny zestaw nie zostanie zmodyfikowany.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Exercise selection grid
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {loadingExercises ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : exercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Nie znaleziono ćwiczeń"
                      : "Brak dostępnych ćwiczeń"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {exercises.map((exercise) => {
                    const imageUrl = getMediaUrl(exercise.imageUrl || exercise.images?.[0]);
                    return (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => handleSelectExercise(exercise)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                          "border-border/40 bg-surface/30 hover:bg-surface-light hover:border-primary/30"
                        )}
                        data-testid={`add-exercise-item-${exercise.id}`}
                      >
                        <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-surface-light">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={exercise.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{exercise.name}</p>
                          {exercise.type && (
                            <Badge variant="secondary" className="text-[10px] mt-1">
                              {translateType(exercise.type)}
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-background">
        <Button variant="outline" onClick={onCloseAttempt} data-testid="add-exercise-cancel-btn">
          Anuluj
        </Button>
        <Button
          onClick={handleSave}
          disabled={!selectedExercise || saving}
          className="shadow-lg shadow-primary/20"
          data-testid="add-exercise-submit-btn"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Dodaj ćwiczenie
        </Button>
      </div>
    </DialogContent>
  );
}
