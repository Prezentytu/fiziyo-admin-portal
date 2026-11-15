'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ActivityStatusLabel } from '@/components/shared/page';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  canMarkSignalsReviewed,
  PATIENT_SIGNALS_POLL_MS,
  selectPatientSignals,
} from '@/features/patients/utils/patientSignals';
import { MARK_PATIENT_SIGNALS_REVIEWED_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { OrganizationPatientsResponse, UserByClerkIdResponse } from '@/types/apollo';

/** Dzwonek: pacjenci, którzy zgłosili ból, „za trudne” albo notatkę od ostatniego przejrzenia (SPEC-039). */
export function NotificationsBell() {
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const [open, setOpen] = useState(false);

  const { data: userData } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });
  const { data, error } = useQuery<OrganizationPatientsResponse>(GET_ORGANIZATION_PATIENTS_QUERY, {
    variables: { organizationId, filter: 'all' },
    skip: !organizationId,
    pollInterval: PATIENT_SIGNALS_POLL_MS,
    skipPollAttempt: () => document.hidden,
    errorPolicy: 'all',
  });
  const [markReviewed, { loading: marking }] = useMutation(MARK_PATIENT_SIGNALS_REVIEWED_MUTATION, {
    // By operation name: the dashboard and the patients list read the same rule with other variables.
    refetchQueries: ['GetOrganizationPatients'],
    onError: () => toast.error('Nie udało się oznaczyć zgłoszenia jako przejrzane'),
  });
  const canReview = canMarkSignalsReviewed(currentOrganization?.role);
  const patients = data?.organizationPatients;

  const therapistId = userData?.userByClerkId?.id;
  const signals = useMemo(
    () => selectPatientSignals(patients ?? [], therapistId),
    [patients, therapistId]
  );
  const count = signals.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="nav-notifications-btn"
          aria-label={count > 0 ? `Powiadomienia: zgłoszenia pacjentów (${count})` : 'Powiadomienia'}
        >
          <Bell className="h-5 w-5 text-label-secondary" />
          {count > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
              data-testid="nav-notifications-count"
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-testid="nav-notifications-panel">
        <h2 className="border-b-[0.5px] border-hairline px-4 py-3 text-[15px] font-semibold text-foreground">
          Zgłoszenia pacjentów
        </h2>
        {!patients ? (
          <p className="px-4 py-5 text-[13px] text-label-secondary" data-testid="nav-notifications-unavailable">
            {error ? 'Nie udało się wczytać zgłoszeń. Spróbuj ponownie za chwilę.' : 'Wczytywanie zgłoszeń…'}
          </p>
        ) : count === 0 ? (
          <p className="px-4 py-5 text-[13px] text-label-secondary" data-testid="nav-notifications-empty">
            Nikt nie zgłosił bólu, trudności ani notatki od ostatniego przejrzenia.
          </p>
        ) : (
          <ul className="flex max-h-96 flex-col overflow-y-auto">
            {signals.map((item) => (
              <li
                key={item.patientId}
                className="flex items-center gap-3 border-b-[0.5px] border-hairline px-4 py-3 last:border-b-0"
                data-testid={`nav-notifications-item-${item.patientId}`}
              >
                <Link
                  href={`/patients/${item.patientId}`}
                  onClick={() => setOpen(false)}
                  className="min-w-0 flex-1"
                  data-testid={`nav-notifications-item-${item.patientId}-link`}
                >
                  <b className="block truncate text-[14px] text-foreground">{item.name}</b>
                  <ActivityStatusLabel tone={item.activity.tone} label={item.activity.label} className="text-[13px]" />
                </Link>
                {canReview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={marking || !organizationId}
                    onClick={() => markReviewed({ variables: { organizationId, patientId: item.patientId } })}
                    data-testid={`nav-notifications-item-${item.patientId}-reviewed-btn`}
                  >
                    Przejrzane
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
