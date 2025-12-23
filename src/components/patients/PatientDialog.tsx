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
import { PatientForm, PatientFormValues } from "./PatientForm";
import { CREATE_SHADOW_PATIENT_MUTATION } from "@/graphql/mutations/users.mutations";
import { GET_THERAPIST_PATIENTS_QUERY } from "@/graphql/queries/therapists.queries";

interface PatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  therapistId: string;
  clinicId?: string;
  onSuccess?: () => void;
}

export function PatientDialog({
  open,
  onOpenChange,
  organizationId,
  therapistId,
  clinicId,
  onSuccess,
}: PatientDialogProps) {
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

  const [createPatient, { loading }] = useMutation(CREATE_SHADOW_PATIENT_MUTATION, {
    refetchQueries: [
      { query: GET_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
    ],
  });

  const handleSubmit = async (values: PatientFormValues) => {
    try {
      await createPatient({
        variables: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          email: values.email || null,
          organizationId,
          clinicId: clinicId || null,
          contextLabel: values.contextLabel || null,
          contextType: "PRIMARY",
          sendActivationSms: values.sendActivationSms,
        },
      });
      toast.success("Pacjent został dodany");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas dodawania pacjenta:", error);
      toast.error("Nie udało się dodać pacjenta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <DialogHeader>
          <DialogTitle>Nowy pacjent</DialogTitle>
          <DialogDescription>
            Dodaj nowego pacjenta do swojej listy. Pacjent otrzyma link do aktywacji konta.
          </DialogDescription>
        </DialogHeader>
        <PatientForm
          onSubmit={handleSubmit}
          onCancel={handleCloseAttempt}
          isLoading={loading}
          submitLabel="Dodaj pacjenta"
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

