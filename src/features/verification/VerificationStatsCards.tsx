'use client';

import { segmentedSegmentVariants, segmentedTrackVariants } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrganizationVerificationStats, VerificationStats } from '@/graphql/types/adminExercise.types';

type FilterType = 'pending' | 'internal' | 'changes' | 'published' | 'archived' | 'reported' | 'verified';

interface VerificationStatsCardsProps {
  stats: VerificationStats | null;
  organizationStats?: OrganizationVerificationStats | null;
  isLoading?: boolean;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  reportedCount?: number;
  mode?: 'global' | 'organization';
}

interface StatusOption {
  filter: FilterType;
  label: string;
  value: number;
  testId: string;
}

/** Etykieta filtra = plakietka na karcie ćwiczenia, żeby weryfikator od razu je łączył. */
const INTERNAL_FIXES_LABEL = 'Czeka na poprawki';

function getOrganizationOptions(stats: OrganizationVerificationStats): StatusOption[] {
  return [
    { filter: 'pending', label: 'Oczekujące', value: stats.pendingOrgReview, testId: 'org-verification-stats-pending' },
    // Tylko kolejka wszystkich gabinetów zwraca ten licznik; właściciel gabinetu nie widzi poprawek wewnętrznych.
    ...(stats.internalFixes === undefined
      ? []
      : [
          {
            filter: 'internal' as const,
            label: INTERNAL_FIXES_LABEL,
            value: stats.internalFixes,
            testId: 'org-verification-stats-internal',
          },
        ]),
    {
      filter: 'changes',
      label: 'Do poprawy',
      value: stats.orgChangesRequested,
      testId: 'org-verification-stats-changes',
    },
    { filter: 'verified', label: 'Zweryfikowane', value: stats.orgVerified, testId: 'org-verification-stats-verified' },
    { filter: 'archived', label: 'Archiwum', value: stats.orgArchived, testId: 'org-verification-stats-archived' },
  ];
}

function getGlobalOptions(stats: VerificationStats, reportedCount: number): StatusOption[] {
  return [
    { filter: 'pending', label: 'Oczekujące', value: stats.pendingReview, testId: 'verification-stats-pending' },
    {
      filter: 'internal',
      label: INTERNAL_FIXES_LABEL,
      value: stats.internalFixes ?? 0,
      testId: 'verification-stats-internal',
    },
    { filter: 'changes', label: 'Do poprawy', value: stats.changesRequested, testId: 'verification-stats-changes' },
    { filter: 'published', label: 'Opublikowane', value: stats.published, testId: 'verification-stats-published' },
    { filter: 'reported', label: 'Zgłoszone', value: reportedCount, testId: 'verification-stats-reported' },
    { filter: 'archived', label: 'Wycofane', value: stats.archivedGlobal, testId: 'verification-stats-archived' },
  ];
}

/** Status filter of a verification queue: one segment per status with its count. */
export function VerificationStatsCards({
  stats,
  organizationStats = null,
  isLoading,
  activeFilter,
  onFilterChange,
  reportedCount = 0,
  mode = 'global',
}: VerificationStatsCardsProps) {
  const options =
    mode === 'organization'
      ? organizationStats && getOrganizationOptions(organizationStats)
      : stats && getGlobalOptions(stats, reportedCount);

  if (isLoading || !options) {
    return <Skeleton className="h-[34px] w-full max-w-[460px] rounded-[10px]" />;
  }

  return (
    <div role="radiogroup" aria-label="Status" className={segmentedTrackVariants({ className: 'self-start' })}>
      {options.map((option) => {
        const isActive = option.filter === activeFilter;
        return (
          <button
            key={option.filter}
            type="button"
            role="radio"
            aria-checked={isActive}
            data-testid={option.testId}
            onClick={() => onFilterChange(option.filter)}
            className={segmentedSegmentVariants({ active: isActive, className: 'inline-flex items-center gap-1.5' })}
          >
            {option.label}
            <span className="font-normal tabular-nums text-muted-foreground">{option.value}</span>
          </button>
        );
      })}
    </div>
  );
}
