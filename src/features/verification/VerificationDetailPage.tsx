'use client';

import { use, useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { MasterVideoPlayer } from '@/features/verification/MasterVideoPlayer';
import { CollapsibleMediaPanel } from '@/features/verification/CollapsibleMediaPanel';
import { RejectReasonDialog } from '@/features/verification/RejectReasonDialog';
import { ApproveDialog } from '@/features/verification/ApproveDialog';

// Clinical Operator UI Components - 3-Column Layout
import { ExerciseEditor } from '@/features/exercises/ExerciseEditor';
import { useExerciseEditorForm } from '@/features/exercises/useExerciseEditorForm';
import { VerdictPanel } from '@/features/verification/VerdictPanel';
import { useExerciseValidation } from '@/features/verification/PublishGuardrails';
import { computeVerificationCompletion } from '@/features/verification/utils/computeVerificationCompletion';
import { buildQueueProgressModel } from '@/features/verification/utils/queueProgress';

import { useSystemRole } from '@/hooks/useSystemRole';
import { useVerificationHotkeys } from '@/hooks/useVerificationHotkeys';
import { getExerciseReports, resolveExerciseReports } from '@/services/exerciseReportService';
import {
  buildVerificationDetailHref,
  buildVerificationListHref,
  parseVerificationFilter,
} from '@/features/verification/utils/verificationPagination';

import {
  GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY,
  GET_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import {
  APPROVE_EXERCISE_MUTATION,
  REJECT_EXERCISE_MUTATION,
  UPDATE_EXERCISE_FIELD_MUTATION,
} from '@/graphql/mutations/adminExercises.mutations';
import {
  UPDATE_EXERCISE_MUTATION as UPDATE_EXERCISE_DETAILS_MUTATION,
  UPLOAD_EXERCISE_IMAGE_MUTATION,
  DELETE_EXERCISE_IMAGE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import type { ExerciseByIdForAdminResponse } from '@/types/apollo';
import type {
  AdminExercise,
  RejectionReason,
  ApproveExerciseResponse,
  RejectExerciseResponse,
  GetVerificationQueueNavigatorResponse,
  GetVerificationQueueNavigatorVariables,
  GetVerificationStatsResponse,
} from '@/graphql/types/adminExercise.types';
import type { ExerciseReport } from '@/types/exercise-report.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

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
export function VerificationDetailPage({ params }: Readonly<VerificationDetailPageProps>) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [openReports, setOpenReports] = useState<ExerciseReport[]>([]);

  // ============================================
  // QUERIES
  // ============================================

  const { data, loading, error, refetch } = useQuery<ExerciseByIdForAdminResponse>(GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY, {
    variables: { id },
  });

  // Reset safety checklist and comment when switching exercises
  useEffect(() => {
    if (data?.exerciseByIdForAdmin) {
      setSafetyChecklist({
        videoReadable: false,
        techniqueSafe: false,
        noContraindications: false,
      });
      setAuthorComment('');
    }
  }, [data?.exerciseByIdForAdmin]);

  const queueFilter = useMemo(() => {
    const normalized = parseVerificationFilter(searchParams.get('filter'));
    return normalized === 'reported' ? 'pending' : normalized;
  }, [searchParams]);
  const queueSearch = useMemo(() => searchParams.get('search') || null, [searchParams]);
  const listQueryString = useMemo(() => searchParams.toString(), [searchParams]);
  const listUrl = useMemo(() => {
    if (!listQueryString) {
      return '/verification';
    }
    const params = new URLSearchParams(listQueryString);
    const normalizedFilter = parseVerificationFilter(params.get('filter'));
    params.set('filter', normalizedFilter === 'reported' ? 'pending' : normalizedFilter);
    return buildVerificationListHref({
      filter: parseVerificationFilter(params.get('filter')),
      search: params.get('search') ?? '',
      page: Number(params.get('page') ?? '1'),
      pageSize: Number(params.get('pageSize') ?? '20'),
      view: params.get('view') === 'list' ? 'list' : 'grid',
    });
  }, [listQueryString]);
  const buildDetailUrl = useCallback(
    (exerciseId: string) =>
      listQueryString
        ? buildVerificationDetailHref(exerciseId, {
            filter: queueFilter,
            search: searchParams.get('search') ?? '',
            page: Number(searchParams.get('page') ?? '1'),
            pageSize: Number(searchParams.get('pageSize') ?? '20'),
            view: searchParams.get('view') === 'list' ? 'list' : 'grid',
          })
        : `/verification/${exerciseId}`,
    [listQueryString, queueFilter, searchParams]
  );

  const { data: queueNavigatorData } = useQuery<
    GetVerificationQueueNavigatorResponse,
    GetVerificationQueueNavigatorVariables
  >(GET_VERIFICATION_QUEUE_NAVIGATOR_QUERY, {
    variables: {
      currentExerciseId: id,
      filter: queueFilter,
      search: queueSearch,
    },
    skip: !canReviewExercises || !id,
    fetchPolicy: 'cache-and-network',
  });

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
  const navigator = queueNavigatorData?.verificationQueueNavigator;
  const totalPending = navigator?.totalInQueue ?? statsData?.verificationStats?.pendingReview ?? 0;
  const positionInQueue = navigator?.positionInQueue ?? null;
  const remainingCount = navigator?.remainingCount ?? Math.max(totalPending - (positionInQueue || 0), 0);
  const queueProgress = useMemo(() => {
    return buildQueueProgressModel(positionInQueue, totalPending, remainingCount);
  }, [positionInQueue, totalPending, remainingCount]);

  // Validation (using existing hook, based on raw exercise + tags as a legacy safety net)
  const { canPublish: legacyCanPublish, errors: _validationErrorRules } = useExerciseValidation(
    exercise || ({} as AdminExercise),
    { mainTags: exercise?.mainTags, additionalTags: exercise?.additionalTags }
  );

  // ============================================
  // NAVIGATION
  // ============================================

  const getNextExerciseId = useCallback((): string | null => {
    return navigator?.nextExerciseId ?? null;
  }, [navigator?.nextExerciseId]);

  // Prefetch next exercise
  const nextExerciseId = useMemo(() => getNextExerciseId(), [getNextExerciseId]);
  useEffect(() => {
    if (nextExerciseId) {
      router.prefetch(buildDetailUrl(nextExerciseId));
    }
  }, [nextExerciseId, router, buildDetailUrl]);

  // ============================================
  // MUTATIONS
  // ============================================

  const [approveExercise, { loading: approving }] = useMutation<ApproveExerciseResponse>(APPROVE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: GET_VERIFICATION_STATS_QUERY }],
  });

  const [rejectExercise, { loading: rejecting }] = useMutation<RejectExerciseResponse>(REJECT_EXERCISE_MUTATION, {
    refetchQueries: [{ query: GET_VERIFICATION_STATS_QUERY }],
  });

  const [updateExerciseField] = useMutation(UPDATE_EXERCISE_FIELD_MUTATION, {
    onError: (error) => {
      toast.error(`Błąd zapisu: ${error.message}`);
    },
  });
  const [updateExerciseDetails] = useMutation(UPDATE_EXERCISE_DETAILS_MUTATION, {
    onError: (error) => {
      toast.error(`Błąd zapisu: ${error.message}`);
    },
  });
  const [uploadExerciseImage] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION, {
    onError: (error) => {
      toast.error(`Błąd uploadu zdjęcia: ${error.message}`);
    },
  });
  const [deleteExerciseImage] = useMutation(DELETE_EXERCISE_IMAGE_MUTATION, {
    onError: (error) => {
      toast.error(`Błąd usuwania zdjęcia: ${error.message}`);
    },
  });

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = reject;
    });
  }, []);

  // ============================================
  // EXERCISE EDITOR FORM (autosave)
  // ============================================

  const updateCore = useCallback(
    async (variables: Record<string, unknown>) => {
      await updateExerciseDetails({ variables: { exerciseId: id, ...variables } });
    },
    [id, updateExerciseDetails]
  );

  const updateEnrichment = useCallback(
    async (payload: ExerciseEnrichmentData) => {
      await updateExerciseField({
        variables: { exerciseId: id, fieldName: 'enrichmentData', value: JSON.stringify(payload ?? {}) },
      });
    },
    [id, updateExerciseField]
  );

  const exerciseEditorForm = useExerciseEditorForm({
    source: exercise,
    updateCore,
    updateEnrichment,
    onError: () => toast.error('Nie udało się zapisać zmian'),
    autosaveDelayMs: 900,
  });
  const { core, flush: flushEditorForm } = exerciseEditorForm;

  const hasMedia = Boolean(
    exercise?.videoUrl || exercise?.gifUrl || exercise?.imageUrl || (exercise?.images && exercise.images.length > 0)
  );

  const completion = useMemo(
    () =>
      computeVerificationCompletion({
        name: core.name,
        patientDescription: core.patientDescription,
        clinicalDescription: core.clinicalDescription,
        sets: core.sets,
        reps: core.reps,
        executionTime: core.executionTime,
        duration: core.duration,
        hasMedia,
        mainTagsCount: exercise?.mainTags?.length ?? 0,
      }),
    [core, hasMedia, exercise?.mainTags]
  );

  // Can publish = smart validation says OK OR legacy validation says OK
  const canPublish = completion.isValid || legacyCanPublish;

  // Can approve = clinical checkbox + validation passed
  const canApprove = clinicalCheckboxChecked && canPublish;

  // ============================================
  // HANDLERS
  // ============================================

  const handleUploadImage = useCallback(
    async (file: File) => {
      if (!exercise) return;
      const base64Image = await fileToBase64(file);
      await uploadExerciseImage({
        variables: {
          exerciseId: exercise.id,
          base64Image,
          contentType: file.type,
        },
      });
      await refetch();
    },
    [exercise, fileToBase64, refetch, uploadExerciseImage]
  );

  const handleDeleteImage = useCallback(
    async (imageUrl: string) => {
      if (!exercise) return;
      await deleteExerciseImage({
        variables: {
          exerciseId: exercise.id,
          imageUrl,
        },
      });
      await refetch();
    },
    [deleteExerciseImage, exercise, refetch]
  );

  // Approve handler
  const handleApprove = useCallback(
    async (notes: string | null) => {
      // Lock UI immediately to prevent flash of unwanted state
      setIsTransitioning(true);

      try {
        await flushEditorForm();
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
          router.push(buildDetailUrl(nextId));
        } else {
          router.push(listUrl);
        }
      } catch (err) {
        console.error('Błąd zatwierdzania:', err);
        toast.error('Nie udało się zatwierdzić ćwiczenia');
        setIsTransitioning(false); // Unlock on error
      }
    },
    [approveExercise, flushEditorForm, id, router, getNextExerciseId, user?.id, buildDetailUrl, listUrl]
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
        await flushEditorForm();
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
          router.push(buildDetailUrl(nextId));
        } else {
          router.push(listUrl);
        }
      } catch (err) {
        console.error('Błąd odrzucania:', err);
        toast.error('Nie udało się odrzucić ćwiczenia');
      }
    },
    [rejectExercise, flushEditorForm, id, router, getNextExerciseId, user?.id, buildDetailUrl, listUrl]
  );

  // Skip handler
  const handleSkip = useCallback(() => {
    const nextId = getNextExerciseId();
    if (nextId) {
      router.push(buildDetailUrl(nextId));
    } else {
      router.push(listUrl);
    }
  }, [router, getNextExerciseId, buildDetailUrl, listUrl]);

  // Save draft handler (wymusza natychmiastowy zapis, pomijając debounce autosave)
  const handleSaveDraft = useCallback(() => {
    void flushEditorForm().then(() => toast.success('Zmiany zapisane'));
  }, [flushEditorForm]);

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
      <div className="-m-4 flex h-full lg:h-[calc(100%+3rem)] 2xl:h-[calc(100%+4rem)] min-h-0 flex-col overflow-y-auto lg:-m-6 lg:overflow-hidden 2xl:-m-8">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Left: Video skeleton (42%) */}
          <div className="lg:w-[42%] bg-card p-3 border-r border-border/30">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="w-full h-[calc(100%-3rem)] rounded-lg" />
          </div>
          {/* Middle: Editor skeleton (fluid) */}
          <div className="flex-1 p-3 space-y-3 border-r border-border/20">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          {/* Right: Verdict skeleton (320px) */}
          <div className="lg:w-[320px] lg:min-w-[320px] p-3 space-y-3 border-l border-border/30 bg-card/70">
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
          onAction={() => router.push(listUrl)}
        />
      </div>
    );
  }

  // ============================================
  // MAIN RENDER - 3-Column Verification Cockpit
  // ============================================

  return (
    <div className="-m-4 flex h-full lg:h-[calc(100%+3rem)] 2xl:h-[calc(100%+4rem)] min-h-0 flex-col overflow-y-auto lg:-m-6 lg:overflow-hidden 2xl:-m-8">
      {/* Main content area - 3 column layout 42/fluid/320 */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* LEFT COLUMN: Media Player (collapsible) */}
        <CollapsibleMediaPanel onBack={() => router.push(listUrl)}>
          {/* Compact Header: Back + Progress */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/40 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(listUrl)}
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
          <div className="flex-1 min-h-0 overflow-hidden p-3">
            <MasterVideoPlayer
              exercise={exercise}
              onUploadImage={handleUploadImage}
              onDeleteImage={handleDeleteImage}
            />
          </div>
        </CollapsibleMediaPanel>

        {/* MIDDLE COLUMN: Editor Panel */}
        <div className="flex-1 min-w-0 bg-background flex flex-col min-h-0 border-r border-border/20">
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

            {/* MAIN: shared ExerciseEditor (autosave) */}
            <ExerciseEditor
              form={exerciseEditorForm}
              showNameField
              aiFillContext={{
                name: core.name,
                patientDescription: core.patientDescription,
                clinicalDescription: core.clinicalDescription,
                type: exercise.type,
                mainTags: exercise.mainTags,
                additionalTags: exercise.additionalTags,
              }}
              showAdvancedJson
              className="flex-1 min-h-0"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Verdict Panel */}
        <div className="lg:w-[320px] lg:min-w-[320px] flex flex-col min-h-0">
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
            completionPercentage={completion.percentage}
            missingFields={completion.missingFields}
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
