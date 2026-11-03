'use client';

import { use, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, ShieldCheck } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { VerificationWorkspace, type OrganizationDecision } from '@/features/verification/VerificationWorkspace';
import { VerificationWorkspaceSkeleton } from '@/features/verification/VerificationWorkspaceSkeleton';
import { useSystemRole } from '@/hooks/useSystemRole';

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

/**
 * Backoffice moderation of organization queues (SiteSuperAdmin): the five-stage workspace with
 * organization decisions run through the `*AsAdmin` mutations.
 */
export default function CrossOrgVerificationDetailPage({ params }: Readonly<CrossOrgVerificationDetailPageProps>) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSiteSuperAdmin, isLoading: roleLoading } = useSystemRole();

  const filter = parseFilter(searchParams.get('filter'));
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = Number(searchParams.get('pageSize') ?? '20') || 20;

  const queryString = useMemo(() => {
    const urlParams = new URLSearchParams();
    urlParams.set('filter', filter);
    if (search.trim()) {
      urlParams.set('search', search.trim());
    }
    urlParams.set('page', String(page));
    urlParams.set('pageSize', String(pageSize));
    return urlParams.toString();
  }, [filter, search, page, pageSize]);
  const listHref = `/verification/organizations?${queryString}`;
  const buildDetailUrl = useCallback(
    (exerciseId: string) => `/verification/organizations/${exerciseId}?${queryString}`,
    [queryString]
  );

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
      variables: { currentExerciseId: id, filter, search: search || null },
      skip: !isSiteSuperAdmin,
      fetchPolicy: 'cache-and-network',
    }
  );

  const [approveOrganizationExercise, { loading: approving }] = useMutation(
    APPROVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION
  );
  const [requestChanges, { loading: requestingChanges }] = useMutation(
    REQUEST_ORGANIZATION_EXERCISE_CHANGES_AS_ADMIN_MUTATION
  );
  const [archiveOrganizationExercise, { loading: archiving }] = useMutation(
    ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION
  );

  const exercise = data?.exerciseByIdForCrossOrgVerification ?? null;
  const navigator = navigatorData?.crossOrgVerificationQueueNavigator as VerificationQueueNavigator | undefined;

  const reloadImages = useCallback(async () => {
    const result = await refetch();
    return result.data?.exerciseByIdForCrossOrgVerification?.images ?? [];
  }, [refetch]);

  const decision = useMemo<OrganizationDecision>(
    () => ({
      status: exercise?.organizationVerificationStatus,
      isBusy: approving || requestingChanges || archiving,
      onApprove: async () => {
        await approveOrganizationExercise({ variables: { exerciseId: id, reviewNotes: null } });
      },
      onRequestChanges: async (notes) => {
        await requestChanges({ variables: { exerciseId: id, rejectionReason: notes, reviewNotes: notes } });
      },
      onArchive: async () => {
        await archiveOrganizationExercise({ variables: { exerciseId: id, reason: null } });
      },
    }),
    [
      approveOrganizationExercise,
      approving,
      archiveOrganizationExercise,
      archiving,
      exercise?.organizationVerificationStatus,
      id,
      requestChanges,
      requestingChanges,
    ]
  );

  if (!roleLoading && !isSiteSuperAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Tylko SiteSuperAdmin może moderować cross-organizacyjną weryfikację."
      />
    );
  }

  if (loading && !exercise) {
    return <VerificationWorkspaceSkeleton />;
  }

  if (!exercise) {
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

  return (
    <VerificationWorkspace
      key={exercise.id}
      exercise={exercise}
      queuePosition={navigator?.positionInQueue ?? null}
      queueTotal={navigator?.totalInQueue ?? 0}
      nextExerciseId={navigator?.nextExerciseId ?? null}
      listUrl={listHref}
      buildDetailUrl={buildDetailUrl}
      reloadImages={reloadImages}
      organizationDecision={decision}
      backTestId="cross-org-verification-back-btn"
      data-testid="cross-org-verification-detail-page"
    />
  );
}
