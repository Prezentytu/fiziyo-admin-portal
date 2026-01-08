'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { UserPlus, CheckCircle2, Send, UserPlus2, X, Sparkles } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SmartPatientLookup } from './SmartPatientLookup';
import { PatientFormValues } from './PatientForm';
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';
import { CREATE_SHADOW_PATIENT_MUTATION } from '@/graphql/mutations/users.mutations';
import { GET_THERAPIST_PATIENTS_QUERY, GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_CURRENT_ORGANIZATION_PLAN } from '@/graphql/queries/organizations.queries';
import { cn } from '@/lib/utils';
import { getAvatarGradient, getInitials } from '@/utils/textUtils';
import type { Patient } from '@/components/assignment/types';

interface CreatedPatient {
  id: string;
  fullname: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface PatientDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly therapistId: string;
  readonly clinicId?: string;
  readonly onSuccess?: () => void;
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
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const handleCloseAttempt = useCallback(() => {
    if (formIsDirty && !createdPatient) {
      setShowCloseConfirm(true);
    } else {
      setCreatedPatient(null);
      setShowSuccessAnimation(false);
      onOpenChange(false);
    }
  }, [formIsDirty, createdPatient, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setFormIsDirty(false);
    setCreatedPatient(null);
    setShowSuccessAnimation(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleClose = useCallback(() => {
    setCreatedPatient(null);
    setFormIsDirty(false);
    setShowSuccessAnimation(false);
    onOpenChange(false);
    onSuccess?.();
  }, [onOpenChange, onSuccess]);

  const handleAddAnother = useCallback(() => {
    setCreatedPatient(null);
    setFormIsDirty(false);
    setShowSuccessAnimation(false);
  }, []);

  const handleAssignSet = useCallback(() => {
    setShowAssignWizard(true);
  }, []);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormIsDirty(false);
      setCreatedPatient(null);
      setShowSuccessAnimation(false);
    }
  }, [open]);

  // Create shadow patient - creates user + adds to organization + assigns to therapist in one step
  const [createPatient, { loading }] = useMutation(CREATE_SHADOW_PATIENT_MUTATION, {
    refetchQueries: [
      { query: GET_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
      { query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
      { query: GET_CURRENT_ORGANIZATION_PLAN, variables: { organizationId } },
    ],
  });

  // Helper to format phone with +48 prefix
  const formatPhoneNumber = (phone: string | undefined): string | null => {
    if (!phone) return null;
    return phone.startsWith('+') ? phone : `+48${phone}`;
  };

  // Handler for new patient creation (from SmartPatientLookup form mode)
  const handleCreateNewPatient = async (values: PatientFormValues) => {
    try {
      // Format phone with +48 prefix if provided (backend expects full number)
      // Phone może być puste jeśli podano email - wysyłamy null zamiast ''
      const formattedPhone = formatPhoneNumber(values.phone);

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

      // Trigger success animation
      setShowSuccessAnimation(true);

      setCreatedPatient({
        id: patient.id,
        fullname: patient.fullname || `${values.firstName} ${values.lastName}`,
        email: patient.email,
        firstName: values.firstName,
        lastName: values.lastName,
      });
      setFormIsDirty(false);
      toast.success('Pacjent został dodany');
    } catch (error) {
      console.error('Błąd podczas dodawania pacjenta:', error);
      toast.error('Nie udało się dodać pacjenta');
    }
  };

  // Handler for SmartPatientLookup success (existing or new patient)
  const handleLookupSuccess = useCallback((patient: { id: string; fullname: string; email?: string; firstName?: string; lastName?: string }) => {
    if (patient.id) {
      // Existing patient was added via SmartPatientLookup
      setShowSuccessAnimation(true);
      setCreatedPatient({
        id: patient.id,
        fullname: patient.fullname,
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
      });
      setFormIsDirty(false);
    }
    // Note: If id is empty, SmartPatientLookup's PatientForm will handle submission
    // through onSubmit prop which we'll wire to handleCreateNewPatient
  }, []);

  // Convert created patient to AssignmentWizard format
  const wizardPatient: Patient | undefined = createdPatient
    ? {
        id: createdPatient.id,
        name: createdPatient.fullname,
        email: createdPatient.email,
        isShadowUser: true,
      }
    : undefined;

  // Get initials and gradient for success state
  const successInitials = createdPatient
    ? getInitials(createdPatient.firstName, createdPatient.lastName)
    : '?';
  const successGradient = createdPatient
    ? getAvatarGradient(createdPatient.firstName, createdPatient.lastName)
    : 'linear-gradient(135deg, #22c55e, #10b981)';

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
        <DialogContent
          className={cn(
            "p-0 gap-0 overflow-hidden",
            createdPatient ? "sm:max-w-md" : "sm:max-w-2xl"
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleCloseAttempt();
          }}
          data-testid="patient-dialog"
        >
          {createdPatient ? (
            // Success State - Animated
            <div className={cn(
              "p-8 text-center",
              showSuccessAnimation && "animate-in fade-in zoom-in-95 duration-300"
            )}>
              {/* Success Avatar - Larger with animation */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Glow effect */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full blur-xl opacity-50 transition-opacity duration-500",
                      showSuccessAnimation && "animate-pulse"
                    )}
                    style={{ background: successGradient }}
                  />
                  {/* Avatar */}
                  <div
                    className={cn(
                      "relative flex items-center justify-center rounded-full text-white font-bold text-3xl",
                      "w-24 h-24 shadow-2xl ring-4 ring-primary/20",
                      "transition-all duration-500",
                      showSuccessAnimation && "animate-in zoom-in-50 duration-500"
                    )}
                    style={{ background: successGradient }}
                  >
                    {successInitials}
                  </div>
                  {/* Checkmark badge */}
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full",
                      "bg-primary text-primary-foreground shadow-lg ring-4 ring-background",
                      "transition-all duration-300 delay-200",
                      showSuccessAnimation && "animate-in zoom-in-50 duration-300"
                    )}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Success Text */}
              <div className={cn(
                "space-y-1 mb-6",
                showSuccessAnimation && "animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150"
              )}>
                <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Pacjent dodany!
                </h2>
                <p className="text-lg text-muted-foreground">{createdPatient.fullname}</p>
              </div>

