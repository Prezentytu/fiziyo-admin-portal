"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { Clock, Lock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExerciseForm, ExerciseFormValues } from "./ExerciseForm";
import { CreateExerciseWizard } from "./CreateExerciseWizard";
import { FeedbackBanner } from "./FeedbackBanner";
import { UPDATE_EXERCISE_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import type { Exercise } from "./ExerciseCard";

interface ExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
  organizationId: string;
  onSuccess?: () => void;
  /** Callback to resubmit exercise after fixing issues */
  onResubmit?: (exerciseId: string) => Promise<void>;
}

export function ExerciseDialog({
  open,
  onOpenChange,
  exercise,
  organizationId,
  onSuccess,
  onResubmit,
}: ExerciseDialogProps) {
  const isEditing = !!exercise;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Status-based modes
  const isPendingReview = exercise?.status === 'PENDING_REVIEW';
  const isChangesRequested = exercise?.status === 'CHANGES_REQUESTED';
  const isFixMode = isChangesRequested; // Enable editing to fix issues

  const handleCloseAttempt = useCallback(() => {
    if (formIsDirty) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [formIsDirty, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setFormIsDirty(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Reset dirty state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormIsDirty(false);
    }
  }, [open]);

  const [updateExercise, { loading: updating }] = useMutation(UPDATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
    ],
  });

  const handleSubmit = async (values: ExerciseFormValues) => {
    try {
      if (isEditing && exercise) {
        // First save the changes
        await updateExercise({
          variables: {
            exerciseId: exercise.id,
            description: values.description || "",
            type: values.type,
            sets: values.sets,
            reps: values.reps,
            duration: values.duration,
            restSets: values.restSets,
            restReps: values.restReps,
            preparationTime: values.preparationTime,
            executionTime: values.executionTime,
            videoUrl: values.videoUrl || null,
            notes: values.notes || null,
            exerciseSide: values.exerciseSide === "none" ? null : values.exerciseSide,
          },
        });

        // If in fix mode (CHANGES_REQUESTED), also resubmit for review
        if (isFixMode && onResubmit) {
          setIsResubmitting(true);
          try {
            await onResubmit(exercise.id);
            toast.success("Poprawki wysłane do weryfikacji!");
          } catch {
            toast.error("Nie udało się wysłać poprawek");
            return;
          } finally {
            setIsResubmitting(false);
          }
        } else {
          toast.success("Ćwiczenie zostało zaktualizowane");
        }
        
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: unknown) {
      console.error("Błąd podczas zapisywania ćwiczenia:", error);
      toast.error("Nie udało się zaktualizować ćwiczenia");
    }
  };

  // For creating new exercises, use the wizard
  if (!isEditing) {
    return (
      <CreateExerciseWizard
        open={open}
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        onSuccess={onSuccess}
      />
    );
  }

  // For editing, use the simple form
  // Support both new and legacy field names
  const defaultValues = exercise
    ? {
        name: exercise.name,
        description: exercise.patientDescription || exercise.description || "",
        type: ((exercise.type?.toLowerCase()) as "reps" | "time") || "reps",
        sets: exercise.defaultSets ?? exercise.sets,
        reps: exercise.defaultReps ?? exercise.reps,
        duration: exercise.defaultDuration ?? exercise.duration,
        restSets: undefined,
        restReps: undefined,
        preparationTime: undefined,
        executionTime: undefined,
        exerciseSide: ((exercise.side?.toLowerCase() || exercise.exerciseSide) as "none" | "left" | "right" | "both") || "none",
        videoUrl: "",
        notes: "",
      }
    : undefined;

  // Edit locked state for PENDING_REVIEW
  if (isPendingReview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Ćwiczenie oczekuje na weryfikację
            </DialogTitle>
            <DialogDescription>
              "{exercise?.name}" zostało zgłoszone do bazy globalnej i oczekuje na weryfikację.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="flex items-center justify-center gap-3 p-6 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600">Edycja zablokowana</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Nie możesz edytować ćwiczenia podczas weryfikacji.
                  Poczekaj na decyzję weryfikatora.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Zamknij
            </Button>
            {/* TODO: Add "Withdraw submission" button when backend supports it */}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>
              {isFixMode ? "Popraw ćwiczenie" : "Edytuj ćwiczenie"}
            </DialogTitle>
            {isFixMode && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                Do poprawy
              </Badge>
            )}
          </div>
          <DialogDescription>
            {isFixMode 
              ? `Wprowadź poprawki do "${exercise?.name}" i wyślij ponownie do weryfikacji`
              : `Zmień parametry ćwiczenia "${exercise?.name}"`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Feedback Banner for CHANGES_REQUESTED */}
        {isFixMode && exercise?.adminReviewNotes && (
          <FeedbackBanner
            adminReviewNotes={exercise.adminReviewNotes}
            updatedAt={exercise.createdAt}
          />
        )}

        <ExerciseForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCloseAttempt}
          isLoading={updating || isResubmitting}
          submitLabel={isFixMode ? "Wyślij poprawki" : "Zapisz zmiany"}
          onDirtyChange={setFormIsDirty}
        />
      </DialogContent>

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
