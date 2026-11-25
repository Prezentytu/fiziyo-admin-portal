'use client';

import { useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Dumbbell, FolderKanban, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader, PageSheet } from '@/components/shared/page';
import { useOrganization } from '@/contexts/OrganizationContext';

import { GET_TRASHED_EXERCISES_QUERY, GET_TRASHED_EXERCISE_SETS_QUERY } from '@/graphql/queries/trash.queries';
import {
  PURGE_EXERCISE_MUTATION,
  PURGE_EXERCISE_SET_MUTATION,
  RESTORE_EXERCISE_MUTATION,
  RESTORE_EXERCISE_SET_MUTATION,
} from '@/graphql/mutations/trash.mutations';
import { TRASH_RETENTION_DAYS, purgeLabel } from '@/features/trash/utils/trashRetention';
import type {
  GetTrashedExerciseSetsResponse,
  GetTrashedExercisesResponse,
  PurgeExerciseResponse,
  PurgeExerciseSetResponse,
  RestoreExerciseResponse,
  RestoreExerciseSetResponse,
} from '@/graphql/types';

type TrashTab = 'zestawy' | 'cwiczenia';

interface TrashRow {
  id: string;
  name: string;
  details: string;
  purgeAt: string;
}

interface PendingPurge {
  tab: TrashTab;
  row: TrashRow;
}

const TAB_OPTIONS = [
  { value: 'zestawy' as const, label: 'Zestawy' },
  { value: 'cwiczenia' as const, label: 'Ćwiczenia' },
];

function parseTab(raw: string | null): TrashTab {
  return raw === 'cwiczenia' ? 'cwiczenia' : 'zestawy';
}