              {/* Next Steps */}
              <p className={cn(
                "text-sm text-muted-foreground mb-6",
                showSuccessAnimation && "animate-in fade-in duration-300 delay-200"
              )}>
                Co chcesz zrobić dalej?
              </p>

              {/* Action Buttons */}
              <div className={cn(
                "flex flex-col gap-3",
                showSuccessAnimation && "animate-in fade-in slide-in-from-bottom-3 duration-300 delay-300"
              )}>
                {/* Primary Action - Assign Set */}
                <Button
                  onClick={handleAssignSet}
                  className="w-full h-12 text-base gap-2 bg-linear-to-r from-primary to-primary-dark shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                  data-testid="patient-dialog-assign-btn"
                >
                  <Send className="h-5 w-5" />
                  Przypisz zestaw ćwiczeń
                </Button>

                {/* Secondary Action - Add Another */}
                <Button
                  variant="outline"
                  onClick={handleAddAnother}
                  className="w-full h-11 gap-2 hover:bg-surface-light transition-all duration-200"
                  data-testid="patient-dialog-add-another-btn"
                >
                  <UserPlus2 className="h-4 w-4" />
                  Dodaj kolejnego pacjenta
                </Button>

                {/* Tertiary Action - Close */}
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="w-full gap-2 text-muted-foreground hover:text-foreground transition-all duration-200"
                  data-testid="patient-dialog-close-btn"
                >
                  <X className="h-4 w-4" />
                  Zamknij
                </Button>
              </div>
            </div>
          ) : (
            // Smart Patient Lookup State
            <>
              <DialogHeader className="px-6 py-5 border-b border-border shrink-0 bg-linear-to-r from-surface to-surface-light/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-dark shadow-lg shadow-primary/25">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-xl font-bold" data-testid="patient-dialog-title">Nowy pacjent</DialogTitle>
                    <DialogDescription className="text-sm">
                      Podaj email lub telefon, aby znaleźć lub dodać pacjenta
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6">
                <SmartPatientLookup
                  organizationId={organizationId}
                  therapistId={therapistId}
                  clinicId={clinicId}
                  onSuccess={handleLookupSuccess}
                  onCreateNewPatient={handleCreateNewPatient}
                  onCancel={handleCloseAttempt}
                  isLoading={loading}
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
