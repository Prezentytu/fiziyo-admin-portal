"use client";

import { use, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MobileSimulator } from "@/components/verification/MobileSimulator";
import { QualityChecklist, type QualityChecks } from "@/components/verification/QualityChecklist";
import { RejectReasonDialog } from "@/components/verification/RejectReasonDialog";
import { ApproveDialog } from "@/components/verification/ApproveDialog";

// NEW Inline Editing Components
import { ExerciseDetailsPanel } from "@/components/verification/ExerciseDetailsPanel";
import { TagSmartChips } from "@/components/verification/TagSmartChips";
import { InlineDescription } from "@/components/verification/InlineDescription";
import { RelationshipManager } from "@/components/verification/RelationshipManager";
import { VerificationStickyFooterV2 } from "@/components/verification/VerificationStickyFooterV2";
import { PublishGuardrails, useExerciseValidation } from "@/components/verification/PublishGuardrails";

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

export default function VerificationDetailPage({ params }: VerificationDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { canReviewExercises, isLoading: roleLoading } = useSystemRole();

  // State
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [qualityChecks, setQualityChecks] = useState<QualityChecks>({
    clinicallyCorrect: null,
    mediaQuality: null,
    descriptionComplete: null,
    tagsAppropriate: null,
  });

  // Tags state (for local editing)
  const [mainTags, setMainTags] = useState<string[]>([]);
  const [additionalTags, setAdditionalTags] = useState<string[]>([]);

  // Relations state
  const [regressionExercise, setRegressionExercise] = useState<ExerciseRelationTarget | null>(null);
  const [progressionExercise, setProgressionExercise] = useState<ExerciseRelationTarget | null>(null);

  // Save tracking
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Queries
  const { data, loading, error, refetch } = useQuery<ExerciseByIdResponse>(GET_EXERCISE_BY_ID_QUERY, {
    variables: { id },
  });

  // Initialize tags when data loads
  useEffect(() => {
    if (data?.exerciseById) {
      const ex = data.exerciseById as unknown as AdminExercise;
      setMainTags(ex.mainTags || []);
      setAdditionalTags(ex.additionalTags || []);
    }
  }, [data?.exerciseById]);

  // Query for pending exercises (for progress indicator and auto-advance)
  const { data: pendingData } = useQuery<GetPendingReviewExercisesResponse>(GET_PENDING_EXERCISES_QUERY);

  // Query for stats
  const { data: statsData } = useQuery<GetVerificationStatsResponse>(GET_VERIFICATION_STATS_QUERY);

  // Calculate progress
  const pendingExercises = pendingData?.pendingReviewExercises || [];
  const currentIndex = pendingExercises.findIndex((ex) => ex.id === id);
  const totalPending = statsData?.verificationStats?.pendingReview || pendingExercises.length;
  const positionInQueue = currentIndex >= 0 ? currentIndex + 1 : null;
  const remainingCount = totalPending - (positionInQueue || 0);

  // Get next exercise ID for auto-advance
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

  // Mutations
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

  const exercise = data?.exerciseById as unknown as AdminExercise | null;

  // Validation
  const { canPublish, hasBlockingErrors, validationRules, validationResults } = useExerciseValidation(
    exercise || ({} as AdminExercise)
  );

  // Check if all quality checks are passed
  const allChecksPassed = Object.values(qualityChecks).every((v) => v === true);
  const canApprove = allChecksPassed && canPublish;

  // Handle field update (inline editing)
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

  // Handle tags update
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

  // Relations change handler
  const handleRelationsChange = useCallback(
    (relations: { regression: ExerciseRelationTarget | null; progression: ExerciseRelationTarget | null }) => {
      setRegressionExercise(relations.regression);
      setProgressionExercise(relations.progression);
    },
    []
  );

  // Handlers with auto-advance
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

  const handleApproveAndNext = useCallback(() => {
    if (canApprove) {
      setIsApproveDialogOpen(true);
    } else {
      toast.error("Sprawdź wymagania przed zatwierdzeniem");
    }
  }, [canApprove]);

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

  const handleSkip = useCallback(() => {
    const nextId = getNextExerciseId();
    if (nextId) {
      router.push(`/verification/${nextId}`);
    } else {
      router.push("/verification");
    }
  }, [router, getNextExerciseId]);

  const handleSaveDraft = useCallback(() => {
    toast.success("Szkic zapisany");
    setLastSavedTime(new Date());
  }, []);

  // Keyboard shortcuts
  useVerificationHotkeys({
    onApproveAndNext: handleApproveAndNext,
    onReject: () => setIsRejectDialogOpen(true),
    onSaveDraft: handleSaveDraft,
    onSkip: handleSkip,
    canApprove: canApprove,
    enabled: !isApproveDialogOpen && !isRejectDialogOpen,
  });

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
      <div className="min-h-[calc(100vh-4rem)] flex flex-col -m-6">
        <div className="flex-1 flex flex-col lg:flex-row">
          <div className="w-full lg:w-[420px] bg-zinc-950 p-4 sm:p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border/20">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-center">
              <Skeleton className="w-[280px] h-[560px] rounded-[2.5rem]" />
            </div>
          </div>
          <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col -m-6">
      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Column: Mobile Preview */}
        <div className="w-full lg:w-[420px] bg-zinc-950 border-b lg:border-b-0 lg:border-r border-border/20 flex-shrink-0">
          <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
            {/* Progress indicator + Back button */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/verification")}
                className="text-zinc-400 hover:text-white -ml-2"
                data-testid="verification-back-btn"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrót do listy
              </Button>

              {/* Progress indicator */}
              {positionInQueue && totalPending > 0 && (
                <div className="flex items-center gap-2 text-right">
                  <div className="text-xs text-zinc-500">
                    <span className="text-zinc-300 font-semibold">{positionInQueue}</span>
                    <span> z </span>
                    <span className="text-zinc-300 font-semibold">{totalPending}</span>
                    <span className="ml-1 hidden sm:inline">oczekujących</span>
                  </div>
                  <div className="w-16 sm:w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(positionInQueue / totalPending) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Phone simulator - always centered */}
            <div className="flex-1 flex items-start justify-center">
              <MobileSimulator exercise={exercise} />
            </div>
          </div>
        </div>

        {/* Right Column: Expert Panel (NEW Inline Editing) */}
        <div className="flex-1 bg-background overflow-y-auto pb-24">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header with status */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  variant="outline"
                  className={
                    exercise.status === "PENDING_REVIEW"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : exercise.status === "CHANGES_REQUESTED"
                      ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {exercise.status === "PENDING_REVIEW"
                    ? "Oczekuje na weryfikację"
                    : exercise.status === "CHANGES_REQUESTED"
                    ? "Wymaga poprawek"
                    : exercise.status}
                </Badge>
                {exercise.createdBy && (
                  <span className="text-sm text-muted-foreground">
                    Autor: {exercise.createdBy.fullname || exercise.createdBy.email}
                  </span>
                )}
              </div>
            </div>

            {/* Previous review notes */}
            {exercise.adminReviewNotes && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 mb-1">
                        Poprzednie uwagi weryfikatora:
                      </p>
                      <p className="text-sm text-foreground">{exercise.adminReviewNotes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NEW: Exercise Details Panel (Inline Editing) */}
            <ExerciseDetailsPanel
              exercise={exercise}
              onFieldChange={handleFieldUpdate}
              data-testid="verification-details-panel"
            />

            {/* Quality Checklist */}
            <QualityChecklist
              exercise={exercise}
              checks={qualityChecks}
              onChecksChange={setQualityChecks}
            />

            {/* NEW: Tag Smart Chips (Main Tags) */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-4">
                <TagSmartChips
                  exerciseId={exercise.id}
                  exerciseName={exercise.name}
                  exerciseDescription={exercise.patientDescription || exercise.description}
                  tags={mainTags}
                  onTagsChange={handleMainTagsChange}
                  tagType="main"
                  label="Tagi główne (anatomiczne)"
                  data-testid="verification-main-tags"
                />

                <TagSmartChips
                  exerciseId={exercise.id}
                  exerciseName={exercise.name}
                  exerciseDescription={exercise.patientDescription || exercise.description}
                  tags={additionalTags}
                  onTagsChange={handleAdditionalTagsChange}
                  tagType="additional"
                  label="Tagi dodatkowe"
                  data-testid="verification-additional-tags"
                />
              </CardContent>
            </Card>

            {/* NEW: Inline Description */}
            <InlineDescription
              exerciseId={exercise.id}
              exerciseName={exercise.name}
              label="Opis dla pacjenta"
              value={exercise.patientDescription || exercise.description || ""}
              onCommit={(value) => handleFieldUpdate("patientDescription", value)}
              placeholder="Prosty, zrozumiały opis dla pacjenta..."
              data-testid="verification-description"
            />

            {/* NEW: Relationship Manager (Knowledge Graph) */}
            <RelationshipManager
              exercise={exercise}
              onRelationsChange={handleRelationsChange}
              data-testid="verification-relationships"
            />

            {/* NEW: Publish Guardrails */}
            <PublishGuardrails
              exercise={exercise}
              validationRules={validationRules}
            />
          </div>
        </div>
      </div>

      {/* NEW: Sticky Footer V2 */}
      <VerificationStickyFooterV2
        onReject={() => setIsRejectDialogOpen(true)}
        onSkip={handleSkip}
        onApproveAndNext={handleApproveAndNext}
        isRejecting={rejecting}
        isApproving={approving}
        canApprove={canApprove}
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
