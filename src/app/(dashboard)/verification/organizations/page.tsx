'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useSystemRole } from '@/hooks/useSystemRole';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerificationStatsCards } from '@/features/verification/VerificationStatsCards';
import { VerificationQueueOrderingControls } from '@/features/verification/VerificationQueueOrderingControls';
import {
  appendQueueOrderingParams,
  parseQueueOrdering,
  queueDateLabel,
  queueOrderingVariables,
  type VerificationQueueOrdering,
} from '@/features/verification/utils/queueOrdering';
import { VerificationTaskCard } from '@/features/verification/VerificationTaskCard';
import { VerificationSelectionToolbar } from '@/features/verification/VerificationSelectionToolbar';
import { VerificationArchiveDialog } from '@/features/verification/VerificationArchiveDialog';
import { VerificationPageHeader } from '@/features/verification/VerificationPageHeader';
import { useVerificationSelection } from '@/features/verification/utils/verificationSelection';
import { CrossOrgOrganizationFilter } from '@/features/verification/CrossOrgOrganizationFilter';
import {
  GET_CROSS_ORG_VERIFICATION_ORGANIZATIONS_QUERY,
  GET_CROSS_ORG_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_CROSS_ORG_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/crossOrgVerification.queries';
import { ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION } from '@/graphql/mutations/crossOrgVerification.mutations';
import { formatBatchArchiveSummary, runBatchArchive } from '@/features/verification/utils/batchArchive';
import { ON_EXERCISE_SUBMITTED_FOR_GLOBAL_REVIEW } from '@/graphql/subscriptions';
import type {
  ArchiveExerciseVariables,
  ArchiveOrganizationExerciseAsAdminResponse,
  CrossOrgVerificationQueuePage,
  GetCrossOrgVerificationOrganizationsResponse,
  GetCrossOrgVerificationStatsResponse,
} from '@/graphql/types/adminExercise.types';
import { PageSheet } from '@/components/shared/page';
import {
  CROSS_ORG_ORGANIZATIONS_PARAM,
  appendCrossOrgOrganizationIds,
  parseCrossOrgOrganizationIds,
  parseCrossOrgVerificationFilter,
  type CrossOrgVerificationFilter,
} from '@/features/verification/utils/orgVerificationPagination';

export default function CrossOrgVerificationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSiteSuperAdmin, isLoading: roleLoading } = useSystemRole();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [filter, setFilter] = useState<CrossOrgVerificationFilter>(
    parseCrossOrgVerificationFilter(searchParams.get('filter'))
  );
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1') || 1);
  const [pageSize] = useState(20);
  const [ordering, setOrdering] = useState<VerificationQueueOrdering>(() => parseQueueOrdering(searchParams));
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [organizationIds, setOrganizationIds] = useState<string[]>(() =>
    parseCrossOrgOrganizationIds(searchParams.get(CROSS_ORG_ORGANIZATIONS_PARAM))
  );
  // Pusta lista = wszystkie organizacje; backend traktuje null tak samo.
  const organizationIdsVariable = organizationIds.length > 0 ? organizationIds : null;

  const {
    data: organizationsData,
    loading: organizationsLoading,
    refetch: refetchOrganizations,
  } = useQuery<GetCrossOrgVerificationOrganizationsResponse>(GET_CROSS_ORG_VERIFICATION_ORGANIZATIONS_QUERY, {
    skip: !isSiteSuperAdmin,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery<GetCrossOrgVerificationStatsResponse>(GET_CROSS_ORG_VERIFICATION_STATS_QUERY, {
    variables: { organizationIds: organizationIdsVariable },
    skip: !isSiteSuperAdmin,
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
    skipPollAttempt: () => document.hidden,
  });

  const {
    data: queueData,
    loading: queueLoading,
    refetch: refetchQueue,
  } = useQuery<{ crossOrgVerificationQueuePage: CrossOrgVerificationQueuePage }>(
    GET_CROSS_ORG_VERIFICATION_QUEUE_PAGE_QUERY,
    {
      variables: {
        filter,
        search: search.trim() || null,
        page,
        pageSize,
        ...queueOrderingVariables(ordering),
        organizationIds: organizationIdsVariable,
      },
      skip: !isSiteSuperAdmin,
      fetchPolicy: 'cache-and-network',
      pollInterval: 30_000,
      skipPollAttempt: () => document.hidden,
    }
  );

  const visibleQueueItems = useMemo(() => queueData?.crossOrgVerificationQueuePage.items ?? [], [queueData]);
  const visibleExerciseIds = useMemo(
    () => visibleQueueItems.map((queueItem) => queueItem.exercise.id),
    [visibleQueueItems]
  );
  const selection = useVerificationSelection(visibleExerciseIds);
  const [archiveOrganizationExerciseAsAdmin] = useMutation<
    ArchiveOrganizationExerciseAsAdminResponse,
    ArchiveExerciseVariables
  >(ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION);
  const [archiving, setArchiving] = useState(false);
  // Archiwizować da się tylko ćwiczenia OrgVerified (backend), więc zaznaczanie jest tylko w tej zakładce.
  const canArchive = filter === 'verified';

  useSubscription<{ onExerciseSubmittedForGlobalReview: string }>(ON_EXERCISE_SUBMITTED_FOR_GLOBAL_REVIEW, {
    skip: !isSiteSuperAdmin,
    onData: () => {
      refetchStats();
      refetchQueue();
      refetchOrganizations();
    },
  });

  const updateUrl = (
    nextFilter: CrossOrgVerificationFilter,
    nextSearch: string,
    nextPage: number,
    nextOrdering: VerificationQueueOrdering = ordering,
    nextOrganizationIds: readonly string[] = organizationIds
  ) => {
    const params = new URLSearchParams();
    params.set('filter', nextFilter);
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }
    params.set('page', String(nextPage));
    params.set('pageSize', String(pageSize));
    appendQueueOrderingParams(params, nextOrdering);
    appendCrossOrgOrganizationIds(params, nextOrganizationIds);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const detailQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('filter', filter);
    if (search.trim()) {
      params.set('search', search.trim());
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    appendQueueOrderingParams(params, ordering);
    return appendCrossOrgOrganizationIds(params, organizationIds).toString();
  }, [filter, search, page, pageSize, ordering, organizationIds]);

  const handleArchiveSelected = async () => {
    const selectedIds = selection.selectedIds;
    if (selectedIds.length === 0) {
      return;
    }

    setArchiving(true);
    try {
      // Backend wyznacza organizację z samego ćwiczenia, więc wystarczy exerciseId.
      const result = await runBatchArchive(selectedIds, async (exerciseId) => {
        const response = await archiveOrganizationExerciseAsAdmin({ variables: { exerciseId, reason: null } });
        if (response.error) {
          throw response.error;
        }
        return response.data?.archiveOrganizationExerciseAsAdmin ?? null;
      });

      const failedIdSet = new Set(result.failedIds);
      selection.remove(selectedIds.filter((exerciseId) => !failedIdSet.has(exerciseId)));
      setArchiveDialogOpen(false);
      const summary = formatBatchArchiveSummary(result);
      toast[summary.kind](summary.message);
      await Promise.all([refetchStats(), refetchQueue(), refetchOrganizations()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się odświeżyć listy po archiwizacji.');
    } finally {
      setArchiving(false);
    }
  };

  if (!roleLoading && !isSiteSuperAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Ten widok jest dostępny tylko dla zespołu FiziYo."
      />
    );
  }

  return (
    <PageSheet contentClassName="gap-6" data-testid="cross-org-verification-page">
      <VerificationPageHeader />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <VerificationStatsCards
          mode="organization"
          stats={null}
          organizationStats={statsData?.crossOrgVerificationStats ?? null}
          isLoading={statsLoading}
          activeFilter={filter}
          onFilterChange={(nextFilter) => {
            const normalizedFilter = parseCrossOrgVerificationFilter(nextFilter);
            selection.clear();
            setFilter(normalizedFilter);
            setPage(1);
            updateUrl(normalizedFilter, search, 1);
          }}
        />

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Szukaj ćwiczenia"
            data-testid="cross-org-verification-search-input"
            value={search}
            onChange={(event) => {
              const next = event.target.value;
              selection.clear();
              setSearch(next);
              setPage(1);
              updateUrl(filter, next, 1);
            }}
            placeholder="Szukaj ćwiczenia..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CrossOrgOrganizationFilter
          organizations={organizationsData?.crossOrgVerificationOrganizations ?? []}
          selectedIds={organizationIds}
          isLoading={organizationsLoading}
          onChange={(nextOrganizationIds) => {
            selection.clear();
            setOrganizationIds(nextOrganizationIds);
            setPage(1);
            updateUrl(filter, search, 1, ordering, nextOrganizationIds);
          }}
        />
        <VerificationQueueOrderingControls
          ordering={ordering}
          onChange={(nextOrdering) => {
            selection.clear();
            setOrdering(nextOrdering);
            setPage(1);
            updateUrl(filter, search, 1, nextOrdering);
          }}
          dateLabel={queueDateLabel('organization', filter)}
          testIdPrefix="cross-org-verification"
        />
      </div>

      <VerificationSelectionToolbar
        selectedCount={selection.selectedCount}
        visibleCount={visibleExerciseIds.length}
        allVisibleSelected={selection.allVisibleSelected}
        someVisibleSelected={selection.someVisibleSelected}
        onToggleVisible={selection.toggleVisible}
        onClear={selection.clear}
        onArchive={() => setArchiveDialogOpen(true)}
        disabled={!canArchive || queueLoading}
        isArchiving={archiving}
      />

      {queueLoading ? (
        <div className="text-sm text-muted-foreground">Ładowanie kolejki...</div>
      ) : (queueData?.crossOrgVerificationQueuePage.items.length ?? 0) === 0 ? (
        <EmptyState icon={ShieldCheck} title="Brak ćwiczeń" description="Wybrany filtr nie zawiera pozycji." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleQueueItems.map((queueItem) => (
            <div key={queueItem.exercise.id} className="grid grid-rows-[auto_1fr] gap-2">
              <div className="flex items-center justify-between px-1">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {queueItem.organizationName}
                </Badge>
              </div>
              <VerificationTaskCard
                exercise={queueItem.exercise}
                track="organization"
                showStatus={false}
                selectable={canArchive}
                selected={selection.isSelected(queueItem.exercise.id)}
                onSelectionChange={() => selection.toggle(queueItem.exercise.id)}
                detailHref={`/verification/organizations/${queueItem.exercise.id}?${detailQueryString}`}
              />
            </div>
          ))}
        </div>
      )}

      {(queueData?.crossOrgVerificationQueuePage.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface p-3">
          <p className="text-sm text-muted-foreground">
            Strona {queueData?.crossOrgVerificationQueuePage.page} z{' '}
            {Math.max(queueData?.crossOrgVerificationQueuePage.totalPages ?? 1, 1)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              data-testid="cross-org-verification-pagination-prev"
              variant="outline"
              size="sm"
              disabled={!queueData?.crossOrgVerificationQueuePage.hasPreviousPage}
              onClick={() => {
                const nextPage = Math.max(page - 1, 1);
                selection.clear();
                setPage(nextPage);
                updateUrl(filter, search, nextPage);
              }}
            >
              Poprzednia
            </Button>
            <Button
              data-testid="cross-org-verification-pagination-next"
              variant="outline"
              size="sm"
              disabled={!queueData?.crossOrgVerificationQueuePage.hasNextPage}
              onClick={() => {
                const nextPage = page + 1;
                selection.clear();
                setPage(nextPage);
                updateUrl(filter, search, nextPage);
              }}
            >
              Następna
            </Button>
          </div>
        </div>
      )}

      <VerificationArchiveDialog
        open={archiveDialogOpen}
        count={selection.selectedCount}
        scopeLabel="kolejkach organizacji klientów"
        isLoading={archiving}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={handleArchiveSelected}
      />
    </PageSheet>
  );
}
