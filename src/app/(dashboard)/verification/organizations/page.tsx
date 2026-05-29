'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useSubscription } from '@apollo/client/react';
import { Search, ShieldCheck } from 'lucide-react';

import { useSystemRole } from '@/hooks/useSystemRole';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerificationStatsCards } from '@/features/verification/VerificationStatsCards';
import { VerificationTaskCard } from '@/features/verification/VerificationTaskCard';
import {
  GET_CROSS_ORG_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_CROSS_ORG_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/crossOrgVerification.queries';
import { ON_EXERCISE_SUBMITTED_FOR_GLOBAL_REVIEW } from '@/graphql/subscriptions';
import type {
  CrossOrgVerificationQueuePage,
  GetOrganizationVerificationStatsResponse,
} from '@/graphql/types/adminExercise.types';

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

  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery<GetOrganizationVerificationStatsResponse>(
    GET_CROSS_ORG_VERIFICATION_STATS_QUERY,
    {
      skip: !isSiteSuperAdmin,
      fetchPolicy: 'cache-and-network',
      pollInterval: 30_000,
    }
  );

  const { data: queueData, loading: queueLoading, refetch: refetchQueue } = useQuery<{ crossOrgVerificationQueuePage: CrossOrgVerificationQueuePage }>(
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
    }
  );

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

  if (!roleLoading && !isSiteSuperAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Tylko SiteSuperAdmin ma dostęp do cross-organizacyjnej weryfikacji."
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="cross-org-verification-page">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weryfikacja Organizacji</h1>
          <p className="text-sm text-muted-foreground">Kolejka zgłoszeń organizacyjnych ze wszystkich organizacji.</p>
        </div>
        <Link href="/verification">
          <Button variant="outline">Wróć do centrum</Button>
        </Link>
      </div>

      <VerificationStatsCards
        mode="organization"
        stats={null}
        organizationStats={statsData?.organizationVerificationStats ?? null}
        isLoading={statsLoading}
        activeFilter={filter}
        onFilterChange={(nextFilter) => {
          const normalizedFilter = nextFilter === 'verified' ? 'verified' : (nextFilter as CrossOrgFilter);
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
          data-testid="cross-org-verification-search-input"
        />
      </div>

      {queueLoading ? (
        <div className="text-sm text-muted-foreground">Ładowanie kolejki...</div>
      ) : (queueData?.crossOrgVerificationQueuePage.items.length ?? 0) === 0 ? (
        <EmptyState icon={ShieldCheck} title="Brak ćwiczeń" description="Wybrany filtr nie zawiera pozycji." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queueData?.crossOrgVerificationQueuePage.items.map((queueItem) => (
            <div key={queueItem.exercise.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {queueItem.organizationName}
                </Badge>
              </div>
              <VerificationTaskCard
                exercise={queueItem.exercise}
                detailHref={`/verification/organizations/${queueItem.exercise.id}?${detailQueryString}`}
              />
            </div>
          ))}
        </div>
      )}

      {(queueData?.crossOrgVerificationQueuePage.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface p-3">
          <p className="text-sm text-muted-foreground">
            Strona {queueData?.crossOrgVerificationQueuePage.page} z {Math.max(queueData?.crossOrgVerificationQueuePage.totalPages ?? 1, 1)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!queueData?.crossOrgVerificationQueuePage.hasPreviousPage}
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
              disabled={!queueData?.crossOrgVerificationQueuePage.hasNextPage}
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
