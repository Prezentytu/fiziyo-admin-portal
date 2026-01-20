"use client";

import { Clock, AlertTriangle, FileCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { VerificationStats } from "@/graphql/types/adminExercise.types";

interface VerificationStatsCardsProps {
  stats: VerificationStats | null;
  isLoading?: boolean;
  activeFilter?: string | null;
  onFilterChange?: (filter: string | null) => void;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  filterKey: string | null;
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
  isActive,
  onClick,
  testId,
}: StatCardProps) {
  return (
    <Card
      data-testid={testId}
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer",
        isActive
          ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]"
          : "border-border/60 hover:border-border hover:shadow-lg"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
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
  isLoading,
  activeFilter,
  onFilterChange,
}: VerificationStatsCardsProps) {
  const handleFilterClick = (filter: string | null) => {
    if (onFilterChange) {
      // Toggle filter if clicking same one
      onFilterChange(activeFilter === filter ? null : filter);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="grid gap-3 grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-3">
      <StatCard
        testId="verification-stats-pending"
        label="Oczekujące"
        value={stats.pendingReview}
        icon={Clock}
        color="text-amber-500"
        bgColor="bg-amber-500/10"
        filterKey="PENDING_REVIEW"
        isActive={activeFilter === "PENDING_REVIEW"}
        onClick={() => handleFilterClick("PENDING_REVIEW")}
      />
      <StatCard
        testId="verification-stats-changes"
        label="Do poprawy"
        value={stats.changesRequested}
        icon={AlertTriangle}
        color="text-orange-500"
        bgColor="bg-orange-500/10"
        filterKey="CHANGES_REQUESTED"
        isActive={activeFilter === "CHANGES_REQUESTED"}
        onClick={() => handleFilterClick("CHANGES_REQUESTED")}
      />
      <StatCard
        testId="verification-stats-published"
        label="Opublikowane"
        value={stats.published}
        icon={FileCheck}
        color="text-primary"
        bgColor="bg-primary/10"
        filterKey="PUBLISHED"
        isActive={activeFilter === "PUBLISHED"}
        onClick={() => handleFilterClick("PUBLISHED")}
      />
    </div>
  );
}
