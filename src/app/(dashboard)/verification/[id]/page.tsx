"use client";

import { use, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MasterVideoPlayer } from "@/components/verification/MasterVideoPlayer";
import { RejectReasonDialog } from "@/components/verification/RejectReasonDialog";
import { ApproveDialog } from "@/components/verification/ApproveDialog";

// Clinical Operator UI Components - Zero Scroll Layout
import { VerificationEditorPanel } from "@/components/verification/VerificationEditorPanel";
import { VerificationStickyFooterV2 } from "@/components/verification/VerificationStickyFooterV2";
import { useExerciseValidation } from "@/components/verification/PublishGuardrails";

import { useSystemRole } from "@/hooks/useSystemRole";
import { useVerificationHotkeys } from "@/hooks/useVerificationHotkeys";

import { GET_EXERCISE_BY_ID_QUERY } from "@/graphql/queries/exercises.queries";
import {
  GET_PENDING_EXERCISES_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from "@/graphql/queries/adminExercises.queries";
import {
  APPROVE_EXERCISE_MUTATION,
  REJECT_EXERCISE_MUTATION,
  UPDATE_EXERCISE_FIELD_MUTATION,
} from "@/graphql/mutations/adminExercises.mutations";
import type { ExerciseByIdResponse } from "@/types/apollo";
import type {
  AdminExercise,
  RejectionReason,
  ApproveExerciseResponse,
  RejectExerciseResponse,
  GetPendingReviewExercisesResponse,
  GetVerificationStatsResponse,
  ExerciseRelationTarget,
} from "@/graphql/types/adminExercise.types";

interface VerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * VerificationDetailPage - Clinical Operator UI
 *
 * Filozofia "Zero Scroll" (Bloomberg Terminal style):
 * - Wszystko widoczne bez scrollowania na 1366x768
 * - MasterVideoPlayer zamiast MobileSimulator (pełna wysokość)
 * - Aggressive compact layout w prawej kolumnie
 * - Review by Exception - ekspert tylko poprawia błędy
 * - Checkbox bezpieczeństwa klinicznego w footerze
 * - Hotkeys dla power users
 */
export default function VerificationDetailPage({ params }: VerificationDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { canReviewExercises, isLoading: roleLoading } = useSystemRole();

  // ============================================
  // STATE
  // ============================================

  // Dialog states
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  // Clinical safety checkbox (new!)
  const [clinicalCheckboxChecked, setClinicalCheckboxChecked] = useState(false);

  // Tags state (for local editing before save)
  const [mainTags, setMainTags] = useState<string[]>([]);
  const [additionalTags, setAdditionalTags] = useState<string[]>([]);

  // Relations state
  const [regressionExercise, setRegressionExercise] = useState<ExerciseRelationTarget | null>(null);
  const [progressionExercise, setProgressionExercise] = useState<ExerciseRelationTarget | null>(null);

  // Save tracking
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Smart Validation completion state (from VerificationEditorPanel)
  const [completionData, setCompletionData] = useState<{
    percentage: number;
    canSaveDraft: boolean;
    canPublish: boolean;
    criticalMissing: string[];
    recommendedMissing: string[];
  }>({
    percentage: 0,
    canSaveDraft: false,
    canPublish: false,
    criticalMissing: [],
    recommendedMissing: [],
  });

  // ============================================
  // QUERIES
  // ============================================

  const { data, loading, error, refetch } = useQuery<ExerciseByIdResponse>(GET_EXERCISE_BY_ID_QUERY, {
    variables: { id },
  });

  // Initialize tags when data loads
  useEffect(() => {
    if (data?.exerciseById) {
      const ex = data.exerciseById as unknown as AdminExercise;
      setMainTags(ex.mainTags || []);
      setAdditionalTags(ex.additionalTags || []);
      // Reset checkbox when switching exercises
      setClinicalCheckboxChecked(false);
    }
  }, [data?.exerciseById]);

  // Query for pending exercises (for progress indicator and auto-advance)
  const { data: pendingData } = useQuery<GetPendingReviewExercisesResponse>(GET_PENDING_EXERCISES_QUERY);

  // Query for stats
  const { data: statsData } = useQuery<GetVerificationStatsResponse>(GET_VERIFICATION_STATS_QUERY);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const exercise = data?.exerciseById as unknown as AdminExercise | null;

  // Progress tracking
  const pendingExercises = pendingData?.pendingReviewExercises || [];
  const currentIndex = pendingExercises.findIndex((ex) => ex.id === id);
  const totalPending = statsData?.verificationStats?.pendingReview || pendingExercises.length;
  const positionInQueue = currentIndex >= 0 ? currentIndex + 1 : null;
  const remainingCount = totalPending - (positionInQueue || 0);

  // Validation (using existing hook)
  const { canPublish: legacyCanPublish, errors: validationErrorRules } = useExerciseValidation(
    exercise || ({} as AdminExercise),
    { mainTags, additionalTags }
  );

  // Convert validation errors to footer format (combine legacy + smart validation)
  const validationErrors = useMemo(() => {
    const legacyErrors = validationErrorRules?.map(rule => ({
      id: rule.id,
      message: rule.label,
    })) || [];

    // Add smart validation missing fields as errors
    const smartErrors = [
      ...completionData.criticalMissing.map((field, i) => ({
        id: `smart-critical-${i}`,
        message: `Brak: ${field}`,
      })),
      ...completionData.recommendedMissing.map((field, i) => ({
        id: `smart-recommended-${i}`,
        message: `Sugerowane: ${field}`,
      })),
    ];

    // Deduplicate by message
    const combined = [...legacyErrors, ...smartErrors];
    const seen = new Set<string>();
    return combined.filter(err => {
      if (seen.has(err.message)) return false;
      seen.add(err.message);
      return true;
    });
  }, [validationErrorRules, completionData.criticalMissing, completionData.recommendedMissing]);

  // Can publish = smart validation says OK OR legacy validation says OK
  const canPublish = completionData.canPublish || legacyCanPublish;

  // Can approve = clinical checkbox + validation passed
  const canApprove = clinicalCheckboxChecked && canPublish;

  // ============================================
  // NAVIGATION
  // ============================================

  const getNextExerciseId = useCallback((): string | null => {
    if (currentIndex < 0 || currentIndex >= pendingExercises.length - 1) {
      return null;
    }
    return pendingExercises[currentIndex + 1]?.id || null;
  }, [currentIndex, pendingExercises]);

  // Prefetch next exercise
  const nextExerciseId = useMemo(() => getNextExerciseId(), [getNextExerciseId]);
  useEffect(() => {
    if (nextExerciseId) {
      router.prefetch(`/verification/${nextExerciseId}`);
    }
  }, [nextExerciseId, router]);

  // ============================================
  // MUTATIONS
  // ============================================

  const [approveExercise, { loading: approving }] = useMutation<ApproveExerciseResponse>(
    APPROVE_EXERCISE_MUTATION,
    {
      refetchQueries: [
        { query: GET_PENDING_EXERCISES_QUERY },
        { query: GET_VERIFICATION_STATS_QUERY },
      ],
    }
  );

  const [rejectExercise, { loading: rejecting }] = useMutation<RejectExerciseResponse>(
    REJECT_EXERCISE_MUTATION,
    {
      refetchQueries: [
        { query: GET_PENDING_EXERCISES_QUERY },
        { query: GET_VERIFICATION_STATS_QUERY },
      ],
    }
  );

  const [updateExerciseField] = useMutation(UPDATE_EXERCISE_FIELD_MUTATION, {
    onCompleted: () => {
      setLastSavedTime(new Date());
    },
    onError: (error) => {
      toast.error(`Błąd zapisu: ${error.message}`);
    },
  });

  // ============================================
  // HANDLERS
  // ============================================

  // Field update (inline editing)
  const handleFieldUpdate = useCallback(
    async (field: string, value: unknown) => {
      if (!exercise) return;

      setIsSavingDraft(true);
      try {
        await updateExerciseField({
          variables: {
            exerciseId: id,
            field,
            value,
          },
          optimisticResponse: {
            updateExerciseField: {
              __typename: "Exercise",
              id: exercise.id,
              [field]: value,
            },
          },
        });
        await refetch();
      } finally {
        setIsSavingDraft(false);
      }
    },
    [exercise, id, updateExerciseField, refetch]
  );

  // Tags handlers
  const handleMainTagsChange = useCallback(
    async (newTags: string[]) => {
      setMainTags(newTags);
      await handleFieldUpdate("mainTags", newTags);
    },
    [handleFieldUpdate]
  );

  const handleAdditionalTagsChange = useCallback(
    async (newTags: string[]) => {
      setAdditionalTags(newTags);
      await handleFieldUpdate("additionalTags", newTags);
    },
    [handleFieldUpdate]
  );

  // Relations handler
  const handleRelationsChange = useCallback(
    (relations: { regression: ExerciseRelationTarget | null; progression: ExerciseRelationTarget | null }) => {
      setRegressionExercise(relations.regression);
      setProgressionExercise(relations.progression);
    },
    []
  );

  // Completion change handler (from Smart Validation)
  const handleCompletionChange = useCallback(
    (completion: {
      percentage: number;
      canSaveDraft: boolean;
      canPublish: boolean;
      criticalMissing: string[];
      recommendedMissing: string[];
    }) => {
      setCompletionData(completion);
    },
    []
  );

  // Approve handler
  const handleApprove = useCallback(
    async (notes: string | null) => {
      try {
        await approveExercise({
          variables: { exerciseId: id, reviewNotes: notes },
        });
        toast.success("Ćwiczenie zostało zatwierdzone i opublikowane!");
        setIsApproveDialogOpen(false);

        // Auto-advance to next exercise or go back to list
        const nextId = getNextExerciseId();
        if (nextId) {
          router.push(`/verification/${nextId}`);
        } else {
          router.push("/verification");
        }
      } catch (err) {
        console.error("Błąd zatwierdzania:", err);
        toast.error("Nie udało się zatwierdzić ćwiczenia");
      }
    },
    [approveExercise, id, router, getNextExerciseId]
  );

  // Approve & Next (with checkbox validation)
  const handleApproveAndNext = useCallback(() => {
    if (!clinicalCheckboxChecked) {
      toast.error("Zaznacz checkbox potwierdzający poprawność kliniczną");
      return;
    }
    if (!canPublish) {
      toast.error("Popraw błędy walidacji przed zatwierdzeniem");
      return;
    }
    setIsApproveDialogOpen(true);
  }, [clinicalCheckboxChecked, canPublish]);

  // Reject handler
  const handleReject = useCallback(
    async (reason: RejectionReason, notes: string) => {
      try {
        const fullNotes = `[${reason}] ${notes}`;
        await rejectExercise({
          variables: { exerciseId: id, rejectionReason: fullNotes },
        });
        toast.success("Ćwiczenie zostało odrzucone z uwagami");
        setIsRejectDialogOpen(false);

        // Auto-advance to next exercise or go back to list
        const nextId = getNextExerciseId();
        if (nextId) {
          router.push(`/verification/${nextId}`);
        } else {
          router.push("/verification");
        }
      } catch (err) {
        console.error("Błąd odrzucania:", err);
        toast.error("Nie udało się odrzucić ćwiczenia");
      }
    },
    [rejectExercise, id, router, getNextExerciseId]
  );

  // Skip handler
  const handleSkip = useCallback(() => {
    const nextId = getNextExerciseId();
    if (nextId) {
      router.push(`/verification/${nextId}`);
    } else {
      router.push("/verification");
    }
  }, [router, getNextExerciseId]);

  // Save draft handler
  const handleSaveDraft = useCallback(() => {
    toast.success("Szkic zapisany");
    setLastSavedTime(new Date());
  }, []);

  // Toggle checkbox handler
  const handleToggleClinicalCheckbox = useCallback(() => {
    setClinicalCheckboxChecked(prev => !prev);
  }, []);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useVerificationHotkeys({
    onApproveAndNext: handleApproveAndNext,
    onReject: () => setIsRejectDialogOpen(true),
    onSaveDraft: handleSaveDraft,
    onSkip: handleSkip,
    onToggleClinicalCheckbox: handleToggleClinicalCheckbox,
    canApprove: canApprove,
    enabled: !isApproveDialogOpen && !isRejectDialogOpen,
  });

  // ============================================
  // RENDER STATES
  // ============================================

  // Access denied
  if (!roleLoading && !canReviewExercises) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={FileText}
          title="Brak dostępu"
          description="Nie masz uprawnień do weryfikacji ćwiczeń."
        />
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Left: Video skeleton */}
          <div className="flex-1 bg-zinc-950 p-3">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="w-full h-[calc(100%-3rem)] rounded-lg" />
          </div>
          {/* Right: Editor skeleton */}
          <div className="flex-1 p-3 space-y-3 border-l border-border/20">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error or not found
  if (error || !exercise) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={FileText}
          title="Nie znaleziono"
          description={error ? `Błąd: ${error.message}` : "Ćwiczenie nie istnieje."}
          action={
            <Button variant="outline" onClick={() => router.push("/verification")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do listy
            </Button>
          }
        />
      </div>
    );
  }

  // ============================================
  // MAIN RENDER - Zero Scroll Clinical Operator UI
  // ============================================

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
      {/* Main content area - 2 column layout, NO SCROLL */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* LEFT COLUMN: Master Video Player (flex-1, not fixed width) */}
        <div className="flex-1 bg-zinc-950 border-b lg:border-b-0 lg:border-r border-border/20 flex flex-col min-h-0">
          {/* Compact Header: Back + Progress */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-zinc-800/50 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/verification")}
              className="text-zinc-400 hover:text-white -ml-1 h-7 px-2"
              data-testid="verification-back-btn"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs">Powrót</span>
            </Button>

            {/* Progress indicator - compact */}
            {positionInQueue && totalPending > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">
                  <span className="text-zinc-200 font-semibold">{positionInQueue}</span>
                  <span className="text-zinc-500"> / </span>
                  <span className="text-zinc-200 font-semibold">{totalPending}</span>
                </span>
                <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(positionInQueue / totalPending) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Master Video Player - fills remaining space */}
          <div className="flex-1 min-h-0">
            <MasterVideoPlayer exercise={exercise} />
          </div>
        </div>

        {/* RIGHT COLUMN: Compact Editor Panel (flex-1, NO overflow-y-auto) */}
        <div className="flex-1 bg-background flex flex-col min-h-0 pb-16">
          <div className="flex-1 p-3 flex flex-col min-h-0 overflow-hidden">
            {/* Previous review notes (if any) - compact */}
            {exercise.adminReviewNotes && (
              <Card className="border-amber-500/30 bg-amber-500/5 mb-2 shrink-0">
                <CardContent className="p-2">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-600">Poprzednie uwagi:</p>
                      <p className="text-xs text-foreground line-clamp-2">{exercise.adminReviewNotes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MAIN: VerificationEditorPanel - Zero Scroll Compact */}
            <VerificationEditorPanel
              exercise={exercise}
              onFieldChange={handleFieldUpdate}
              mainTags={mainTags}
              onMainTagsChange={handleMainTagsChange}
              additionalTags={additionalTags}
              onAdditionalTagsChange={handleAdditionalTagsChange}
              onRelationsChange={handleRelationsChange}
              onCompletionChange={handleCompletionChange}
              className="flex-1 min-h-0"
              data-testid="verification-editor-panel"
            />
          </div>
        </div>
      </div>

      {/* FIXED FOOTER - Clinical Operator style */}
      <VerificationStickyFooterV2
        onReject={() => setIsRejectDialogOpen(true)}
        onSkip={handleSkip}
        onApproveAndNext={handleApproveAndNext}
        validationPassed={canPublish}
        validationErrors={validationErrors}
        clinicalCheckboxChecked={clinicalCheckboxChecked}
        onClinicalCheckboxChange={setClinicalCheckboxChecked}
        isRejecting={rejecting}
        isApproving={approving}
        remainingTasksCount={remainingCount}
        isSavingDraft={isSavingDraft}
        lastSavedTime={lastSavedTime}
      />

      {/* Dialogs */}
      <RejectReasonDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        onConfirm={handleReject}
        isLoading={rejecting}
        exerciseName={exercise.name}
      />

      <ApproveDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        onConfirm={handleApprove}
        isLoading={approving}
        exerciseName={exercise.name}
      />
    </div>
  );
}
