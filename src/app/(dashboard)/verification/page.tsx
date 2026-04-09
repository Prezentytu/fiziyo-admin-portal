'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { ShieldCheck, Search, RefreshCw, LayoutGrid, List, Clock, User, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { VerificationStatsCards } from '@/features/verification/VerificationStatsCards';
import { VerificationTaskCard } from '@/features/verification/VerificationTaskCard';
import { ReviewerAchievements } from '@/features/verification/ReviewerAchievements';
import { VerificationIntro } from '@/features/verification/VerificationIntro';
import { useSystemRole } from '@/hooks/useSystemRole';
import { getExerciseReports, getExerciseReportsPage } from '@/services/exerciseReportService';
import {
  buildVerificationSearchParams,
  clampVerificationPageSize,
  parsePositiveInt,
  parseVerificationFilter,
  parseVerificationView,
} from '@/features/verification/utils/verificationPagination';

import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import {
  GET_VERIFICATION_STATS_QUERY,
  GET_VERIFICATION_QUEUE_PAGE_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import {
  SCAN_EXERCISE_REPOSITORY_MUTATION,
  IMPORT_EXERCISES_TO_REVIEW_MUTATION,
  UNPUBLISH_EXERCISE_MUTATION,
} from '@/graphql/mutations/adminExercises.mutations';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { getMediaUrl } from '@/utils/mediaUrl';
import { cn } from '@/lib/utils';
import type { UserByClerkIdResponse } from '@/types/apollo';
import type {
  GetVerificationStatsResponse,
  GetVerificationQueuePageResponse,
  GetVerificationQueuePageVariables,
  UnpublishExerciseResponse,
  AdminExercise,
} from '@/graphql/types/adminExercise.types';
import type { ExerciseReport } from '@/types/exercise-report.types';

// Helper function
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return 'przed chwilą';
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return 'wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  return `${Math.floor(diffDays / 7)} tyg. temu`;
}

