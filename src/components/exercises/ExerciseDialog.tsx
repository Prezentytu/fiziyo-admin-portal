"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExerciseForm, ExerciseFormValues } from "./ExerciseForm";
import { CREATE_EXERCISE_MUTATION, UPDATE_EXERCISE_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import type { Exercise } from "./ExerciseCard";

interface ExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
  organizationId: string;
  onSuccess?: () => void;
}

export function ExerciseDialog({
  open,
  onOpenChange,
  exercise,
  organizationId,
  onSuccess,
}: ExerciseDialogProps) {
  const isEditing = !!exercise;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);

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

  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
    ],
  });

  const [updateExercise, { loading: updating }] = useMutation(UPDATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
    ],
  });

  const handleSubmit = async (values: ExerciseFormValues) => {
    try {
      if (isEditing && exercise) {
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
        toast.success("Ćwiczenie zostało zaktualizowane");
      } else {
        await createExercise({
          variables: {
            organizationId,
            scope: "ORGANIZATION",
            name: values.name,
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
            isActive: true,
          },
        });
        toast.success("Ćwiczenie zostało utworzone");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Błąd podczas zapisywania ćwiczenia:", error);
      toast.error(
        isEditing
          ? "Nie udało się zaktualizować ćwiczenia"
          : "Nie udało się utworzyć ćwiczenia"
      );
    }
  };

  const defaultValues = exercise
    ? {
        name: exercise.name,
        description: exercise.description || "",
        type: (exercise.type as "reps" | "time" | "hold") || "reps",
        sets: exercise.sets,
        reps: exercise.reps,
        duration: exercise.duration,
        exerciseSide: (exercise.exerciseSide as "none" | "left" | "right" | "both") || "none",
      }
    : undefined;

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
          <DialogTitle>
            {isEditing ? "Edytuj ćwiczenie" : "Nowe ćwiczenie"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Zmień parametry ćwiczenia"
              : "Wypełnij formularz, aby dodać nowe ćwiczenie do biblioteki"}
          </DialogDescription>
        </DialogHeader>
        <ExerciseForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCloseAttempt}
          isLoading={creating || updating}
          submitLabel={isEditing ? "Zapisz zmiany" : "Dodaj ćwiczenie"}
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

