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
import { SetForm, SetFormValues } from "./SetForm";
import {
  CREATE_EXERCISE_SET_MUTATION,
  UPDATE_EXERCISE_SET_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import type { ExerciseSet } from "./SetCard";

interface SetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  set?: ExerciseSet | null;
  organizationId: string;
  onSuccess?: () => void;
}

export function SetDialog({
  open,
  onOpenChange,
  set,
  organizationId,
  onSuccess,
}: SetDialogProps) {
  const isEditing = !!set;
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

  const [createSet, { loading: creating }] = useMutation(CREATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
    ],
  });

  const [updateSet, { loading: updating }] = useMutation(UPDATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
    ],
  });

  const handleSubmit = async (values: SetFormValues) => {
    try {
      if (isEditing && set) {
        await updateSet({
          variables: {
            exerciseSetId: set.id,
            name: values.name,
            description: values.description || null,
          },
        });
        toast.success("Zestaw został zaktualizowany");
      } else {
        await createSet({
          variables: {
            organizationId,
            name: values.name,
            description: values.description || null,
          },
        });
        toast.success("Zestaw został utworzony");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas zapisywania zestawu:", error);
      toast.error(
        isEditing
          ? "Nie udało się zaktualizować zestawu"
          : "Nie udało się utworzyć zestawu"
      );
    }
  };

  const defaultValues = set
    ? {
        name: set.name,
        description: set.description || "",
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
        data-testid="set-dialog"
      >
        <DialogHeader>
          <DialogTitle data-testid="set-dialog-title">
            {isEditing ? "Edytuj zestaw" : "Nowy zestaw ćwiczeń"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Zmień właściwości zestawu"
              : "Utwórz nowy zestaw ćwiczeń dla pacjentów"}
          </DialogDescription>
        </DialogHeader>
        <SetForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCloseAttempt}
          isLoading={creating || updating}
          submitLabel={isEditing ? "Zapisz zmiany" : "Utwórz zestaw"}
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