// Inline List Row Component
function VerificationTaskRow({
  exercise,
  onUnpublish,
  isUnpublishing,
  detailHref,
}: {
  exercise: AdminExercise;
  onUnpublish?: (id: string) => void;
  isUnpublishing?: boolean;
  detailHref?: string;
}) {
  const imageUrl = getMediaUrl(exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING_REVIEW: { label: 'Oczekuje', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    CHANGES_REQUESTED: { label: 'Do poprawy', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    PUBLISHED: { label: 'Opublikowany', className: 'bg-primary/10 text-primary border-primary/20' },
  };
  const status = statusConfig[exercise.status] || { label: 'Szkic', className: 'bg-muted text-muted-foreground' };

  return (
    <Link href={detailHref ?? `/verification/${exercise.id}`}>
      <div
        className={cn(
          'group flex items-center gap-4 p-3 rounded-lg border border-border/60 bg-surface/50',
          'hover:border-primary/40 hover:bg-surface transition-all duration-200 cursor-pointer'
        )}
        data-testid={`verification-row-${exercise.id}`}
      >
        {/* Thumbnail */}
        <div className="w-16 h-12 rounded-md overflow-hidden bg-surface-light shrink-0 relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={exercise.name}
              width={64}
              height={48}
              className="w-full h-full object-cover"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {exercise.name}
            </h3>
            <Badge variant="outline" className={cn('text-[10px] shrink-0', status.className)}>
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {exercise.createdBy && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {exercise.createdBy.fullname || exercise.createdBy.email}
              </span>
            )}
            {exercise.createdAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(exercise.createdAt)}
              </span>
            )}
          </div>
          {exercise.latestReport && (
            <p className="mt-1 text-[11px] text-amber-600 line-clamp-1" data-testid={`verification-row-${exercise.id}-report-context`}>
              {exercise.latestReport.reasonCategory}: {exercise.latestReport.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {exercise.hasOpenReport && (
            <Badge
              variant="outline"
              className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-600"
              data-testid={`verification-row-${exercise.id}-reported-badge`}
            >
              Zgłoszenia ({exercise.openReportCount ?? 1})
            </Badge>
          )}
          {onUnpublish && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUnpublish(exercise.id);
              }}
              disabled={isUnpublishing}
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
            >
              Cofnij
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// Types for repository scan and import
interface RepositoryScanResult {
  success: boolean;
  totalInRepository: number;
  newExercisesCount: number;
  existingCount: number;
  message: string;
}

interface ImportToReviewResult {
  success: boolean;
  totalToImport: number;
  importedCount: number;
  failedCount: number;
  message: string;
  errors: string[];
}

export default function VerificationPage() {
  const { user: clerkUser } = useUser();
  const { canReviewExercises, isLoading: roleLoading } = useSystemRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialFilter = parseVerificationFilter(searchParams.get('filter'));
  const initialView = parseVerificationView(searchParams.get('view'));
  const initialSearch = searchParams.get('search') ?? '';
  const initialPage = parsePositiveInt(searchParams.get('page'), 1);
  const initialPageSize = clampVerificationPageSize(parsePositiveInt(searchParams.get('pageSize'), 20));

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'changes' | 'published' | 'archived' | 'reported'>(
    initialFilter
  );
  const [scanResult, setScanResult] = useState<RepositoryScanResult | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialView);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageOpenReports, setPageOpenReports] = useState<ExerciseReport[]>([]);
  const [pageReportsLoading, setPageReportsLoading] = useState(false);
  const [reportedExercises, setReportedExercises] = useState<AdminExercise[]>([]);
  const [reportedLoading, setReportedLoading] = useState(false);
  const [reportedPageMeta, setReportedPageMeta] = useState({
    totalCount: 0,
    page: 1,
    pageSize: initialPageSize,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [reportedCount, setReportedCount] = useState(0);

  const updateUrlState = useCallback(
    (nextState: {
      filter?: 'pending' | 'changes' | 'published' | 'archived' | 'reported';
      search?: string;
      page?: number;
      pageSize?: number;
      view?: 'grid' | 'list';
    }) => {
      const nextFilter = nextState.filter ?? activeFilter;
      const nextSearch = nextState.search ?? searchQuery;
      const nextPage = nextState.page ?? page;
      const nextPageSize = nextState.pageSize ?? pageSize;
      const nextView = nextState.view ?? viewMode;

      const params = buildVerificationSearchParams({
        filter: nextFilter,
        search: nextSearch,
        page: nextPage,
        pageSize: nextPageSize,
        view: nextView,
      });

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [activeFilter, searchQuery, page, pageSize, viewMode, router, pathname]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get user data
  const { data: userData } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: clerkUser?.id },
    skip: !clerkUser?.id,
  });
  const userName =
    userData?.userByClerkId?.fullname ||
    userData?.userByClerkId?.personalData?.firstName ||
    clerkUser?.firstName ||
    'Weryfikator';

  // Get verification stats
  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery<GetVerificationStatsResponse>(GET_VERIFICATION_STATS_QUERY, { skip: !canReviewExercises });

  const queueVariables = useMemo<GetVerificationQueuePageVariables>(
    () => ({
      filter: activeFilter,
      search: debouncedSearch || null,
      page,
      pageSize,
    }),
    [activeFilter, debouncedSearch, page, pageSize]
  );

  const {
    data: queueData,
    loading: queueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useQuery<GetVerificationQueuePageResponse, GetVerificationQueuePageVariables>(GET_VERIFICATION_QUEUE_PAGE_QUERY, {
    variables: queueVariables,
    skip: !canReviewExercises || activeFilter === 'reported',
    fetchPolicy: 'cache-and-network',
  });

  // Scan repository mutation
  const [scanRepository, { loading: scanning }] = useMutation<{ scanExerciseRepository: RepositoryScanResult }>(
    SCAN_EXERCISE_REPOSITORY_MUTATION,
    {
      onCompleted: (data) => {
        setScanResult(data.scanExerciseRepository);
        if (data.scanExerciseRepository.success) {
          if (data.scanExerciseRepository.newExercisesCount > 0) {
            toast.success(
              `Znaleziono ${data.scanExerciseRepository.newExercisesCount} nowych ćwiczeń do zaimportowania.`
            );
          } else {
            toast.info('Wszystkie ćwiczenia z repozytorium są już w bazie.');
          }
        } else {
          toast.error(data.scanExerciseRepository.message || 'Błąd skanowania');
        }
      },
      onError: (error) => {
        toast.error(`Błąd skanowania: ${error.message}`);
      },
    }
  );

  // Import to review mutation
  const [importToReview, { loading: importing }] = useMutation<{ importExercisesToReview: ImportToReviewResult }>(
    IMPORT_EXERCISES_TO_REVIEW_MUTATION,
    {
      onCompleted: (data) => {
        const result = data.importExercisesToReview;
        if (result.success) {
          toast.success(result.message || `Zaimportowano ${result.importedCount} ćwiczeń do weryfikacji.`);
          setScanResult(null); // Reset scan result
          refetchStats();
          refetchQueue();
        } else {
          toast.error(result.message || 'Błąd importowania');
        }
      },
      onError: (error) => {
        toast.error(`Błąd importowania: ${error.message}`);
      },
    }
  );

  const handleScanRepository = () => {
    scanRepository();
  };

  const handleImportToReview = () => {
    importToReview();
  };

  // Unpublish exercise mutation
  const [unpublishExercise, { loading: unpublishing }] = useMutation<UnpublishExerciseResponse>(
    UNPUBLISH_EXERCISE_MUTATION,
    {
      onCompleted: () => {
        toast.success('Ćwiczenie zostało cofnięte do wersji roboczej.');
        refetchStats();
        refetchQueue();
      },
      onError: (error) => {
        toast.error(`Błąd cofania publikacji: ${error.message}`);
      },
    }
  );

  const handleUnpublish = (exerciseId: string, reason?: string) => {
    unpublishExercise({ variables: { exerciseId, reason } });
  };

  useEffect(() => {
    if (!canReviewExercises) {
      setReportedCount(0);
      return;
    }

    let cancelled = false;
    getExerciseReportsPage({ status: 'OPEN', page: 1, pageSize: 1 }).then((response) => {
      if (!cancelled) {
        setReportedCount(response.totalCount);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [canReviewExercises]);

  useEffect(() => {
    if (!canReviewExercises || activeFilter !== 'reported') {
      setReportedExercises([]);
      return;
    }

    let cancelled = false;
    setReportedLoading(true);

    getExerciseReportsPage({
      status: 'OPEN',
      search: debouncedSearch || undefined,
      page,
      pageSize,
    })
      .then((response) => {
        if (cancelled) {
          return;
        }

        setReportedPageMeta({
          totalCount: response.totalCount,
          page: response.page,
          pageSize: response.pageSize,
          totalPages: response.totalPages,
          hasPreviousPage: response.hasPreviousPage,
          hasNextPage: response.hasNextPage,
        });

        const grouped = new Map<string, ExerciseReport[]>();
        for (const report of response.reports) {
          const current = grouped.get(report.exerciseId) || [];
          current.push(report);
          grouped.set(report.exerciseId, current);
        }

        const mappedExercises: AdminExercise[] = Array.from(grouped.entries()).map(([exerciseId, reports]) => {
          const latestReport = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          return {
            id: exerciseId,
            name: latestReport.exerciseName,
            type: 'REPS',
            isActive: true,
            status: latestReport.routingTarget === 'UPDATE_PENDING' ? 'PUBLISHED' : 'PENDING_REVIEW',
            hasOpenReport: true,
            openReportCount: reports.length,
            latestReport: {
              reasonCategory: latestReport.reasonCategory,
              description: latestReport.description,
              reporterName: latestReport.reportedBy.name,
              createdAt: latestReport.createdAt,
              routingTarget: latestReport.routingTarget,
            },
          };
        });
        setReportedExercises(mappedExercises);
      })
      .finally(() => {
        if (!cancelled) {
          setReportedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canReviewExercises, activeFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    if (!canReviewExercises || activeFilter === 'reported') {
      setPageOpenReports([]);
      return;
    }

    const queueItems = queueData?.verificationQueuePage.items ?? [];
    if (queueItems.length === 0) {
      setPageOpenReports([]);
      return;
    }

    let cancelled = false;
    setPageReportsLoading(true);

    getExerciseReports({
      status: 'OPEN',
      exerciseIds: queueItems.map((exercise) => exercise.id),
    })
      .then((reports) => {
        if (!cancelled) {
          setPageOpenReports(reports);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPageReportsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canReviewExercises, activeFilter, queueData]);

  const openReportsByExerciseId = useMemo(() => {
    const grouped = new Map<string, ExerciseReport[]>();
    for (const report of pageOpenReports) {
      const current = grouped.get(report.exerciseId) || [];
      current.push(report);
      grouped.set(report.exerciseId, current);
    }
    return grouped;
  }, [pageOpenReports]);

  const exercises = useMemo(() => {
    if (activeFilter === 'reported') {
      return reportedExercises;
    }

    const queueItems = queueData?.verificationQueuePage.items ?? [];
    return queueItems.map((exercise) => {
        const reports = openReportsByExerciseId.get(exercise.id);
        if (!reports || reports.length === 0) {
          return exercise;
        }

        const latestReport = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        return {
          ...exercise,
          hasOpenReport: true,
          openReportCount: reports.length,
          latestReport: {
            reasonCategory: latestReport.reasonCategory,
            description: latestReport.description,
            reporterName: latestReport.reportedBy.name,
            createdAt: latestReport.createdAt,
            routingTarget: latestReport.routingTarget,
          },
        };
      });
  }, [activeFilter, queueData, reportedExercises, openReportsByExerciseId]);

  const pageMeta = useMemo(() => {
    if (activeFilter === 'reported') {
      return reportedPageMeta;
    }
    const queuePage = queueData?.verificationQueuePage;
    return {
      totalCount: queuePage?.totalCount ?? 0,
      page: queuePage?.page ?? page,
      pageSize: queuePage?.pageSize ?? pageSize,
      totalPages: queuePage?.totalPages ?? 0,
      hasPreviousPage: queuePage?.hasPreviousPage ?? false,
      hasNextPage: queuePage?.hasNextPage ?? false,
    };
  }, [activeFilter, reportedPageMeta, queueData, page, pageSize]);

  const isLoading = statsLoading || queueLoading || reportedLoading || pageReportsLoading;

  const detailQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('filter', activeFilter);
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    }
    params.set('page', String(pageMeta.page));
    params.set('pageSize', String(pageMeta.pageSize));
    params.set('view', viewMode);
    return params.toString();
  }, [activeFilter, debouncedSearch, pageMeta.page, pageMeta.pageSize, viewMode]);

  const handleRefresh = () => {
    refetchStats();
    refetchQueue();
    getExerciseReportsPage({ status: 'OPEN', page: 1, pageSize: 1 }).then((response) => {
      setReportedCount(response.totalCount);
    });
    if (activeFilter === 'reported') {
      setReportedLoading(true);
      getExerciseReportsPage({
        status: 'OPEN',
        search: debouncedSearch || undefined,
        page: pageMeta.page,
        pageSize: pageMeta.pageSize,
      })
        .then((response) => {
          setReportedPageMeta({
            totalCount: response.totalCount,
            page: response.page,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
            hasPreviousPage: response.hasPreviousPage,
            hasNextPage: response.hasNextPage,
          });
        })
        .finally(() => {
          setReportedLoading(false);
        });
    }
  };

  const handleFilterChange = (nextFilter: 'pending' | 'changes' | 'published' | 'archived' | 'reported') => {
    setActiveFilter(nextFilter);
    setPage(1);
    updateUrlState({ filter: nextFilter, page: 1, search: searchQuery });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    updateUrlState({ search: value, page: 1 });
  };

  const handleViewModeChange = (nextView: 'grid' | 'list') => {
    setViewMode(nextView);
    updateUrlState({ view: nextView });
  };

  const handlePageChange = (nextPage: number) => {
    const safeNextPage = Math.max(nextPage, 1);
    setPage(safeNextPage);
    updateUrlState({ page: safeNextPage });
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
    updateUrlState({ pageSize: nextPageSize, page: 1 });
  };

  // Access denied for non-content managers
  if (!roleLoading && !canReviewExercises) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={ShieldCheck}
          title="Brak dostępu"
          description="Nie masz uprawnień do weryfikacji ćwiczeń. Skontaktuj się z administratorem systemu."
        />
      </div>
    );
  }

  const stats = statsData?.verificationStats || null;
  const pendingCount = stats?.pendingReview || 0;
  const changesCount = stats?.changesRequested || 0;
  const publishedCount = stats?.published || 0;
  const archivedCount = stats?.archivedGlobal || 0;

  // Check if there are tasks to do (pending or changes) or published/archived to manage
  const hasTasks = pendingCount + changesCount > 0 || publishedCount > 0 || archivedCount > 0 || reportedCount > 0;

  // CLEAN VIEW: No tasks to verify - show simplified intro screen
  if (!statsLoading && !hasTasks) {
    return (
      <div className="space-y-6">
        <VerificationIntro
          userName={userName}
          scanResult={scanResult}
          onScan={handleScanRepository}
          onImport={handleImportToReview}
          isScanning={scanning}
          isImporting={importing}
        />
        {/* Show achievements only if user has review history */}
        <ReviewerAchievements showOnlyIfHasHistory />
      </div>
    );
  }

  // FULL VIEW: There are tasks to verify
  return (
    <div className="space-y-6">
      {/* Hero Header with compact achievements */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Centrum Weryfikacji</h1>
          <p className="text-muted-foreground mt-1">
            Cześć {userName}, dzięki Tobie baza ćwiczeń jest bezpieczna i profesjonalna.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Compact achievements in header */}
          <ReviewerAchievements variant="compact" />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Stats Cards - Interactive Filter Cards */}
      <VerificationStatsCards
        stats={stats}
        isLoading={statsLoading}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        reportedCount={reportedCount}
      />

      {/* Search and View Mode */}
      <div className="flex items-center gap-3 justify-end">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj ćwiczenia..."
            className="pl-9 bg-surface border-border/60"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            data-testid="verification-search-input"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-border/60 bg-surface p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewModeChange('grid')}
            data-testid="verification-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewModeChange('list')}
            data-testid="verification-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Exercise Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
              <Skeleton className="aspect-video" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activeFilter !== 'reported' && queueError ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nie udało się pobrać kolejki weryfikacji"
          description={queueError.message}
          actionLabel="Spróbuj ponownie"
          onAction={() => {
            void refetchQueue();
          }}
        />
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={
            searchQuery
              ? 'Brak wyników'
              : activeFilter === 'pending'
                ? 'Wszystko zweryfikowane!'
                : activeFilter === 'changes'
                  ? 'Brak ćwiczeń do poprawy'
                  : activeFilter === 'reported'
                    ? 'Brak aktywnych zgłoszeń'
                  : activeFilter === 'archived'
                    ? 'Brak wycofanych ćwiczeń'
                    : 'Brak opublikowanych ćwiczeń'
          }
          description={
            searchQuery
              ? 'Spróbuj zmienić kryteria wyszukiwania'
              : activeFilter === 'pending'
                ? 'Nie ma ćwiczeń oczekujących na weryfikację. Świetna robota!'
                : activeFilter === 'changes'
                  ? 'Wszystkie ćwiczenia wymagające poprawek zostały zaktualizowane.'
                  : activeFilter === 'reported'
                    ? 'Nie ma zgłoszeń oczekujących na obsługę.'
                  : activeFilter === 'archived'
                    ? 'Żadne ćwiczenie nie zostało wycofane z bazy globalnej.'
                    : "Zatwierdź ćwiczenia z karty 'Oczekujące' żeby je opublikować."
          }
        />
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {exercises.map((exercise) => (
            <VerificationTaskCard
              key={exercise.id}
              exercise={exercise}
              onUnpublish={activeFilter === 'published' ? handleUnpublish : undefined}
              isUnpublishing={unpublishing}
              detailHref={`/verification/${exercise.id}?${detailQueryString}`}
            />
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-2">
          {exercises.map((exercise) => (
            <VerificationTaskRow
              key={exercise.id}
              exercise={exercise}
              onUnpublish={activeFilter === 'published' ? handleUnpublish : undefined}
              isUnpublishing={unpublishing}
              detailHref={`/verification/${exercise.id}?${detailQueryString}`}
            />
          ))}
        </div>
      )}

      {exercises.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Wyświetlono {exercises.length} z {pageMeta.totalCount} wyników
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(pageMeta.pageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
              <SelectTrigger className="h-8 w-[86px] bg-background" data-testid="verification-page-size-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pageMeta.page - 1)}
              disabled={!pageMeta.hasPreviousPage}
              data-testid="verification-pagination-prev"
            >
              Poprzednia
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="verification-pagination-indicator">
              Strona {pageMeta.page} z {Math.max(pageMeta.totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pageMeta.page + 1)}
              disabled={!pageMeta.hasNextPage}
              data-testid="verification-pagination-next"
            >
              Następna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
