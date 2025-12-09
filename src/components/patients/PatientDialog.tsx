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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nowy pacjent</DialogTitle>
          <DialogDescription>
            Dodaj nowego pacjenta do swojej listy. Pacjent otrzyma link do aktywacji konta.
          </DialogDescription>
        </DialogHeader>
        <PatientForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={loading}
          submitLabel="Dodaj pacjenta"
        />
      </DialogContent>
    </Dialog>
  );
}

