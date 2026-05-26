'use client';

import { use, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Archive, Undo2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { MasterVideoPlayer } from '@/features/verification/MasterVideoPlayer';
import {
  GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY,
  GET_ORGANIZATION_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import {
  APPROVE_ORGANIZATION_EXERCISE_MUTATION,
  ARCHIVE_ORGANIZATION_EXERCISE_MUTATION,
  REQUEST_ORGANIZATION_EXERCISE_CHANGES_MUTATION,
} from '@/graphql/mutations/adminExercises.mutations';
import {
  buildOrganizationVerificationDetailHref,
  buildOrganizationVerificationListHref,
  parseOrganizationVerificationFilter,
} from '@/features/verification/utils/orgVerificationPagination';
import type {
  AdminExercise,
  VerificationQueueNavigator,
} from '@/graphql/types/adminExercise.types';

interface OrganizationVerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationVerificationDetailPage({ params }: Readonly<OrganizationVerificationDetailPageProps>) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { canManageOrganization, isLoading: roleLoading } = useRoleAccess();

  const organizationId = currentOrganization?.organizationId;
  const filter = parseOrganizationVerificationFilter(searchParams.get('filter'));
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = Number(searchParams.get('pageSize') ?? '20') || 20;
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const listHref = useMemo(
    () =>
      buildOrganizationVerificationListHref({
        filter,
        search,
        page,
        pageSize,
        view: 'grid',
      }),
    [filter, search, page, pageSize]
  );

  const { data, loading, refetch } = useQuery<{ exerciseByIdForOrgVerification: AdminExercise | null }>(
    GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY,
    {
      variables: { organizationId: organizationId ?? '', id },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: navigatorData } = useQuery<{ organizationVerificationQueueNavigator: VerificationQueueNavigator }>(
    GET_ORGANIZATION_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
    {
      variables: {
        organizationId: organizationId ?? '',
        currentExerciseId: id,
        filter,
        search: search || null,
      },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );

  const [approveOrganizationExercise, { loading: approving }] = useMutation(APPROVE_ORGANIZATION_EXERCISE_MUTATION);
  const [requestChanges, { loading: rejecting }] = useMutation(REQUEST_ORGANIZATION_EXERCISE_CHANGES_MUTATION);
  const [archiveOrganizationExercise, { loading: archiving }] = useMutation(ARCHIVE_ORGANIZATION_EXERCISE_MUTATION);

  if (!roleLoading && !canManageOrganization) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Tylko Owner/Admin może zarządzać weryfikacją organizacji."
      />
    );
  }

  const exercise = data?.exerciseByIdForOrgVerification;

  if (!loading && !exercise) {
    return (
      <EmptyState
        icon={Archive}
        title="Nie znaleziono ćwiczenia"
        description="Ćwiczenie nie jest dostępne w kolejce tej organizacji."
        actionLabel="Wróć do listy"
        onAction={() => router.push(listHref)}
      />
    );
  }

  const goToNeighbor = (nextId?: string | null) => {
    if (!nextId) {
      router.push(listHref);
      return;
    }
    router.push(
      buildOrganizationVerificationDetailHref(nextId, {
        filter,
        search,
        page,
        pageSize,
        view: 'grid',
      })
    );
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" className="-ml-3" onClick={() => router.push(listHref)} data-testid="org-verification-back-btn">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Wróć do kolejki
      </Button>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{exercise?.name ?? 'Ładowanie...'}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[360px]">
            {exercise && <MasterVideoPlayer exercise={exercise} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Szczegóły ćwiczenia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Opis pacjenta</p>
              <p>{exercise?.patientDescription || 'Brak opisu'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Opis kliniczny</p>
              <p>{exercise?.clinicalDescription || 'Brak opisu klinicznego'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{exercise?.organizationVerificationStatus ?? 'NOT_SUBMITTED'}</Badge>
              {exercise?.submittedForOrgReviewAt && (
                <span className="text-xs text-muted-foreground">
                  Zgłoszono: {new Date(exercise.submittedForOrgReviewAt).toLocaleDateString('pl-PL')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decyzja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Notatka recenzenta"
              data-testid="org-verification-review-notes-input"
            />
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Powód odesłania do poprawek"
              data-testid="org-verification-reject-reason-input"
            />
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={approving}
                onClick={async () => {
                  try {
                    await approveOrganizationExercise({ variables: { exerciseId: id, reviewNotes: reviewNotes || null } });
                    toast.success('Ćwiczenie zweryfikowane.');
                    goToNeighbor(navigatorData?.organizationVerificationQueueNavigator.nextExerciseId);
                  } catch (error) {
                    console.error(error);
                    toast.error('Nie udało się zatwierdzić ćwiczenia.');
                  }
                }}
                data-testid="org-verification-approve-btn"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Zatwierdź
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={rejecting || !rejectReason.trim() || !reviewNotes.trim()}
                onClick={async () => {
                  try {
                    await requestChanges({
                      variables: { exerciseId: id, rejectionReason: rejectReason.trim(), reviewNotes: reviewNotes.trim() },
                    });
                    toast.success('Ćwiczenie odesłane do poprawek.');
                    goToNeighbor(navigatorData?.organizationVerificationQueueNavigator.nextExerciseId);
                  } catch (error) {
                    console.error(error);
                    toast.error('Nie udało się odesłać ćwiczenia do poprawek.');
                  }
                }}
                data-testid="org-verification-request-changes-btn"
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Odeślij do poprawek
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                disabled={archiving}
                onClick={async () => {
                  try {
                    await archiveOrganizationExercise({ variables: { exerciseId: id, reason: reviewNotes || null } });
                    toast.success('Ćwiczenie zarchiwizowane.');
                    router.push(listHref);
                  } catch (error) {
                    console.error(error);
                    toast.error('Nie udało się zarchiwizować ćwiczenia.');
                  } finally {
                    await refetch();
                  }
                }}
                data-testid="org-verification-archive-btn"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archiwizuj
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