function deletedDetails(deletedAt: string, deletedByName: string | null, prefix?: string): string {
  const date = new Date(deletedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  const who = deletedByName ? `, ${deletedByName}` : '';
  return `${prefix ? `${prefix} · ` : ''}Usunięto ${date}${who}`;
}

function exerciseCountLabel(count: number): string {
  if (count === 1) return '1 ćwiczenie';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} ćwiczenia`;
  return `${count} ćwiczeń`;
}

export default function TrashPage() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;

  if (!organizationId) {
    return null;
  }

  // Trash queries read the organization from the token, so switching organization needs a fresh mount.
  return <TrashContent key={organizationId} />;
}

function TrashContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const apolloClient = useApolloClient();
  const tab = parseTab(searchParams.get('typ'));
  const [pendingPurge, setPendingPurge] = useState<PendingPurge | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const setsQuery = useQuery<GetTrashedExerciseSetsResponse>(GET_TRASHED_EXERCISE_SETS_QUERY, {
    fetchPolicy: 'network-only',
  });
  const exercisesQuery = useQuery<GetTrashedExercisesResponse>(GET_TRASHED_EXERCISES_QUERY, {
    fetchPolicy: 'network-only',
  });

  const [restoreSet] = useMutation<RestoreExerciseSetResponse>(RESTORE_EXERCISE_SET_MUTATION);
  const [purgeSet, { loading: purgingSet }] = useMutation<PurgeExerciseSetResponse>(PURGE_EXERCISE_SET_MUTATION);
  const [restoreExercise] = useMutation<RestoreExerciseResponse>(RESTORE_EXERCISE_MUTATION);
  const [purgeExercise, { loading: purgingExercise }] = useMutation<PurgeExerciseResponse>(PURGE_EXERCISE_MUTATION);

  const setRows: TrashRow[] = (setsQuery.data?.trashedExerciseSets ?? []).map((set) => ({
    id: set.id,
    name: set.name,
    details: deletedDetails(
      set.deletedAt,
      set.deletedByName,
      `${set.kind === 'PATIENT_PLAN' ? 'Plan pacjenta' : 'Szablon'}, ${exerciseCountLabel(set.exerciseCount)}`
    ),
    purgeAt: set.purgeAt,
  }));
  const exerciseRows: TrashRow[] = (exercisesQuery.data?.trashedExercises ?? []).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    details: deletedDetails(exercise.deletedAt, exercise.deletedByName),
    purgeAt: exercise.purgeAt,
  }));

  const activeQuery = tab === 'zestawy' ? setsQuery : exercisesQuery;
  const rows = tab === 'zestawy' ? setRows : exerciseRows;

  const handleTabChange = (nextTab: TrashTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('typ', nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleRestore = async (row: TrashRow) => {
    setBusyId(row.id);
    try {
      if (tab === 'zestawy') {
        await restoreSet({ variables: { exerciseSetId: row.id } });
        apolloClient.cache.evict({ id: 'ROOT_QUERY', fieldName: 'exerciseSets' });
        await setsQuery.refetch();
        toast.success(`Przywrócono zestaw „${row.name}”`, {
          action: { label: 'Otwórz', onClick: () => router.push(`/exercise-sets/${row.id}`) },
        });
      } else {
        await restoreExercise({ variables: { exerciseId: row.id } });
        await exercisesQuery.refetch();
        toast.success(`Przywrócono ćwiczenie „${row.name}”. Do zestawów dodaj je ponownie.`, {
          action: { label: 'Otwórz', onClick: () => router.push(`/exercises/${row.id}`) },
        });
      }
    } catch {
      toast.error('Nie udało się przywrócić. Spróbuj ponownie.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePurge = async () => {
    if (!pendingPurge) return;
    const { row } = pendingPurge;
    try {
      if (pendingPurge.tab === 'zestawy') {
        await purgeSet({ variables: { exerciseSetId: row.id } });
        await setsQuery.refetch();
      } else {
        await purgeExercise({ variables: { exerciseId: row.id } });
        await exercisesQuery.refetch();
      }
      toast.success(`Usunięto na zawsze „${row.name}”`);
      setPendingPurge(null);
    } catch {
      toast.error('Nie udało się usunąć. Spróbuj ponownie.');
    }
  };

  const emptyIcon = tab === 'zestawy' ? FolderKanban : Dumbbell;
  const emptyTitle = tab === 'zestawy' ? 'Brak usuniętych zestawów' : 'Brak usuniętych ćwiczeń';

  return (
    <PageSheet data-testid="trash-page">
      <PageHeader
        title="Kosz"
        titleTestId="trash-page-title"
        subtitle={`Usunięte zestawy i ćwiczenia czekają tu ${TRASH_RETENTION_DAYS} dni, potem znikają na zawsze.`}
        actions={
          <SegmentedControl
            value={tab}
            options={TAB_OPTIONS}
            onChange={handleTabChange}
            label="Rodzaj"
            testId="trash-tab"
          />
        }
      />

      {activeQuery.loading && !activeQuery.data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-[68px] w-full rounded-card" />
          ))}
        </div>
      ) : activeQuery.error ? (
        <EmptyState
          icon={Trash2}
          title="Nie udało się wczytać kosza"
          actionLabel="Spróbuj ponownie"
          onAction={() => void activeQuery.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description="To, co usuniesz, trafi tutaj i przez 30 dni da się to przywrócić."
        />
      ) : (
        <ul className="flex flex-col gap-2" data-testid={`trash-list-${tab}`}>
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface-card px-4 py-3"
              data-testid={`trash-row-${row.id}`}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold text-foreground">{row.name}</span>
                <span className="text-[13px] text-label-secondary">
                  {row.details} · {purgeLabel(row.purgeAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRestore(row)}
                  disabled={busyId === row.id}
                  data-testid={`trash-restore-${row.id}-btn`}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Przywróć
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingPurge({ tab, row })}
                  disabled={busyId === row.id}
                  data-testid={`trash-purge-${row.id}-btn`}
                >
                  Usuń na zawsze
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingPurge}
        onOpenChange={(open) => !open && setPendingPurge(null)}
        title="Usunąć na zawsze?"
        description={`„${pendingPurge?.row.name ?? ''}” zniknie bez możliwości przywrócenia.`}
        confirmText="Usuń na zawsze"
        variant="destructive"
        onConfirm={() => void handlePurge()}
        isLoading={purgingSet || purgingExercise}
      />
    </PageSheet>
  );
}
