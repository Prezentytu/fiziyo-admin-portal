'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VerificationStatsCards } from '@/features/verification/VerificationStatsCards';
import { VerificationTaskCard } from '@/features/verification/VerificationTaskCard';
import { VerificationSelectionToolbar } from '@/features/verification/VerificationSelectionToolbar';
import { VerificationArchiveDialog } from '@/features/verification/VerificationArchiveDialog';
import { VerificationPageHeader } from '@/features/verification/VerificationPageHeader';
import { VerificationQueueHero } from '@/features/verification/VerificationQueueHero';
import { useVerificationSelection } from '@/features/verification/utils/verificationSelection';
import {
  buildOrganizationVerificationDetailHref,
  buildOrganizationVerificationSearchParams,
  parseOrganizationVerificationFilter,
} from '@/features/verification/utils/orgVerificationPagination';
import {
  GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import { ARCHIVE_ORGANIZATION_EXERCISE_MUTATION } from '@/graphql/mutations/adminExercises.mutations';
import { formatBatchArchiveSummary, runBatchArchive } from '@/features/verification/utils/batchArchive';
import type {
  ArchiveExerciseVariables,
  ArchiveOrganizationExerciseResponse,
  GetOrganizationVerificationStatsResponse,
  VerificationQueuePage,
} from '@/graphql/types/adminExercise.types';
import { PageSheet } from '@/components/shared/page';

type OrgFilter = 'pending' | 'changes' | 'verified' | 'archived';

export default function OrganizationVerificationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { canManageOrganization, isLoading: roleLoading } = useRoleAccess();

  const organizationId = currentOrganization?.organizationId;
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [filter, setFilter] = useState<OrgFilter>(parseOrganizationVerificationFilter(searchParams.get('filter')));
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1') || 1);
  const [pageSize] = useState(20);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery<GetOrganizationVerificationStatsResponse>(GET_ORGANIZATION_VERIFICATION_STATS_QUERY, {
    variables: { organizationId: organizationId ?? '' },
    skip: !organizationId || !canManageOrganization,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: queueData,
    loading: queueLoading,
    refetch: refetchQueue,
  } = useQuery<{ organizationVerificationQueuePage: VerificationQueuePage }>(
    GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
    {
      variables: {
        organizationId: organizationId ?? '',
        filter,
        search: search.trim() || null,
        page,
        pageSize,
      },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: firstPendingData } = useQuery<{ organizationVerificationQueuePage: VerificationQueuePage }>(
    GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
    {
      variables: { organizationId: organizationId ?? '', filter: 'pending', search: null, page: 1, pageSize: 1 },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );
  const firstPendingId = firstPendingData?.organizationVerificationQueuePage.items[0]?.id;
  const startHref = firstPendingId
    ? buildOrganizationVerificationDetailHref(firstPendingId, {
        filter: 'pending',
        search: '',
        page: 1,
        pageSize,
        view: 'grid',
      })
    : null;

  const visibleExerciseIds = useMemo(
    () => queueData?.organizationVerificationQueuePage.items.map((exercise) => exercise.id) ?? [],
    [queueData]
  );
  const selection = useVerificationSelection(visibleExerciseIds);
  const [archiveOrganizationExercise] = useMutation<ArchiveOrganizationExerciseResponse, ArchiveExerciseVariables>(
    ARCHIVE_ORGANIZATION_EXERCISE_MUTATION
  );
  const [archiving, setArchiving] = useState(false);
  // Archiwizować da się tylko ćwiczenia OrgVerified (backend), więc zaznaczanie jest tylko w tej zakładce.
  const canArchive = filter === 'verified';

  const updateUrl = (nextFilter: OrgFilter, nextSearch: string, nextPage: number) => {
    const params = buildOrganizationVerificationSearchParams({
      filter: nextFilter,
      search: nextSearch,
      page: nextPage,
      pageSize,
      view: 'grid',
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleArchiveSelected = async () => {
    const selectedIds = selection.selectedIds;
    if (!organizationId || selectedIds.length === 0) {
      return;
    }

    setArchiving(true);
    try {
      const result = await runBatchArchive(selectedIds, async (exerciseId) => {
        const response = await archiveOrganizationExercise({ variables: { exerciseId, reason: null } });
        if (response.error) {
          throw response.error;
        }
        return response.data?.archiveOrganizationExercise ?? null;
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

  const detailQueryState = useMemo(
    () => ({
      filter,
      search,
      page,
      pageSize,
      view: 'grid' as const,
    }),
    [filter, search, page, pageSize]
  );

  if (!roleLoading && !canManageOrganization) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Tylko Owner/Admin może zarządzać weryfikacją organizacyjną."
      />
    );
  }

  return (
    <PageSheet contentClassName="gap-6">
      <VerificationPageHeader />

      <VerificationQueueHero
        pendingCount={statsData?.organizationVerificationStats.pendingOrgReview ?? null}
        startHref={startHref}
        testIdPrefix="org-verification"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <VerificationStatsCards
          mode="organization"
          stats={null}
          organizationStats={statsData?.organizationVerificationStats ?? null}
          isLoading={statsLoading}
          activeFilter={filter}
          onFilterChange={(nextFilter) => {
            const normalizedFilter = nextFilter === 'verified' ? 'verified' : (nextFilter as OrgFilter);
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
            data-testid="org-verification-search-input"
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
        disabled={!organizationId || !canArchive || queueLoading}
        isArchiving={archiving}
      />

      {queueLoading ? (
        <div className="text-sm text-muted-foreground">Ładowanie kolejki...</div>
      ) : (queueData?.organizationVerificationQueuePage.items.length ?? 0) === 0 ? (
        <EmptyState icon={ShieldCheck} title="Brak ćwiczeń" description="Wybrany filtr nie zawiera pozycji." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queueData?.organizationVerificationQueuePage.items.map((exercise) => (
            <VerificationTaskCard
              key={exercise.id}
              exercise={exercise}
              track="organization"
              showStatus={false}
              selectable={canArchive}
              selected={selection.isSelected(exercise.id)}
              onSelectionChange={() => selection.toggle(exercise.id)}
              detailHref={buildOrganizationVerificationDetailHref(exercise.id, detailQueryState)}
            />
          ))}
        </div>
      )}

      {(queueData?.organizationVerificationQueuePage.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface p-3">
          <p className="text-sm text-muted-foreground">
            Strona {queueData?.organizationVerificationQueuePage.page} z{' '}
            {Math.max(queueData?.organizationVerificationQueuePage.totalPages ?? 1, 1)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              data-testid="org-verification-pagination-prev"
              variant="outline"
              size="sm"
              disabled={!queueData?.organizationVerificationQueuePage.hasPreviousPage}
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
              data-testid="org-verification-pagination-next"
              variant="outline"
              size="sm"
              disabled={!queueData?.organizationVerificationQueuePage.hasNextPage}
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
        scopeLabel="weryfikacji organizacyjnej"
        isLoading={archiving}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={handleArchiveSelected}
      />
    </PageSheet>
  );
}
