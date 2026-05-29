'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { Search, ShieldCheck } from 'lucide-react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VerificationStatsCards } from '@/features/verification/VerificationStatsCards';
import { VerificationTaskCard } from '@/features/verification/VerificationTaskCard';
import {
  buildOrganizationVerificationDetailHref,
  buildOrganizationVerificationSearchParams,
  parseOrganizationVerificationFilter,
} from '@/features/verification/utils/orgVerificationPagination';
import {
  GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import type {
  GetOrganizationVerificationStatsResponse,
  VerificationQueuePage,
} from '@/graphql/types/adminExercise.types';

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

  const { data: statsData, loading: statsLoading } = useQuery<GetOrganizationVerificationStatsResponse>(
    GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
    {
      variables: { organizationId: organizationId ?? '' },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: queueData, loading: queueLoading } = useQuery<{ organizationVerificationQueuePage: VerificationQueuePage }>(
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weryfikacja organizacji</h1>
          <p className="text-sm text-muted-foreground">Lokalna kolejka weryfikacji ćwiczeń dla organizacji.</p>
        </div>
        <Link href="/organization">
          <Button variant="outline">Wróć do organizacji</Button>
        </Link>
      </div>

      <VerificationStatsCards
        mode="organization"
        stats={null}
        organizationStats={statsData?.organizationVerificationStats ?? null}
        isLoading={statsLoading}
        activeFilter={filter}
        onFilterChange={(nextFilter) => {
          const normalizedFilter = nextFilter === 'verified' ? 'verified' : (nextFilter as OrgFilter);
          setFilter(normalizedFilter);
          setPage(1);
          updateUrl(normalizedFilter, search, 1);
        }}
      />

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => {
            const next = event.target.value;
            setSearch(next);
            setPage(1);
            updateUrl(filter, next, 1);
          }}
          placeholder="Szukaj ćwiczenia..."
          className="pl-9"
          data-testid="org-verification-search-input"
        />
      </div>

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
              variant="outline"
              size="sm"
              disabled={!queueData?.organizationVerificationQueuePage.hasPreviousPage}
              onClick={() => {
                const nextPage = Math.max(page - 1, 1);
                setPage(nextPage);
                updateUrl(filter, search, nextPage);
              }}
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!queueData?.organizationVerificationQueuePage.hasNextPage}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                updateUrl(filter, search, nextPage);
              }}
            >
              Następna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
