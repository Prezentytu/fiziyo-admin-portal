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
import { VerificationTaskCard } from '@/features/verification/VerificationTaskCard';
import { VerificationSelectionToolbar } from '@/features/verification/VerificationSelectionToolbar';
import { VerificationArchiveDialog } from '@/features/verification/VerificationArchiveDialog';
import { VerificationPageHeader } from '@/features/verification/VerificationPageHeader';
import { VerificationQueueHero } from '@/features/verification/VerificationQueueHero';
import { useVerificationSelection } from '@/features/verification/utils/verificationSelection';
import {
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
  GetCrossOrgVerificationStatsResponse,
} from '@/graphql/types/adminExercise.types';
import { PageSheet } from '@/components/shared/page';

type CrossOrgFilter = 'pending' | 'changes' | 'verified' | 'archived';

function parseFilter(value: string | null): CrossOrgFilter {
  if (value === 'changes' || value === 'verified' || value === 'archived') {
    return value;
  }
  return 'pending';
}

export default function CrossOrgVerificationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSiteSuperAdmin, isLoading: roleLoading } = useSystemRole();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [filter, setFilter] = useState<CrossOrgFilter>(parseFilter(searchParams.get('filter')));
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1') || 1);
  const [pageSize] = useState(20);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery<GetCrossOrgVerificationStatsResponse>(GET_CROSS_ORG_VERIFICATION_STATS_QUERY, {
    skip: !isSiteSuperAdmin,
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
    skipPollAttempt: () => document.hidden,
  });

  const {
    data: queueData,
    loading: queueLoading,
    refetch: refetchQueuePage,
  } = useQuery<{ crossOrgVerificationQueuePage: CrossOrgVerificationQueuePage }>(
    GET_CROSS_ORG_VERIFICATION_QUEUE_PAGE_QUERY,
    {
      variables: {
        filter,
        search: search.trim() || null,
        page,
        pageSize,
      },
      skip: !isSiteSuperAdmin,
      fetchPolicy: 'cache-and-network',
      pollInterval: 30_000,
      skipPollAttempt: () => document.hidden,
    }
  );

  const { data: firstPendingData, refetch: refetchFirstPending } = useQuery<{
    crossOrgVerificationQueuePage: CrossOrgVerificationQueuePage;
  }>(GET_CROSS_ORG_VERIFICATION_QUEUE_PAGE_QUERY, {
    variables: { filter: 'pending', search: null, page: 1, pageSize: 1 },
    skip: !isSiteSuperAdmin,
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
    skipPollAttempt: () => document.hidden,
  });
  const refetchQueue = () => Promise.all([refetchQueuePage(), refetchFirstPending()]);
  const firstPendingId = firstPendingData?.crossOrgVerificationQueuePage.items[0]?.exercise.id;
  const startHref = firstPendingId
    ? `/verification/organizations/${firstPendingId}?filter=pending&page=1&pageSize=${pageSize}`
    : null;

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
    },
  });

  const updateUrl = (nextFilter: CrossOrgFilter, nextSearch: string, nextPage: number) => {
    const params = new URLSearchParams();
    params.set('filter', nextFilter);
    if (nextSearch.trim()) {
      params.set('search', nextSearch.trim());
    }
    params.set('page', String(nextPage));
    params.set('pageSize', String(pageSize));
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
    return params.toString();
  }, [filter, search, page, pageSize]);

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
      await Promise.all([refetchStats(), refetchQueue()]);
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
      <VerificationPageHeader scopeKey="cross-org" />

      <VerificationQueueHero
        pendingCount={statsData?.crossOrgVerificationStats.pendingOrgReview ?? null}
        startHref={startHref}
        testIdPrefix="cross-org-verification"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <VerificationStatsCards
          mode="organization"
          stats={null}
          organizationStats={statsData?.crossOrgVerificationStats ?? null}
          isLoading={statsLoading}
          activeFilter={filter}
          onFilterChange={(nextFilter) => {
            const normalizedFilter = nextFilter === 'verified' ? 'verified' : (nextFilter as CrossOrgFilter);
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
            <div key={queueItem.exercise.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {queueItem.organizationName}
                </Badge>
              </div>
              <VerificationTaskCard
                exercise={queueItem.exercise}
                track="organization"
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
