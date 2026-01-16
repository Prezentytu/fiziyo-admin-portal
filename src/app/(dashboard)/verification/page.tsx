"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { ShieldCheck, Search, RefreshCw } from "lucide-react";
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
  GET_VERIFICATION_STATS_QUERY,
} from "@/graphql/queries/adminExercises.queries";
import {
  SCAN_EXERCISE_REPOSITORY_MUTATION,
  IMPORT_EXERCISES_TO_REVIEW_MUTATION,
} from "@/graphql/mutations/adminExercises.mutations";
import type { UserByClerkIdResponse } from "@/types/apollo";
import type {
  GetPendingReviewExercisesResponse,
  GetChangesRequestedExercisesResponse,
  GetVerificationStatsResponse,
  AdminExercise,
  ContentStatus,
} from "@/graphql/types/adminExercise.types";

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
  const [activeTab, setActiveTab] = useState<"pending" | "changes" | "all">("pending");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | null>(null);
  const [scanResult, setScanResult] = useState<RepositoryScanResult | null>(null);

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

  // Combine and filter exercises based on active tab
  const exercises = useMemo(() => {
    let list: AdminExercise[] = [];

    if (activeTab === "pending") {
      list = pendingData?.pendingReviewExercises || [];
    } else if (activeTab === "changes") {
      list = changesData?.changesRequestedExercises || [];
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
  }, [activeTab, pendingData, changesData, searchQuery, statusFilter]);

  const isLoading = statsLoading || pendingLoading || changesLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchPending();
    refetchChanges();
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

  // Check if there are tasks to do
  const hasTasks = pendingCount + changesCount > 0;

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
            <TabsTrigger value="pending" className="gap-2">
              Oczekujące
              {pendingCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="changes" className="gap-2">
              Do poprawy
              {changesCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                  {changesCount > 99 ? "99+" : changesCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
              : "Brak ćwiczeń do poprawy"
          }
          description={
            searchQuery
              ? "Spróbuj zmienić kryteria wyszukiwania"
              : activeTab === "pending"
              ? "Nie ma ćwiczeń oczekujących na weryfikację. Świetna robota!"
              : "Wszystkie ćwiczenia wymagające poprawek zostały zaktualizowane."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {exercises.map((exercise) => (
            <VerificationTaskCard key={exercise.id} exercise={exercise} />
          ))}
        </div>
      )}
    </div>
  );
}
