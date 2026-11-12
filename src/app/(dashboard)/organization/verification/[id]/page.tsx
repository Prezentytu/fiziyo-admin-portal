'use client';

import { use, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/shared/EmptyState';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VerificationWorkspace, type OrganizationDecision } from '@/features/verification/VerificationWorkspace';
import { VerificationWorkspaceSkeleton } from '@/features/verification/VerificationWorkspaceSkeleton';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { ORG_VERIFICATION_REFETCH_QUERIES } from '@/hooks/useOrganizationVerificationRealtime';

import {
  GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY,
  GET_ORGANIZATION_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import {
  APPROVE_ORGANIZATION_EXERCISE_MUTATION,
  ARCHIVE_ORGANIZATION_EXERCISE_MUTATION,
  REQUEST_ORGANIZATION_EXERCISE_CHANGES_MUTATION,
} from '@/graphql/mutations/adminExercises.mutations';
import { UPDATE_EXERCISE_MUTATION as UPDATE_EXERCISE_DETAILS_MUTATION } from '@/graphql/mutations/exercises.mutations';
import {
  buildEnrichmentUpdateVariables,
  isExerciseSaveAuthError,
} from '@/features/exercises/utils/buildEnrichmentUpdateVariables';
import { parseQueueOrdering, queueOrderingVariables } from '@/features/verification/utils/queueOrdering';
import {
  buildOrganizationVerificationDetailHref,
  buildOrganizationVerificationListHref,
  parseOrganizationVerificationFilter,
} from '@/features/verification/utils/orgVerificationPagination';
import type { AdminExercise, VerificationQueueNavigator } from '@/graphql/types/adminExercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface OrganizationVerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Organization verification (Owner/Admin): the same five-stage workspace as the global track,
 * with the organization decisions (approve, request changes, archive).
 */
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
  const ordering = useMemo(() => parseQueueOrdering(searchParams), [searchParams]);

  const listHref = useMemo(
    () => buildOrganizationVerificationListHref({ filter, search, page, pageSize, view: 'grid', ordering }),
    [filter, search, page, pageSize, ordering]
  );
  const buildDetailUrl = useCallback(
    (exerciseId: string) =>
      buildOrganizationVerificationDetailHref(exerciseId, { filter, search, page, pageSize, view: 'grid', ordering }),
    [filter, search, page, pageSize, ordering]
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
        ...queueOrderingVariables(ordering),
      },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );

  const orgVerificationRefetch = { refetchQueries: [...ORG_VERIFICATION_REFETCH_QUERIES] };
  const [approveOrganizationExercise, { loading: approving }] = useMutation(
    APPROVE_ORGANIZATION_EXERCISE_MUTATION,
    orgVerificationRefetch
  );
  const [requestChanges, { loading: requestingChanges }] = useMutation(
    REQUEST_ORGANIZATION_EXERCISE_CHANGES_MUTATION,
    orgVerificationRefetch
  );
  const [archiveOrganizationExercise, { loading: archiving }] = useMutation(
    ARCHIVE_ORGANIZATION_EXERCISE_MUTATION,
    orgVerificationRefetch
  );
  const [updateExerciseDetails] = useMutation(UPDATE_EXERCISE_DETAILS_MUTATION, {
    onError: (error) => toast.error(`Błąd zapisu: ${error.message}`),
  });

  const exercise = data?.exerciseByIdForOrgVerification ?? null;
  const navigator = navigatorData?.organizationVerificationQueueNavigator;

  const saveEnrichment = useCallback(
    async (payload: ExerciseEnrichmentData) => {
      await updateExerciseDetails({ variables: buildEnrichmentUpdateVariables(id, payload) });
    },
    [id, updateExerciseDetails]
  );

  const handleSaveError = useCallback((error: unknown) => {
    toast.error(isExerciseSaveAuthError(error) ? 'Brak uprawnień do zapisu tych zmian' : 'Nie udało się zapisać zmian');
  }, []);

  const reloadImages = useCallback(async () => {
    const result = await refetch();
    return result.data?.exerciseByIdForOrgVerification?.images ?? [];
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

  if (!roleLoading && !canManageOrganization) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Tylko Owner/Admin może zarządzać weryfikacją organizacji."
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
        description="Ćwiczenie nie jest dostępne w kolejce tej organizacji."
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
      saveEnrichment={saveEnrichment}
      onSaveError={handleSaveError}
      backTestId="org-verification-back-btn"
      data-testid="org-verification-workspace"
    />
  );
}
