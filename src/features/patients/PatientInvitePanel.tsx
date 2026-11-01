'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import * as z from 'zod';
import { Clock, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { INVITE_PATIENT_MUTATION } from '@/graphql/mutations/organizations.mutations';
import { GET_PATIENT_INVITATIONS_QUERY } from '@/graphql/queries/organizations.queries';
import type { InvitePatientData, InvitePatientVariables } from '@/graphql/types/patientInvitation.types';
import { PATIENT_INVITE_EXPLANATION, getGraphQLErrorMessage } from './utils/patientConsent';

const inviteEmailSchema = z.string().trim().email('Podaj poprawny adres email');

interface PatientInvitePanelProps {
  readonly initialEmail?: string;
  /** Server explanation of why the patient has to be invited (shown above the form). */
  readonly reason?: string;
  readonly sendLabel?: string;
  readonly onInvited?: (email: string) => void;
}

export function PatientInvitePanel({
  initialEmail = '',
  reason,
  sendLabel = 'Wyślij zaproszenie',
  onInvited,
}: PatientInvitePanelProps) {
  const [email, setEmail] = useState(initialEmail);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const [invitePatient, { loading }] = useMutation<InvitePatientData, InvitePatientVariables>(INVITE_PATIENT_MUTATION, {
    refetchQueries: [{ query: GET_PATIENT_INVITATIONS_QUERY }],
  });

  const handleSend = async () => {
    const parsed = inviteEmailSchema.safeParse(email);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Podaj poprawny adres email');
      return;
    }
    setValidationError(null);
    try {
      const result = await invitePatient({ variables: { email: parsed.data } });
      const sentTo = result.data?.invitePatient.email ?? parsed.data;
      setInvitedEmail(sentTo);
      toast.success('Zaproszenie utworzone');
      onInvited?.(sentTo);
    } catch (error) {
      setValidationError(getGraphQLErrorMessage(error, 'Nie udało się utworzyć zaproszenia. Spróbuj ponownie.'));
    }
  };

  if (invitedEmail) {
    return (
      <div
        role="status"
        className="rounded-xl border border-status-warning/30 bg-status-warning-muted p-4"
        data-testid="patient-invite-pending"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-status-warning" aria-hidden="true" />
          Zaproszenie czeka na akceptację
        </p>
        <p className="mt-1 break-all text-sm text-foreground">{invitedEmail}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pacjent dołączy do gabinetu po akceptacji w aplikacji FiziYo. Zaproszenie widać na liście pacjentów, tam
          możesz je wycofać.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSend();
      }}
      data-testid="patient-invite-panel"
    >
      {reason && (
        <p className="rounded-xl border border-status-info/30 bg-status-info-muted p-3 text-sm text-foreground">
          {reason}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="patient-invite-email">Email pacjenta</Label>
        <Input
          id="patient-invite-email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setValidationError(null);
          }}
          placeholder="jan@example.com"
          autoComplete="off"
          aria-invalid={validationError ? true : undefined}
          aria-describedby="patient-invite-explanation"
          data-testid="patient-invite-email-input"
        />
        {validationError && (
          <p className="text-sm text-status-danger" role="alert" data-testid="patient-invite-error">
            {validationError}
          </p>
        )}
        <p id="patient-invite-explanation" className="text-sm text-muted-foreground">
          {PATIENT_INVITE_EXPLANATION}
        </p>
      </div>
      <Button type="submit" disabled={loading} className="w-full" data-testid="patient-invite-send-btn">
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
        {sendLabel}
      </Button>
    </form>
  );
}
