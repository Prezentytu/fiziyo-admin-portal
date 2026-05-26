'use client';

import { Clock, AlertTriangle, FileCheck, Archive, Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { OrganizationVerificationStats, VerificationStats } from '@/graphql/types/adminExercise.types';

type FilterType = 'pending' | 'changes' | 'published' | 'archived' | 'reported' | 'verified';

interface VerificationStatsCardsProps {
  stats: VerificationStats | null;
  organizationStats?: OrganizationVerificationStats | null;
  isLoading?: boolean;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  reportedCount?: number;
  mode?: 'global' | 'organization';
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  activeBgColor: string;
  activeBorderColor: string;
  isActive: boolean;
  onClick: () => void;
  testId: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  activeBgColor,
  activeBorderColor,
  isActive,
  onClick,
  testId,
}: StatCardProps) {
  return (
    <Card
      data-testid={testId}
      className={cn(
        'relative overflow-hidden transition-all duration-300 cursor-pointer',
        isActive
          ? `${activeBgColor} ${activeBorderColor} shadow-lg`
          : 'border-border/60 bg-card opacity-70 hover:opacity-100 hover:border-border hover:shadow-md'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bgColor)}>
            <Icon className={cn('h-5 w-5', color)} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VerificationStatsCards({
  stats,
  organizationStats = null,
  isLoading,
  activeFilter,
  onFilterChange,
  reportedCount = 0,
  mode = 'global',
}: VerificationStatsCardsProps) {
  if (isLoading || (mode === 'global' ? !stats : !organizationStats)) {
    return (
      <div className={cn('grid gap-3', mode === 'global' ? 'grid-cols-5' : 'grid-cols-4')}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        {mode === 'global' && <StatCardSkeleton />}
      </div>
    );
  }

  if (mode === 'organization' && organizationStats) {
    return (
      <div className="grid gap-3 grid-cols-4">
        <StatCard
          testId="org-verification-stats-pending"
          label="Oczekujące"
          value={organizationStats.pendingOrgReview}
          icon={Clock}
          color="text-amber-500"
          bgColor="bg-amber-500/20"
          activeBgColor="bg-amber-500/10"
          activeBorderColor="border-amber-500/40"
          isActive={activeFilter === 'pending'}
          onClick={() => onFilterChange('pending')}
        />
        <StatCard
          testId="org-verification-stats-changes"
          label="Do poprawy"
          value={organizationStats.orgChangesRequested}
          icon={AlertTriangle}
          color="text-orange-500"
          bgColor="bg-orange-500/20"
          activeBgColor="bg-orange-500/10"
          activeBorderColor="border-orange-500/40"
          isActive={activeFilter === 'changes'}
          onClick={() => onFilterChange('changes')}
        />
        <StatCard
          testId="org-verification-stats-verified"
          label="Zweryfikowane"
          value={organizationStats.orgVerified}
          icon={FileCheck}
          color="text-primary"
          bgColor="bg-primary/20"
          activeBgColor="bg-primary/10"
          activeBorderColor="border-primary/40"
          isActive={activeFilter === 'verified'}
          onClick={() => onFilterChange('verified')}
        />
        <StatCard
          testId="org-verification-stats-archived"
          label="Archiwum"
          value={organizationStats.orgArchived}
          icon={Archive}
          color="text-muted-foreground"
          bgColor="bg-muted"
          activeBgColor="bg-muted/70"
          activeBorderColor="border-border"
          isActive={activeFilter === 'archived'}
          onClick={() => onFilterChange('archived')}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-5">
      <StatCard
        testId="verification-stats-pending"
        label="Oczekujące"
        value={stats.pendingReview}
        icon={Clock}
        color="text-amber-500"
        bgColor="bg-amber-500/20"
        activeBgColor="bg-amber-500/10"
        activeBorderColor="border-amber-500/40"
        isActive={activeFilter === 'pending'}
        onClick={() => onFilterChange('pending')}
      />
      <StatCard
        testId="verification-stats-changes"
        label="Do poprawy"
        value={stats.changesRequested}
        icon={AlertTriangle}
        color="text-orange-500"
        bgColor="bg-orange-500/20"
        activeBgColor="bg-orange-500/10"
        activeBorderColor="border-orange-500/40"
        isActive={activeFilter === 'changes'}
        onClick={() => onFilterChange('changes')}
      />
      <StatCard
        testId="verification-stats-published"
        label="Opublikowane"
        value={stats.published}
        icon={FileCheck}
        color="text-primary"
        bgColor="bg-primary/20"
        activeBgColor="bg-primary/10"
        activeBorderColor="border-primary/40"
        isActive={activeFilter === 'published'}
        onClick={() => onFilterChange('published')}
      />
      <StatCard
        testId="verification-stats-reported"
        label="Zgłoszone"
        value={reportedCount}
        icon={Flag}
        color="text-amber-500"
        bgColor="bg-amber-500/20"
        activeBgColor="bg-amber-500/10"
        activeBorderColor="border-amber-500/40"
        isActive={activeFilter === 'reported'}
        onClick={() => onFilterChange('reported')}
      />
      <StatCard
        testId="verification-stats-archived"
        label="Wycofane"
        value={stats.archivedGlobal || 0}
        icon={Archive}
        color="text-muted-foreground"
        bgColor="bg-muted"
        activeBgColor="bg-muted/70"
        activeBorderColor="border-border"
        isActive={activeFilter === 'archived'}
        onClick={() => onFilterChange('archived')}
      />
    </div>
  );
}
