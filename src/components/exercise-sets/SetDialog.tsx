"use client";

import * as React from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
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
          onCancel={() => onOpenChange(false)}
          isLoading={creating || updating}
          submitLabel={isEditing ? "Zapisz zmiany" : "Utwórz zestaw"}
        />
      </DialogContent>
    </Dialog>
  );
}

