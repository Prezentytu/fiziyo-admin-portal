'use client';

import { use, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Archive, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useSystemRole } from '@/hooks/useSystemRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { MasterVideoPlayer } from '@/features/verification/MasterVideoPlayer';
import { VerdictPanel } from '@/features/verification/VerdictPanel';
import {
  GET_CROSS_ORG_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
  GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY,
} from '@/graphql/queries/crossOrgVerification.queries';
import {
  APPROVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION,
  ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION,
  REQUEST_ORGANIZATION_EXERCISE_CHANGES_AS_ADMIN_MUTATION,
} from '@/graphql/mutations/crossOrgVerification.mutations';
import type {
  AdminExercise,
  GetCrossOrgVerificationQueueNavigatorResponse,
  VerificationQueueNavigator,
} from '@/graphql/types/adminExercise.types';

interface CrossOrgVerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

type CrossOrgFilter = 'pending' | 'changes' | 'verified' | 'archived';

function parseFilter(value: string | null): CrossOrgFilter {
  if (value === 'changes' || value === 'verified' || value === 'archived') {
    return value;
  }
  return 'pending';
}

export default function CrossOrgVerificationDetailPage({ params }: Readonly<CrossOrgVerificationDetailPageProps>) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSiteSuperAdmin, isLoading: roleLoading } = useSystemRole();

  const filter = parseFilter(searchParams.get('filter'));
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = Number(searchParams.get('pageSize') ?? '20') || 20;
  const [reviewNotes, setReviewNotes] = useState('');

  const listHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('filter', filter);
    if (search.trim()) {
      params.set('search', search.trim());
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return `/verification/organizations?${params.toString()}`;
  }, [filter, search, page, pageSize]);

  const { data, loading, refetch } = useQuery<{ exerciseByIdForCrossOrgVerification: AdminExercise | null }>(
    GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY,
    {
      variables: { exerciseId: id },
      skip: !isSiteSuperAdmin,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: navigatorData } = useQuery<GetCrossOrgVerificationQueueNavigatorResponse>(
    GET_CROSS_ORG_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
    {
      variables: {
        currentExerciseId: id,
        filter,
        search: search || null,
      },
      skip: !isSiteSuperAdmin,
      fetchPolicy: 'cache-and-network',
    }
  );

  const [approveOrganizationExercise, { loading: approving }] = useMutation(APPROVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION);
  const [requestChanges, { loading: rejecting }] = useMutation(REQUEST_ORGANIZATION_EXERCISE_CHANGES_AS_ADMIN_MUTATION);
  const [archiveOrganizationExercise, { loading: archiving }] = useMutation(ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION);

  if (!roleLoading && !isSiteSuperAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Tylko SiteSuperAdmin może moderować cross-organizacyjną weryfikację."
      />
    );
  }

  const exercise = data?.exerciseByIdForCrossOrgVerification;

  if (!loading && !exercise) {
    return (
      <EmptyState
        icon={Archive}
        title="Nie znaleziono ćwiczenia"
        description="Ćwiczenie nie jest dostępne w tej kolejce."
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
    const params = new URLSearchParams();
    params.set('filter', filter);
    if (search.trim()) {
      params.set('search', search.trim());
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    router.push(`/verification/organizations/${nextId}?${params.toString()}`);
  };

  return (
    <div className="space-y-4" data-testid="cross-org-verification-detail-page">
      <Button variant="ghost" className="-ml-3" onClick={() => router.push(listHref)} data-testid="cross-org-verification-back-btn">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Wróć do kolejki
      </Button>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{exercise?.name ?? 'Ładowanie...'}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[360px]">{exercise && <MasterVideoPlayer exercise={exercise} />}</CardContent>
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
              {exercise?.organizationId && <Badge variant="secondary">{exercise.organizationId}</Badge>}
            </div>
          </CardContent>
        </Card>

        <VerdictPanel
          mode="organization"
          status={exercise?.organizationVerificationStatus ?? 'NOT_SUBMITTED'}
          submittedAt={exercise?.submittedForOrgReviewAt}
          onApprove={async () => {
            try {
              await approveOrganizationExercise({ variables: { exerciseId: id, reviewNotes: reviewNotes || null } });
              toast.success('Ćwiczenie zweryfikowane.');
              goToNeighbor(navigatorData?.crossOrgVerificationQueueNavigator.nextExerciseId);
            } catch (error) {
              console.error(error);
              toast.error('Nie udało się zatwierdzić ćwiczenia.');
            }
          }}
          onRequestChanges={async () => {
            const reviewNotesValue = reviewNotes.trim();
            if (!reviewNotesValue) {
              toast.error('Dodaj notatkę recenzencką przed odesłaniem.');
              return;
            }

            try {
              await requestChanges({
                variables: {
                  exerciseId: id,
                  rejectionReason: reviewNotesValue,
                  reviewNotes: reviewNotesValue,
                },
              });
              toast.success('Ćwiczenie odesłane do poprawek.');
              goToNeighbor(navigatorData?.crossOrgVerificationQueueNavigator.nextExerciseId);
            } catch (error) {
              console.error(error);
              toast.error('Nie udało się odesłać ćwiczenia do poprawek.');
            }
          }}
          onReject={() => {}}
          onArchive={async () => {
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
          comment={reviewNotes}
          onCommentChange={setReviewNotes}
          safetyChecklist={{
            videoReadable: true,
            techniqueSafe: true,
            noContraindications: true,
          }}
          onSafetyChecklistChange={() => {}}
          isApproving={approving}
          isRejecting={rejecting}
          isUnpublishing={archiving}
          remainingCount={(navigatorData?.crossOrgVerificationQueueNavigator as VerificationQueueNavigator | undefined)?.remainingCount ?? 0}
          onSkip={() => goToNeighbor(navigatorData?.crossOrgVerificationQueueNavigator.nextExerciseId)}
        />
      </div>
    </div>
  );
}
