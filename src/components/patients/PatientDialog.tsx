'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { UserPlus, CheckCircle2, Send, UserPlus2, X } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PatientForm, PatientFormValues } from './PatientForm';
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';
import { CREATE_SHADOW_PATIENT_MUTATION } from '@/graphql/mutations/users.mutations';
import { GET_THERAPIST_PATIENTS_QUERY, GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import type { Patient } from '@/components/assignment/types';

interface CreatedPatient {
  id: string;
  fullname: string;
  email?: string;
}

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
  const [createdPatient, setCreatedPatient] = useState<CreatedPatient | null>(null);
  const [showAssignWizard, setShowAssignWizard] = useState(false);

  const handleCloseAttempt = useCallback(() => {
    if (formIsDirty && !createdPatient) {
      setShowCloseConfirm(true);
    } else {
      setCreatedPatient(null);
      onOpenChange(false);
    }
  }, [formIsDirty, createdPatient, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setFormIsDirty(false);
    setCreatedPatient(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleClose = useCallback(() => {
    setCreatedPatient(null);
    setFormIsDirty(false);
    onOpenChange(false);
    onSuccess?.();
  }, [onOpenChange, onSuccess]);

  const handleAddAnother = useCallback(() => {
    setCreatedPatient(null);
    setFormIsDirty(false);
  }, []);

  const handleAssignSet = useCallback(() => {
    setShowAssignWizard(true);
  }, []);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormIsDirty(false);
      setCreatedPatient(null);
    }
  }, [open]);

  // Create shadow patient - creates user + adds to organization + assigns to therapist in one step
  const [createPatient, { loading }] = useMutation(CREATE_SHADOW_PATIENT_MUTATION, {
    refetchQueries: [
      { query: GET_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
      { query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
    ],
  });

  const handleSubmit = async (values: PatientFormValues) => {
    try {
      // Format phone with +48 prefix if provided (backend expects full number)
      // Phone może być puste jeśli podano email - wysyłamy null zamiast ''
      const formattedPhone = values.phone 
        ? (values.phone.startsWith('+') ? values.phone : `+48${values.phone}`)
        : null;
      
      const result = await createPatient({
        variables: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: formattedPhone,
          email: values.email || null,
          organizationId,
          clinicId: clinicId || null,
          contextLabel: values.contextLabel || null,
          // contextType używa wartości domyślnej PRIMARY z mutacji GraphQL
          // sendActivationSms używa wartości domyślnej false z mutacji GraphQL
        },
      });

      const patient = (result.data as { createShadowPatient?: { id: string; fullname?: string; email?: string } })
        ?.createShadowPatient;

      if (!patient) {
        throw new Error('Nie udało się utworzyć pacjenta');
      }

      setCreatedPatient({
        id: patient.id,
        fullname: patient.fullname || `${values.firstName} ${values.lastName}`,
        email: patient.email,
      });
      setFormIsDirty(false);
      toast.success('Pacjent został dodany');
    } catch (error) {
      console.error('Błąd podczas dodawania pacjenta:', error);
      toast.error('Nie udało się dodać pacjenta');
    }
  };

  // Convert created patient to AssignmentWizard format
  const wizardPatient: Patient | undefined = createdPatient
    ? {
        id: createdPatient.id,
        name: createdPatient.fullname,
        email: createdPatient.email,
        isShadowUser: true,
      }
    : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
        <DialogContent
          className="sm:max-w-xl p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleCloseAttempt();
          }}
        >
          {createdPatient ? (
            // Success State
            <div className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-foreground mb-1">Pacjent dodany!</h2>
              <p className="text-muted-foreground mb-6">{createdPatient.fullname}</p>

              <p className="text-sm text-muted-foreground mb-4">Co chcesz zrobić dalej?</p>

              <div className="flex flex-col gap-3">
                <Button onClick={handleAssignSet} className="w-full gap-2">
                  <Send className="h-4 w-4" />
                  Przypisz zestaw ćwiczeń
                </Button>
                <Button variant="outline" onClick={handleAddAnother} className="w-full gap-2">
                  <UserPlus2 className="h-4 w-4" />
                  Dodaj kolejnego pacjenta
                </Button>
                <Button variant="ghost" onClick={handleClose} className="w-full gap-2 text-muted-foreground">
                  <X className="h-4 w-4" />
                  Zamknij
                </Button>
              </div>
            </div>
          ) : (
            // Form State
            <>
              <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-xl font-bold truncate">Nowy pacjent</DialogTitle>
                    <DialogDescription className="truncate">Uzupełnij podstawowe dane pacjenta</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6">
                <PatientForm
                  onSubmit={handleSubmit}
                  onCancel={handleCloseAttempt}
                  isLoading={loading}
                  submitLabel="Dodaj pacjenta"
                  onDirtyChange={setFormIsDirty}
                />
              </div>
            </>
          )}
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

      {/* Assignment Wizard */}
      {wizardPatient && (
        <AssignmentWizard
          open={showAssignWizard}
          onOpenChange={(isOpen) => {
            setShowAssignWizard(isOpen);
            if (!isOpen) {
              handleClose();
            }
          }}
          mode="from-patient"
          preselectedPatient={wizardPatient}
          organizationId={organizationId}
          therapistId={therapistId}
          onSuccess={() => {
            setShowAssignWizard(false);
            handleClose();
          }}
        />
      )}
    </>
  );
}
