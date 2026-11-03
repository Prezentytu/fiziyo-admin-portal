'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { Clock, Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { REVOKE_PATIENT_INVITATION_MUTATION } from '@/graphql/mutations/organizations.mutations';
import { GET_PATIENT_INVITATIONS_QUERY } from '@/graphql/queries/organizations.queries';
import type {
  PatientInvitationsData,
  RevokePatientInvitationData,
  RevokePatientInvitationVariables,
} from '@/graphql/types/patientInvitation.types';
import { getGraphQLErrorMessage, selectPendingPatientInvitations } from './utils/patientConsent';

interface PendingPatientInvitationsProps {
  readonly organizationId: string;
}

/** Patients invited to the clinic who have not accepted yet. Hidden when there are none. */
export function PendingPatientInvitations({ organizationId }: PendingPatientInvitationsProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data, error, refetch } = useQuery<PatientInvitationsData>(GET_PATIENT_INVITATIONS_QUERY, {
    skip: !organizationId,
    fetchPolicy: 'cache-and-network',
  });

  const [revokeInvitation] = useMutation<RevokePatientInvitationData, RevokePatientInvitationVariables>(
    REVOKE_PATIENT_INVITATION_MUTATION,
    { refetchQueries: [{ query: GET_PATIENT_INVITATIONS_QUERY }], awaitRefetchQueries: true }
  );

  const invitations = useMemo(
    () => selectPendingPatientInvitations(data?.patientInvitations ?? []),
    [data?.patientInvitations]
  );

  const handleRevoke = async (invitationId: string) => {
    setRevokingId(invitationId);
    try {
      await revokeInvitation({ variables: { invitationId } });
      toast.success('Zaproszenie wycofane');
    } catch (revokeError) {
      toast.error(getGraphQLErrorMessage(revokeError, 'Nie udało się wycofać zaproszenia'));
    } finally {
      setRevokingId(null);
    }
  };

  if (error && !data) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-label-secondary"
        data-testid="patient-invitations-error"
      >
        <span>Nie udało się pobrać zaproszeń pacjentów.</span>
        <Button variant="ghost" size="sm" onClick={() => void refetch()} data-testid="patient-invitations-retry-btn">
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <section aria-labelledby="patient-invitations-title" data-testid="patient-invitations-section">
      <h2 id="patient-invitations-title" className="px-3 pb-2.5 text-[13px] font-semibold text-label-secondary">
        Czekają na akceptację ({invitations.length})
      </h2>
      <ul>
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex min-h-[56px] items-center gap-3 border-t-[0.5px] border-separator px-3"
            data-testid="patient-invitation-row"
          >
            <Mail className="h-4 w-4 shrink-0 text-label-secondary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{invitation.email}</p>
              <p className="flex items-center gap-1 text-[13px] text-label-secondary">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Ważne do {format(new Date(invitation.expiresAt), 'd MMM yyyy', { locale: pl })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={revokingId === invitation.id}
              onClick={() => void handleRevoke(invitation.id)}
              aria-label={`Wycofaj zaproszenie dla ${invitation.email}`}
              data-testid="patient-invitation-revoke-btn"
            >
              {revokingId === invitation.id && <Loader2 className="animate-spin" aria-hidden="true" />}
              Wycofaj
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
