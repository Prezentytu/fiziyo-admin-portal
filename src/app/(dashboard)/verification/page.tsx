"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { ShieldCheck, Search, RefreshCw, LayoutGrid, List, Clock, User, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { VerificationStatsCards } from "@/components/verification/VerificationStatsCards";
import { VerificationTaskCard } from "@/components/verification/VerificationTaskCard";
import { ReviewerAchievements } from "@/components/verification/ReviewerAchievements";
import { VerificationIntro } from "@/components/verification/VerificationIntro";
import { useSystemRole } from "@/hooks/useSystemRole";

import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import {
  GET_PENDING_EXERCISES_QUERY,
  GET_CHANGES_REQUESTED_EXERCISES_QUERY,
  GET_PUBLISHED_EXERCISES_QUERY,
  GET_ARCHIVED_EXERCISES_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from "@/graphql/queries/adminExercises.queries";
import {
  SCAN_EXERCISE_REPOSITORY_MUTATION,
  IMPORT_EXERCISES_TO_REVIEW_MUTATION,
  UNPUBLISH_EXERCISE_MUTATION,
} from "@/graphql/mutations/adminExercises.mutations";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getMediaUrl } from "@/utils/mediaUrl";
import { cn } from "@/lib/utils";
import type { UserByClerkIdResponse } from "@/types/apollo";
import type {
  GetPendingReviewExercisesResponse,
  GetChangesRequestedExercisesResponse,
  GetPublishedExercisesResponse,
  GetArchivedExercisesResponse,
  GetVerificationStatsResponse,
  UnpublishExerciseResponse,
  AdminExercise,
  ContentStatus,
} from "@/graphql/types/adminExercise.types";

// Helper function
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "przed chwilą";
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return `${Math.floor(diffDays / 7)} tyg. temu`;
}

