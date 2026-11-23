'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { Bell, MessageCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ActivityStatusLabel } from '@/components/shared/page';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DUPLICATE_REVIEW_NOTES_PREFIX, duplicateReviewReason } from '@/features/exercises/utils/duplicateReviewReason';
import {
  canMarkSignalsReviewed,
  PATIENT_SIGNALS_POLL_MS,
  selectPatientSignals,
} from '@/features/patients/utils/patientSignals';
import { useSupportUnreadCount } from '@/features/support/useSupport';
import { SUPPORT_PATH, supportTabUnread } from '@/features/support/utils/support';
import { useMarkReleaseNoteSeen, useUnseenReleaseNote } from '@/features/whats-new/useReleaseNotes';
import {
  notificationsBellCount,
  notificationsBellLabel,
  releaseNoteHref,
} from '@/features/whats-new/utils/releaseNotes';
import { MARK_PATIENT_SIGNALS_REVIEWED_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { GET_DUPLICATE_SUBMISSION_NOTICES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { DuplicateSubmissionNoticesResponse } from '@/graphql/types/exercise.types';
import type { OrganizationPatientsResponse, UserByClerkIdResponse } from '@/types/apollo';

export function NotificationsBell() {
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const scope = JSON.stringify([user?.id, organizationId]);

  return (
    <ScopedNotificationsBell
      key={scope}
      storageKey={`fiziyo:seen-duplicate-submissions:${scope}`}
      clerkId={user?.id}
      organizationId={organizationId}
      role={currentOrganization?.role}
    />
  );
}

function loadSeenDuplicateSubmissions(storageKey: string): string[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function ScopedNotificationsBell({
  storageKey,
  clerkId,
  organizationId,
  role,
}: {
  storageKey: string;
  clerkId?: string;
  organizationId?: string;
  role?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [seenDuplicateIds, setSeenDuplicateIds] = useState(() => loadSeenDuplicateSubmissions(storageKey));

  const { data: userData } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId },
    skip: !clerkId,
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
  const canReview = canMarkSignalsReviewed(role);
  const patients = data?.organizationPatients;

  const therapistId = userData?.userByClerkId?.id;
  const { data: submissions, error: submissionsError } = useQuery<DuplicateSubmissionNoticesResponse>(
    GET_DUPLICATE_SUBMISSION_NOTICES_QUERY,
    {
      variables: { organizationId, userId: therapistId, notesPrefix: DUPLICATE_REVIEW_NOTES_PREFIX },
      skip: !organizationId || !therapistId,
      fetchPolicy: 'no-cache',
      pollInterval: PATIENT_SIGNALS_POLL_MS,
      skipPollAttempt: () => document.hidden,
    }
  );
  const originalsById = new Map(submissions?.originals.map((original) => [original.id, original]));
  const duplicates = (submissions?.duplicates ?? []).flatMap((submission) => {
    const original = submission.sourceOrganizationExerciseId && originalsById.get(submission.sourceOrganizationExerciseId);
    const reason = duplicateReviewReason(submission.adminReviewNotes);
    if (!original || original.globalSubmissionId !== submission.id || !reason || seenDuplicateIds.includes(submission.id)) {
      return [];
    }
    return [{ id: submission.id, original, reason }];
  });
  const signals = useMemo(() => selectPatientSignals(patients ?? [], therapistId), [patients, therapistId]);
  const releaseNote = useUnseenReleaseNote();
  const markReleaseSeen = useMarkReleaseNoteSeen();
  const sentRelease = releaseNote?.notified ? releaseNote : null;
  const supportCount = useSupportUnreadCount();
  const teamMessages = supportTabUnread(supportCount, 'CONVERSATIONS');
  const count = notificationsBellCount(signals.length, releaseNote, teamMessages > 0) + duplicates.length;

  const openDuplicate = (submissionId: string) => {
    const next = [...new Set([...loadSeenDuplicateSubmissions(storageKey), ...seenDuplicateIds, submissionId])];
    setSeenDuplicateIds(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The in-memory acknowledgement also works when browser storage is blocked.
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="nav-notifications-btn"
          aria-label={notificationsBellLabel(signals.length, sentRelease !== null, teamMessages > 0, duplicates.length)}
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
      <PopoverContent align="end" className="max-h-[min(32rem,80vh)] w-80 overflow-y-auto p-0" data-testid="nav-notifications-panel">
        {sentRelease && (
          <Link
            href={releaseNoteHref(sentRelease.id)}
            onClick={() => {
              setOpen(false);
              markReleaseSeen(sentRelease.id);
            }}
            className="flex items-start gap-3 border-b-[0.5px] border-hairline bg-tint-muted px-4 py-3 hover:bg-tint-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            data-testid="nav-notifications-release-link"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-tint" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <b className="block text-[14px] text-foreground">Nowa wersja portalu</b>
              <span className="block truncate text-[13px] text-label-secondary">{sentRelease.title}</span>
            </span>
          </Link>
        )}
        {teamMessages > 0 && (
          <Link
            href={SUPPORT_PATH}
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 border-b-[0.5px] border-hairline bg-tint-muted px-4 py-3 hover:bg-tint-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            data-testid="nav-notifications-support-link"
          >
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-tint" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <b className="block text-[14px] text-foreground">Wiadomość od zespołu FiziYo</b>
              <span className="block truncate text-[13px] text-label-secondary">
                {teamMessages === 1 ? 'Nowa wiadomość we Wsparciu' : `Nowe wiadomości we Wsparciu: ${teamMessages}`}
              </span>
            </span>
          </Link>
        )}
        {duplicates.length > 0 && (
          <section aria-label="Zgłoszenia ćwiczeń do FiziYo">
            <h2 className="border-b-[0.5px] border-hairline px-4 py-3 text-[15px] font-semibold text-foreground">
              Zgłoszenia ćwiczeń do FiziYo
            </h2>
            <ul>
              {duplicates.map(({ id, original, reason }) => (
                <li key={id} className="border-b-[0.5px] border-hairline">
                  <Link
                    href={`/exercises/${encodeURIComponent(original.id)}`}
                    onClick={() => openDuplicate(id)}
                    className="block px-4 py-3 hover:bg-fill-tertiary"
                    data-testid={`nav-notifications-duplicate-${id}-link`}
                  >
                    <b className="block break-words text-[14px] text-foreground">{original.name}</b>
                    <p className="text-[13px] text-foreground">Wycofano zgłoszenie jako duplikat.</p>
                    <p className="break-words text-[13px] text-label-secondary">{reason}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {submissionsError && (
          <p role="status" className="border-b-[0.5px] border-hairline px-4 py-3 text-[13px] text-label-secondary">
            Nie udało się wczytać decyzji dotyczących zgłoszeń ćwiczeń.
          </p>
        )}
        <h2 className="border-b-[0.5px] border-hairline px-4 py-3 text-[15px] font-semibold text-foreground">
          Zgłoszenia pacjentów
        </h2>
        {!patients ? (
          <p className="px-4 py-5 text-[13px] text-label-secondary" data-testid="nav-notifications-unavailable">
            {error ? 'Nie udało się wczytać zgłoszeń. Spróbuj ponownie za chwilę.' : 'Wczytywanie zgłoszeń…'}
          </p>
        ) : signals.length === 0 ? (
          <p className="px-4 py-5 text-[13px] text-label-secondary" data-testid="nav-notifications-empty">
            Nikt nie zgłosił bólu, trudności ani notatki od ostatniego przejrzenia.
          </p>
        ) : (
          <ul className="flex flex-col">
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
