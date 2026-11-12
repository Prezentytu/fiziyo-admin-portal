'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { VerificationWorkspace } from '@/features/verification/VerificationWorkspace';
import { VerificationWorkspaceSkeleton } from '@/features/verification/VerificationWorkspaceSkeleton';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useSystemRole } from '@/hooks/useSystemRole';
import { getExerciseReports } from '@/services/exerciseReportService';
import { parseQueueOrdering, queueOrderingVariables } from '@/features/verification/utils/queueOrdering';
import {
  buildVerificationDetailHref,
  buildVerificationListHref,
  parseVerificationFilter,
} from '@/features/verification/utils/verificationPagination';

import {
  GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY,
  GET_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import type { ExerciseByIdForAdminResponse } from '@/types/apollo';
import type {
  AdminExercise,
  GetVerificationQueueNavigatorResponse,
  GetVerificationQueueNavigatorVariables,
  GetVerificationStatsResponse,
} from '@/graphql/types/adminExercise.types';
import type { ExerciseReport } from '@/types/exercise-report.types';

interface VerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Global exercise verification: the therapist walks the exercise through five stages
 * (material, parameters, instruction, safety, decision), corrects it and publishes it.
 * Stage logic lives in `VerificationWorkspace`; this page owns data loading and queue URLs.
 */
export default function VerificationDetailPage({ params }: Readonly<VerificationDetailPageProps>) {
  const { id } = use(params);
  const router = useRouter();
  const apolloClient = useApolloClient();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();
  const { canReviewExercises, isLoading: roleLoading } = useSystemRole();
  const [openReports, setOpenReports] = useState<ExerciseReport[]>([]);

  const { data, loading, error, refetch } = useQuery<ExerciseByIdForAdminResponse>(GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY, {
    variables: { id },
    // The workspace takes its baseline once, on open; a cached (older) document would raise a false save conflict.
    fetchPolicy: 'network-only',
  });

  const queueFilter = useMemo(() => {
    const normalized = parseVerificationFilter(searchParams.get('filter'));
    return normalized === 'reported' ? 'pending' : normalized;
  }, [searchParams]);
  const queueSearch = useMemo(() => searchParams.get('search') || null, [searchParams]);
  const queueOrdering = useMemo(() => parseQueueOrdering(searchParams), [searchParams]);
  const listQueryString = useMemo(() => searchParams.toString(), [searchParams]);
  const listUrl = useMemo(() => {
    if (!listQueryString) {
      return '/verification';
    }
    const params = new URLSearchParams(listQueryString);
    const normalizedFilter = parseVerificationFilter(params.get('filter'));
    params.set('filter', normalizedFilter === 'reported' ? 'pending' : normalizedFilter);
    return buildVerificationListHref({
      filter: parseVerificationFilter(params.get('filter')),
      search: params.get('search') ?? '',
      page: Number(params.get('page') ?? '1'),
      pageSize: Number(params.get('pageSize') ?? '20'),
      view: params.get('view') === 'list' ? 'list' : 'grid',
      ordering: parseQueueOrdering(params),
    });
  }, [listQueryString]);
  const buildDetailUrl = useCallback(
    (exerciseId: string) =>
      listQueryString
        ? buildVerificationDetailHref(exerciseId, {
            filter: queueFilter,
            search: searchParams.get('search') ?? '',
            page: Number(searchParams.get('page') ?? '1'),
            pageSize: Number(searchParams.get('pageSize') ?? '20'),
            view: searchParams.get('view') === 'list' ? 'list' : 'grid',
            ordering: queueOrdering,
          })
        : `/verification/${exerciseId}`,
    [listQueryString, queueFilter, searchParams, queueOrdering]
  );

  const { data: queueNavigatorData } = useQuery<GetVerificationQueueNavigatorResponse, GetVerificationQueueNavigatorVariables>(
    GET_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
    {
      variables: {
        currentExerciseId: id,
        filter: queueFilter,
        search: queueSearch,
        ...queueOrderingVariables(queueOrdering),
      },
      skip: !canReviewExercises || !id,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: statsData } = useQuery<GetVerificationStatsResponse>(GET_VERIFICATION_STATS_QUERY);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      const reports = await getExerciseReports({ exerciseId: id, status: 'OPEN' });
      if (!cancelled) {
        setOpenReports(reports);
      }
    };

    loadReports();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const exercise = data?.exerciseByIdForAdmin as unknown as AdminExercise | null;
  const navigator = queueNavigatorData?.verificationQueueNavigator;
  const queueTotal = navigator?.totalInQueue ?? statsData?.verificationStats?.pendingReview ?? 0;
  const nextExerciseId = navigator?.nextExerciseId ?? null;

  useEffect(() => {
    if (nextExerciseId) {
      router.prefetch(buildDetailUrl(nextExerciseId));
    }
  }, [nextExerciseId, router, buildDetailUrl]);

  const reloadImages = useCallback(async () => {
    const result = await refetch();
    const refreshed = result.data?.exerciseByIdForAdmin as unknown as AdminExercise | undefined;
    return refreshed?.images ?? [];
  }, [refetch]);

  /**
   * Stored document past the cache: the workspace compares it with the loaded one before a 3.3 save.
   * A one-off read, not `refetch`: a failed read must fail the save only, never put this page into its error state.
   */
  const fetchCurrentEnrichment = useCallback(async () => {
    const result = await apolloClient.query<ExerciseByIdForAdminResponse>({
      query: GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY,
      variables: { id },
      fetchPolicy: 'network-only',
    });
    const current = result.data?.exerciseByIdForAdmin as unknown as AdminExercise | null | undefined;
    if (!current) throw new Error('Nie udało się pobrać aktualnej wersji ćwiczenia.');
    return current.enrichmentData ?? null;
  }, [apolloClient, id]);

  if (!roleLoading && !canReviewExercises) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={FileText} title="Brak dostępu" description="Nie masz uprawnień do weryfikacji ćwiczeń." />
      </div>
    );
  }

  if (loading && !exercise) {
    return <VerificationWorkspaceSkeleton />;
  }

  // An error with the exercise on screen (a failed reload after a photo change) must not unmount the workspace:
  // its unsaved edits live only there.
  if (!exercise) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={FileText}
          title="Nie znaleziono"
          description={error ? `Błąd: ${error.message}` : 'Ćwiczenie nie istnieje.'}
          actionLabel="Wróć do listy"
          onAction={() => router.push(listUrl)}
        />
      </div>
    );
  }

  return (
    <VerificationWorkspace
      key={exercise.id}
      exercise={exercise}
      queuePosition={navigator?.positionInQueue ?? null}
      queueTotal={queueTotal}
      nextExerciseId={nextExerciseId}
      openReports={openReports}
      listUrl={listUrl}
      buildDetailUrl={buildDetailUrl}
      reloadImages={reloadImages}
      fetchCurrentEnrichment={fetchCurrentEnrichment}
      organizationId={currentOrganization?.organizationId ?? null}
    />
  );
}
