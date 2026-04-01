'use client';

import { use, useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { MasterVideoPlayer } from '@/features/verification/MasterVideoPlayer';
import { RejectReasonDialog } from '@/features/verification/RejectReasonDialog';
import { ApproveDialog } from '@/features/verification/ApproveDialog';

// Clinical Operator UI Components - 3-Column Layout
import { VerificationEditorPanel } from '@/features/verification/VerificationEditorPanel';
import { VerdictPanel } from '@/features/verification/VerdictPanel';
import { useExerciseValidation } from '@/features/verification/PublishGuardrails';
import { buildQueueProgressModel } from '@/features/verification/utils/queueProgress';

import { useSystemRole } from '@/hooks/useSystemRole';
import { useVerificationHotkeys } from '@/hooks/useVerificationHotkeys';
import { getExerciseReports, resolveExerciseReports } from '@/services/exerciseReportService';

import {
  GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY,
  GET_PENDING_EXERCISES_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import {
  APPROVE_EXERCISE_MUTATION,
  REJECT_EXERCISE_MUTATION,
  UPDATE_EXERCISE_FIELD_MUTATION,
} from '@/graphql/mutations/adminExercises.mutations';
import { UPDATE_EXERCISE_MUTATION as UPDATE_EXERCISE_DETAILS_MUTATION } from '@/graphql/mutations/exercises.mutations';
import type { ExerciseByIdForAdminResponse } from '@/types/apollo';
import type {
  AdminExercise,
  RejectionReason,
  ApproveExerciseResponse,
  RejectExerciseResponse,
  GetPendingReviewExercisesResponse,
  GetVerificationStatsResponse,
  ExerciseRelationTarget,
} from '@/graphql/types/adminExercise.types';
import type { ExerciseReport } from '@/types/exercise-report.types';

interface VerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

interface DefaultLoadUpdateInput {
  type: string | null;
  value: number | null;
  unit: string | null;
  text: string | null;
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
export default function VerificationDetailPage({ params }: Readonly<VerificationDetailPageProps>) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { canReviewExercises, isLoading: roleLoading } = useSystemRole();

  // ============================================
  // STATE
  // ============================================

  // Dialog states
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  // Transition state - stays true after approval until redirect completes
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Safety checklist state (for VerdictPanel)
  const [safetyChecklist, setSafetyChecklist] = useState({
    videoReadable: false,
    techniqueSafe: false,
    noContraindications: false,
  });

  // Comment for author (for VerdictPanel)
  const [authorComment, setAuthorComment] = useState('');

  // Clinical safety checkbox (legacy - derived from checklist)
  const clinicalCheckboxChecked = Object.values(safetyChecklist).every(Boolean);

  // Tags state (for local editing before save)
  const [mainTags, setMainTags] = useState<string[]>([]);
  const [additionalTags, setAdditionalTags] = useState<string[]>([]);

  // Relations state
  const [, setRegressionExercise] = useState<ExerciseRelationTarget | null>(null);
  const [, setProgressionExercise] = useState<ExerciseRelationTarget | null>(null);

  // Save tracking
  const [, setLastSavedTime] = useState<Date | null>(null);
  const [, setIsSavingDraft] = useState(false);

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

  // Missing fields state (from new validation layer)
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [openReports, setOpenReports] = useState<ExerciseReport[]>([]);

  // ============================================
  // QUERIES
  // ============================================

  const { data, loading, error } = useQuery<ExerciseByIdForAdminResponse>(GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY, {
    variables: { id },
  });

  // Initialize tags when data loads
  useEffect(() => {
    if (data?.exerciseByIdForAdmin) {
      const ex = data.exerciseByIdForAdmin as unknown as AdminExercise;
      setMainTags(ex.mainTags || []);
      setAdditionalTags(ex.additionalTags || []);
      // Reset safety checklist when switching exercises
      setSafetyChecklist({
        videoReadable: false,
        techniqueSafe: false,
        noContraindications: false,
      });
      setAuthorComment('');
    }
  }, [data?.exerciseByIdForAdmin]);

  // Query for pending exercises (for progress indicator and auto-advance)
  const { data: pendingData } = useQuery<GetPendingReviewExercisesResponse>(GET_PENDING_EXERCISES_QUERY);

  // Query for stats
  const { data: statsData } = useQuery<GetVerificationStatsResponse>(GET_VERIFICATION_STATS_QUERY);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      const reports = await getExerciseReports({ exerciseId: id, status: 'OPEN' });
      if (!cancelled) {
        setOpenReports(reports);
      }
    };

    loadReports();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const exercise = data?.exerciseByIdForAdmin as unknown as AdminExercise | null;
  const latestReport = useMemo(() => {
    if (openReports.length === 0) {
      return null;
    }
    return [...openReports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }, [openReports]);

  // Progress tracking
  const pendingExercises = pendingData?.pendingReviewExercises || [];
  const currentIndex = pendingExercises.findIndex((ex) => ex.id === id);
  const totalPending = statsData?.verificationStats?.pendingReview || pendingExercises.length;
  const positionInQueue = currentIndex >= 0 ? currentIndex + 1 : null;
  const remainingCount = totalPending - (positionInQueue || 0);
  const queueProgress = useMemo(() => {
    return buildQueueProgressModel(positionInQueue, totalPending, remainingCount);
  }, [positionInQueue, totalPending, remainingCount]);

  // Validation (using existing hook)
  const { canPublish: legacyCanPublish, errors: _validationErrorRules } = useExerciseValidation(
    exercise || ({} as AdminExercise),
    { mainTags, additionalTags }
  );

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

  const [approveExercise, { loading: approving }] = useMutation<ApproveExerciseResponse>(APPROVE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: GET_PENDING_EXERCISES_QUERY }, { query: GET_VERIFICATION_STATS_QUERY }],
  });

  const [rejectExercise, { loading: rejecting }] = useMutation<RejectExerciseResponse>(REJECT_EXERCISE_MUTATION, {
    refetchQueries: [{ query: GET_PENDING_EXERCISES_QUERY }, { query: GET_VERIFICATION_STATS_QUERY }],
  });

  const [updateExerciseField] = useMutation(UPDATE_EXERCISE_FIELD_MUTATION, {
    onCompleted: () => {
      setLastSavedTime(new Date());
    },
    onError: (error) => {
      toast.error(`Błąd zapisu: ${error.message}`);
    },
  });
  const [updateExerciseDetails] = useMutation(UPDATE_EXERCISE_DETAILS_MUTATION, {
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
        if (field === 'defaultLoad') {
          const loadUpdate = value as DefaultLoadUpdateInput | null;
          await updateExerciseDetails({
            variables: {
              exerciseId: id,
              loadType: loadUpdate?.type ?? null,
              loadValue: loadUpdate?.value ?? null,
              loadUnit: loadUpdate?.unit ?? null,
              loadText: loadUpdate?.text ?? null,
            },
          });
          return;
        }

        // Convert value to string for backend (expects string?)
        let stringValue: string | null = null;
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            stringValue = value.join(',');
          } else if (typeof value === 'string') {
            stringValue = value;
          } else {
            stringValue = JSON.stringify(value);
          }
        }

        await updateExerciseField({
          variables: {
            exerciseId: id,
            fieldName: field,
            value: stringValue,
          },
        });
        // Note: Removed refetch() to prevent resetting local state in VerificationEditorPanel
        // The mutation updates the cache, and local state is managed optimistically
      } finally {
        setIsSavingDraft(false);
      }
    },
    [exercise, id, updateExerciseField, updateExerciseDetails]
  );

  // Tags handlers
  const handleMainTagsChange = useCallback(
    async (newTags: string[]) => {
      setMainTags(newTags);
      await handleFieldUpdate('mainTags', newTags);
    },
    [handleFieldUpdate]
  );

  const handleAdditionalTagsChange = useCallback(
    async (newTags: string[]) => {
      setAdditionalTags(newTags);
      await handleFieldUpdate('additionalTags', newTags);
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

  // Validation change handler (from new Clean Cockpit validation layer)
  const handleValidationChange = useCallback((_isValid: boolean, fields: string[]) => {
    setMissingFields(fields);
  }, []);

  // Approve handler
  const handleApprove = useCallback(
    async (notes: string | null) => {
      // Lock UI immediately to prevent flash of unwanted state
      setIsTransitioning(true);

      try {
        await approveExercise({
          variables: { exerciseId: id, reviewNotes: notes },
        });
        toast.success('Ćwiczenie zostało zatwierdzone i opublikowane!');
        if (user?.id) {
          await resolveExerciseReports({
            exerciseId: id,
            resolvedByUserId: user.id,
            resolutionNote: notes || 'Resolved during approve flow',
          }).catch(() => undefined);
        }
        setIsApproveDialogOpen(false);

        // Auto-advance to next exercise or go back to list
        // Note: isTransitioning stays true - redirect will unmount component
        const nextId = getNextExerciseId();
        if (nextId) {
          router.push(`/verification/${nextId}`);
        } else {
          router.push('/verification');
        }
      } catch (err) {
        console.error('Błąd zatwierdzania:', err);
        toast.error('Nie udało się zatwierdzić ćwiczenia');
        setIsTransitioning(false); // Unlock on error
      }
    },
    [approveExercise, id, router, getNextExerciseId, user?.id]
  );

  // Approve & Next (with checkbox validation)
  const handleApproveAndNext = useCallback(() => {
    if (!clinicalCheckboxChecked) {
      toast.error('Zaznacz checkbox potwierdzający poprawność kliniczną');
      return;
    }
    if (!canPublish) {
      toast.error('Popraw błędy walidacji przed zatwierdzeniem');
      return;
    }
    setIsApproveDialogOpen(true);
  }, [clinicalCheckboxChecked, canPublish]);

  // Reject handler
  const handleReject = useCallback(
    async (reason: RejectionReason, notesText: string) => {
      try {
        await rejectExercise({
          variables: { exerciseId: id, rejectionReason: reason, notes: notesText },
        });
        toast.success('Ćwiczenie zostało odrzucone z uwagami');
        if (user?.id) {
          await resolveExerciseReports({
            exerciseId: id,
            resolvedByUserId: user.id,
            resolutionNote: notesText,
          }).catch(() => undefined);
        }
        setIsRejectDialogOpen(false);

        // Auto-advance to next exercise or go back to list
        const nextId = getNextExerciseId();
        if (nextId) {
          router.push(`/verification/${nextId}`);
        } else {
          router.push('/verification');
        }
      } catch (err) {
        console.error('Błąd odrzucania:', err);
        toast.error('Nie udało się odrzucić ćwiczenia');
      }
    },
    [rejectExercise, id, router, getNextExerciseId, user?.id]
  );

  // Skip handler
  const handleSkip = useCallback(() => {
    const nextId = getNextExerciseId();
    if (nextId) {
      router.push(`/verification/${nextId}`);
    } else {
      router.push('/verification');
    }
  }, [router, getNextExerciseId]);

  // Save draft handler
  const handleSaveDraft = useCallback(() => {
    toast.success('Szkic zapisany');
    setLastSavedTime(new Date());
  }, []);

  // Toggle all safety checkboxes handler (for keyboard shortcut)
  const handleToggleClinicalCheckbox = useCallback(() => {
    const allChecked = Object.values(safetyChecklist).every(Boolean);
    setSafetyChecklist({
      videoReadable: !allChecked,
      techniqueSafe: !allChecked,
      noContraindications: !allChecked,
    });
  }, [safetyChecklist]);

  // Handle request changes (send back to author)
  const handleRequestChanges = useCallback(async () => {
    if (!authorComment.trim()) {
      toast.error('Wpisz komentarz dla autora');
      return;
    }
    setIsRejectDialogOpen(true);
  }, [authorComment]);

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
        <EmptyState icon={FileText} title="Brak dostępu" description="Nie masz uprawnień do weryfikacji ćwiczeń." />
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="-m-4 flex h-full min-h-0 flex-col overflow-y-auto lg:-m-6 lg:overflow-hidden 2xl:-m-8">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Left: Video skeleton (40%) */}
          <div className="lg:w-[40%] bg-card p-3 border-r border-border/30">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="w-full h-[calc(100%-3rem)] rounded-lg" />
          </div>
          {/* Middle: Editor skeleton (35%) */}
          <div className="lg:w-[35%] p-3 space-y-3 border-l border-border/20">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          {/* Right: Verdict skeleton (25%) */}
          <div className="lg:w-[25%] p-3 space-y-3 border-l border-border/30 bg-card/70">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
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
          description={error ? `Błąd: ${error.message}` : 'Ćwiczenie nie istnieje.'}
          actionLabel="Wróć do listy"
          onAction={() => router.push('/verification')}
        />
      </div>
    );
  }

  // ============================================
  // MAIN RENDER - 3-Column Verification Cockpit
  // ============================================

  return (
    <div className="-m-4 flex h-full min-h-0 flex-col overflow-y-auto lg:-m-6 lg:overflow-hidden 2xl:-m-8">
      {/* Main content area - 3 column layout 40/35/25 */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* LEFT COLUMN: Media Player (40% on desktop) */}
        <div className="h-[30vh] lg:h-auto lg:w-[40%] bg-card border-b lg:border-b-0 lg:border-r border-border/30 flex flex-col min-h-0">
          {/* Compact Header: Back + Progress */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/40 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/verification')}
              className="-ml-2 h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent"
              data-testid="verification-back-btn"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="text-sm">Powrót</span>
            </Button>

            {/* Progress indicator */}
            {queueProgress && (
              <div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-foreground">{queueProgress.summary}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{queueProgress.details}</p>
                </div>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${queueProgress.progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Master Video Player */}
          <div className="flex-1 min-h-0">
            <MasterVideoPlayer exercise={exercise} />
          </div>
        </div>

        {/* MIDDLE COLUMN: Editor Panel (35% on desktop) */}
        <div className="flex-1 lg:w-[35%] bg-background flex flex-col min-h-0 border-r border-border/20">
          <div className="flex-1 p-4 pr-5 lg:p-5 lg:pr-6 flex flex-col min-h-0 overflow-y-auto">
            {/* Previous review notes (if any) */}
            {exercise.adminReviewNotes && (
              <Card className="border-amber-500/30 bg-amber-500/5 mb-4 shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-amber-600">Poprzednie uwagi:</p>
                      <p className="text-sm text-foreground mt-1">{exercise.adminReviewNotes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MAIN: VerificationEditorPanel */}
            <VerificationEditorPanel
              exercise={exercise}
              onFieldChange={handleFieldUpdate}
              mainTags={mainTags}
              onMainTagsChange={handleMainTagsChange}
              additionalTags={additionalTags}
              onAdditionalTagsChange={handleAdditionalTagsChange}
              onRelationsChange={handleRelationsChange}
              onValidationChange={handleValidationChange}
              onCompletionChange={handleCompletionChange}
              className="flex-1 min-h-0"
              data-testid="verification-editor-panel"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Verdict Panel (25% on desktop) */}
        <div className="lg:w-[25%] min-w-[280px] flex flex-col min-h-0">
          <VerdictPanel
            status={exercise.status}
            submittedAt={exercise.createdAt}
            onApprove={handleApproveAndNext}
            onRequestChanges={handleRequestChanges}
            onReject={() => setIsRejectDialogOpen(true)}
            onSkip={handleSkip}
            comment={authorComment}
            onCommentChange={setAuthorComment}
            validationPassed={canPublish}
            missingFields={missingFields}
            safetyChecklist={safetyChecklist}
            onSafetyChecklistChange={setSafetyChecklist}
            isApproving={approving || isTransitioning}
            isRejecting={rejecting}
            remainingCount={remainingCount}
            reportContext={
              latestReport
                ? {
                    count: openReports.length,
                    reasonCategory: latestReport.reasonCategory,
                    description: latestReport.description,
                    reporterName: latestReport.reportedBy.name,
                    createdAt: latestReport.createdAt,
                    routingTarget: latestReport.routingTarget,
                  }
                : undefined
            }
            className="flex-1"
          />
        </div>
      </div>

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
