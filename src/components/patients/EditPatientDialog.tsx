'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Loader2, User, Mail, Phone, AlertCircle } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

import { UPDATE_SHADOW_PATIENT_MUTATION } from '@/graphql/mutations/users.mutations';
import { GET_USER_BY_ID_QUERY } from '@/graphql/queries/users.queries';

interface Patient {
  id: string;
  fullname?: string;
  email?: string;
  isShadowUser?: boolean;
  personalData?: {
    firstName?: string;
    lastName?: string;
  };
  contactData?: {
    phone?: string;
  };
}

interface EditPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  onSuccess?: () => void;
}

// Helper to get initial values from patient
function getPatientFormValues(patient: Patient | null) {
  return {
    firstName: patient?.personalData?.firstName || '',
    lastName: patient?.personalData?.lastName || '',
    email: patient?.email || '',
    phone: patient?.contactData?.phone?.replace('+48', '') || '',
  };
}

export function EditPatientDialog({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: Readonly<EditPatientDialogProps>) {
  // Track last synced patient ID to reset form only when patient changes
  const [lastSyncedPatientId, setLastSyncedPatientId] = useState<string | null>(null);

  // Compute initial values from patient
  const initialValues = useMemo(() => getPatientFormValues(patient), [patient]);

  // Form state - initialize from patient when dialog opens
  const shouldReset = open && patient && lastSyncedPatientId !== patient.id;
  const [firstName, setFirstName] = useState(shouldReset ? initialValues.firstName : '');
  const [lastName, setLastName] = useState(shouldReset ? initialValues.lastName : '');
  const [email, setEmail] = useState(shouldReset ? initialValues.email : '');
  const [phone, setPhone] = useState(shouldReset ? initialValues.phone : '');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Sync tracking - update lastSyncedPatientId when we detect a new patient
  if (shouldReset) {
    setLastSyncedPatientId(patient.id);
    setFirstName(initialValues.firstName);
    setLastName(initialValues.lastName);
    setEmail(initialValues.email);
    setPhone(initialValues.phone);
  }

  // Check if there are unsaved changes
  const hasChanges =
    firstName !== initialValues.firstName ||
    lastName !== initialValues.lastName ||
    email !== initialValues.email ||
    phone !== initialValues.phone;

  // Mutation
  const [updatePatient, { loading }] = useMutation(UPDATE_SHADOW_PATIENT_MUTATION, {
    refetchQueries: [
      { query: GET_USER_BY_ID_QUERY, variables: { id: patient?.id } },
    ],
    awaitRefetchQueries: true,
  });

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSave = async () => {
    if (!patient) return;

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Imię i nazwisko są wymagane');
      return;
    }

    try {
      await updatePatient({
        variables: {
          userId: patient.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || null,
          phone: phone ? `+48${phone.replaceAll(' ', '')}` : null,
        },
      });
      toast.success('Dane pacjenta zostały zaktualizowane');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas aktualizacji pacjenta:', error);
      const gqlError = error as { graphQLErrors?: Array<{ message: string }> };
      const errorMessage = gqlError.graphQLErrors?.[0]?.message || 'Nie udało się zaktualizować danych pacjenta';
      toast.error(errorMessage);
    }
  };

  if (!patient) return null;

  const isShadowUser = patient.isShadowUser;

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleCloseAttempt();
          }}
          data-testid="edit-patient-dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Edytuj dane pacjenta
            </DialogTitle>
            <DialogDescription>
              Zmień dane dla pacjenta {patient.fullname || `${patient.personalData?.firstName} ${patient.personalData?.lastName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Alert for non-shadow users */}
            {!isShadowUser && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  Ten pacjent ma aktywne konto. Może samodzielnie edytować swoje dane w aplikacji.
                </p>
              </div>
            )}

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">Imię</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jan"
                className="h-11"
                autoFocus
                disabled={!isShadowUser}
                data-testid="edit-patient-firstname"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Kowalski"
                className="h-11"
                disabled={!isShadowUser}
                data-testid="edit-patient-lastname"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@example.com"
                className="h-11"
                disabled={!isShadowUser}
                data-testid="edit-patient-email"
              />
              {!isShadowUser && (
                <p className="text-xs text-muted-foreground">
                  Email nie może być zmieniony dla użytkowników z aktywnym kontem.
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Telefon
              </Label>
              <PhoneInput
                id="phone"
                value={phone}
                onChange={setPhone}
                placeholder="123 456 789"
                className="h-11"
                disabled={!isShadowUser}
                data-testid="edit-patient-phone"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleCloseAttempt} disabled={loading} data-testid="edit-patient-cancel-btn">
                Anuluj
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !hasChanges || !isShadowUser}
                data-testid="edit-patient-submit-btn"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz zmiany
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm close dialog */}
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
    </>
  );
}