// Inline List Row Component
function VerificationTaskRow({
  exercise,
  onUnpublish,
  isUnpublishing,
}: {
  exercise: AdminExercise;
  onUnpublish?: (id: string) => void;
  isUnpublishing?: boolean;
}) {
  const imageUrl = getMediaUrl(exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0]);
  
  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING_REVIEW: { label: "Oczekuje", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    CHANGES_REQUESTED: { label: "Do poprawy", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    PUBLISHED: { label: "Opublikowany", className: "bg-primary/10 text-primary border-primary/20" },
  };
  const status = statusConfig[exercise.status] || { label: "Szkic", className: "bg-muted text-muted-foreground" };

  return (
    <Link href={`/verification/${exercise.id}`}>
      <div
        className={cn(
          "group flex items-center gap-4 p-3 rounded-lg border border-border/60 bg-surface/50",
          "hover:border-primary/40 hover:bg-surface transition-all duration-200 cursor-pointer"
        )}
        data-testid={`verification-row-${exercise.id}`}
      >
        {/* Thumbnail */}
        <div className="w-16 h-12 rounded-md overflow-hidden bg-surface-light shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={exercise.name}
              className="w-full h-full object-cover"
              loading="lazy"
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
            <Badge variant="outline" className={cn("text-[10px] shrink-0", status.className)}>
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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "changes" | "published" | "archived">("pending");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | null>(null);
  const [scanResult, setScanResult] = useState<RepositoryScanResult | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Get user data
  const { data: userData } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: clerkUser?.id },
    skip: !clerkUser?.id,
  });
  const userName = userData?.userByClerkId?.fullname ||
    userData?.userByClerkId?.personalData?.firstName ||
    clerkUser?.firstName ||
    "Weryfikator";

  // Get verification stats
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery<GetVerificationStatsResponse>(
    GET_VERIFICATION_STATS_QUERY,
    { skip: !canReviewExercises }
  );

  // Get pending exercises
  const { data: pendingData, loading: pendingLoading, refetch: refetchPending } = useQuery<GetPendingReviewExercisesResponse>(
    GET_PENDING_EXERCISES_QUERY,
    { skip: !canReviewExercises || activeTab !== "pending" }
  );

  // Get exercises with changes requested
  const { data: changesData, loading: changesLoading, refetch: refetchChanges } = useQuery<GetChangesRequestedExercisesResponse>(
    GET_CHANGES_REQUESTED_EXERCISES_QUERY,
    { skip: !canReviewExercises || activeTab !== "changes" }
  );

  // Get published exercises
  const { data: publishedData, loading: publishedLoading, refetch: refetchPublished } = useQuery<GetPublishedExercisesResponse>(
    GET_PUBLISHED_EXERCISES_QUERY,
    { skip: !canReviewExercises || activeTab !== "published" }
  );

  // Get archived exercises (withdrawn from global)
  const { data: archivedData, loading: archivedLoading, refetch: refetchArchived } = useQuery<GetArchivedExercisesResponse>(
    GET_ARCHIVED_EXERCISES_QUERY,
    { skip: !canReviewExercises || activeTab !== "archived" }
  );

  // Scan repository mutation
  const [scanRepository, { loading: scanning }] = useMutation<{ scanExerciseRepository: RepositoryScanResult }>(
    SCAN_EXERCISE_REPOSITORY_MUTATION,
    {
      onCompleted: (data) => {
        setScanResult(data.scanExerciseRepository);
        if (data.scanExerciseRepository.success) {
          if (data.scanExerciseRepository.newExercisesCount > 0) {
            toast.success(`Znaleziono ${data.scanExerciseRepository.newExercisesCount} nowych ćwiczeń do zaimportowania.`);
          } else {
            toast.info("Wszystkie ćwiczenia z repozytorium są już w bazie.");
          }
        } else {
          toast.error(data.scanExerciseRepository.message || "Błąd skanowania");
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
          // Refetch queries
          refetchStats();
          refetchPending();
        } else {
          toast.error(result.message || "Błąd importowania");
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
        toast.success("Ćwiczenie zostało cofnięte do wersji roboczej.");
        refetchStats();
        refetchPublished();
      },
      onError: (error) => {
        toast.error(`Błąd cofania publikacji: ${error.message}`);
      },
    }
  );

  const handleUnpublish = (exerciseId: string, reason?: string) => {
    unpublishExercise({ variables: { exerciseId, reason } });
  };

  // Combine and filter exercises based on active tab
  const exercises = useMemo(() => {
    let list: AdminExercise[] = [];

    if (activeTab === "pending") {
      list = pendingData?.pendingReviewExercises || [];
    } else if (activeTab === "changes") {
      list = changesData?.changesRequestedExercises || [];
    } else if (activeTab === "published") {
      list = publishedData?.exercisesByStatus || [];
    } else if (activeTab === "archived") {
      list = archivedData?.exercisesByStatus || [];
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.description?.toLowerCase().includes(query) ||
          ex.createdBy?.fullname?.toLowerCase().includes(query) ||
          ex.createdBy?.email?.toLowerCase().includes(query)
      );
    }

    // Apply status filter from stats cards
    if (statusFilter) {
      list = list.filter((ex) => ex.status === statusFilter);
    }

    return list;
  }, [activeTab, pendingData, changesData, publishedData, archivedData, searchQuery, statusFilter]);

  const isLoading = statsLoading || pendingLoading || changesLoading || publishedLoading || archivedLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchPending();
    refetchChanges();
    refetchPublished();
    refetchArchived();
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
  const hasTasks = pendingCount + changesCount > 0 || publishedCount > 0 || archivedCount > 0;

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
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            Centrum Weryfikacji
          </h1>
          <p className="text-muted-foreground mt-1">
            Cześć {userName}, dzięki Tobie baza ćwiczeń jest bezpieczna i profesjonalna.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Compact achievements in header */}
          <ReviewerAchievements variant="compact" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <VerificationStatsCards
        stats={stats}
        isLoading={statsLoading}
        activeFilter={statusFilter}
        onFilterChange={(filter) => setStatusFilter(filter as ContentStatus | null)}
      />

      {/* Search and Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2" data-testid="verification-tab-pending">
              Oczekujące
              {pendingCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="changes" className="gap-2" data-testid="verification-tab-changes">
              Do poprawy
              {changesCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                  {changesCount > 99 ? "99+" : changesCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="published" className="gap-2" data-testid="verification-tab-published">
              Opublikowane
              {publishedCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {publishedCount > 99 ? "99+" : publishedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2" data-testid="verification-tab-archived">
              Wycofane
              {archivedCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-500 px-1.5 text-[10px] font-bold text-white">
                  {archivedCount > 99 ? "99+" : archivedCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj ćwiczenia..."
              className="pl-9 bg-surface border-border/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="verification-search-input"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border/60 bg-surface p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
              data-testid="verification-view-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
              data-testid="verification-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
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
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={
            searchQuery
              ? "Brak wyników"
              : activeTab === "pending"
              ? "Wszystko zweryfikowane!"
              : activeTab === "changes"
              ? "Brak ćwiczeń do poprawy"
              : activeTab === "archived"
              ? "Brak wycofanych ćwiczeń"
              : "Brak opublikowanych ćwiczeń"
          }
          description={
            searchQuery
              ? "Spróbuj zmienić kryteria wyszukiwania"
              : activeTab === "pending"
              ? "Nie ma ćwiczeń oczekujących na weryfikację. Świetna robota!"
              : activeTab === "changes"
              ? "Wszystkie ćwiczenia wymagające poprawek zostały zaktualizowane."
              : activeTab === "archived"
              ? "Żadne ćwiczenie nie zostało wycofane z bazy globalnej."
              : "Zatwierdź ćwiczenia z zakładki 'Oczekujące' żeby je opublikować."
          }
        />
      ) : viewMode === "grid" ? (
        // Grid View
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {exercises.map((exercise) => (
            <VerificationTaskCard
              key={exercise.id}
              exercise={exercise}
              onUnpublish={activeTab === "published" ? handleUnpublish : undefined}
              isUnpublishing={unpublishing}
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
              onUnpublish={activeTab === "published" ? handleUnpublish : undefined}
              isUnpublishing={unpublishing}
            />
          ))}
        </div>
      )}
    </div>
  );
}
