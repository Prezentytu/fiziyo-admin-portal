'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { MediaGallery, buildMediaItems } from '@/components/shared';
import { PageSheet } from '@/components/shared/page';
import { useExerciseEditorForm } from '@/features/exercises/useExerciseEditorForm';
import { useExerciseImageGeneration } from '@/features/exercises/useExerciseImageGeneration';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';

import { useVerificationHotkeys } from '@/hooks/useVerificationHotkeys';
import { aiService } from '@/services/aiService';
import { resolveExerciseReports } from '@/services/exerciseReportService';

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
import { GET_VERIFICATION_STATS_QUERY } from '@/graphql/queries/adminExercises.queries';

import { getMediaUrls } from '@/utils/mediaUrl';
import type {
  AdminExercise,
  ApproveExerciseResponse,
  RejectExerciseResponse,
} from '@/graphql/types/adminExercise.types';
import type { ExerciseEnrichmentData, ExerciseEnrichmentPatientV3 } from '@/graphql/types/exerciseEnrichment.types';
import type { ExerciseReport, ExerciseReportReasonCategory } from '@/types/exercise-report.types';

import { DecisionStage, type DecisionRow } from './stages/DecisionStage';
import { DuplicateDialog, type DuplicateTarget } from './stages/DuplicateDialog';
import { InstructionStage } from './stages/InstructionStage';
import { MaterialStage, type PendingPhoto } from './stages/MaterialStage';
import { ParametersStage } from './stages/ParametersStage';
import { PhotoReplaceDialog } from './stages/PhotoReplaceDialog';
import { SafetyStage } from './stages/SafetyStage';
import { VerificationFloatingBar } from './stages/VerificationFloatingBar';
import { VerificationStageNav, type StageNavItem, type StageNavState } from './stages/VerificationStageNav';
import { summarizeChanges, type ChangeSnapshot } from './utils/changeSummary';
import {
  applyInstructionProposal,
  buildInstructionProposal,
  type InstructionProposal,
} from './utils/instructionProposal';
import {
  buildPatientParameterLine,
  deriveExecutionMode,
  evaluateParameters,
  findHardcodedNumbers,
  formatSessionDuration,
  planModeSwitch,
  replaceHardcodedNumbers,
  toParameterValues,
  type AcknowledgeKey,
  type ExecutionMode,
  type ModeStash,
  type ParameterKey,
} from './utils/parameterRules';
import { validatePhotoFile } from './utils/photoValidation';
import { keepExistingImages, replaceLinkedImage } from './utils/stepMedia';
import {
  STAGE_TITLES,
  VERIFICATION_STAGES,
  canDecideOnExercise,
  computeVerificationStages,
  formatStageCount,
  parseStopIf,
  pluralizePl,
  type VerificationStageKey,
} from './utils/verificationStages';

const MAX_PHOTOS = 5;

const PRIMARY_LABELS: Record<VerificationStageKey, string> = {
  material: 'Materiał gotowy, dalej',
  parameters: 'Parametry gotowe, dalej',
  instruction: 'Instrukcja gotowa, dalej',
  safety: 'Bezpieczeństwo gotowe, dalej',
  decision: 'Zatwierdź i opublikuj',
};

const REPORT_STAGE: Record<ExerciseReportReasonCategory, VerificationStageKey> = {
  WRONG_DESCRIPTION: 'instruction',
  WRONG_MEDIA: 'material',
  CLINICAL_RISK: 'safety',
  DUPLICATE: 'decision',
  OUTDATED_CONTENT: 'instruction',
  NEEDS_IMPROVEMENT: 'parameters',
  OTHER: 'parameters',
};

interface VerificationWorkspaceProps {
  exercise: AdminExercise;
  queuePosition: number | null;
  queueTotal: number;
  nextExerciseId: string | null;
  openReports: ExerciseReport[];
  listUrl: string;
  buildDetailUrl: (exerciseId: string) => string;
  reloadImages: () => Promise<string[]>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Nie udało się odczytać pliku'));
    reader.readAsDataURL(file);
  });
}

function SaveStatus({ status }: Readonly<{ status: 'idle' | 'saving' | 'success' | 'error' }>) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-label-secondary" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Zapisywanie…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="text-[13px] font-semibold text-status-danger" role="status">
        Nie zapisano zmian
      </span>
    );
  }
  if (status === 'success') {
    return (
      <span className="text-[13px] text-label-secondary" role="status">
        Zapisano
      </span>
    );
  }
  return null;
}

export function VerificationWorkspace({
  exercise,
  queuePosition,
  queueTotal,
  nextExerciseId,
  openReports,
  listUrl,
  buildDetailUrl,
  reloadImages,
}: VerificationWorkspaceProps) {
  const router = useRouter();
  const { user } = useUser();
  const rootRef = useRef<HTMLDivElement | null>(null);

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
    onError: (error) => toast.error(`Błąd zapisu: ${error.message}`),
  });
  const [updateExerciseDetails] = useMutation(UPDATE_EXERCISE_DETAILS_MUTATION, {
    onError: (error) => toast.error(`Błąd zapisu: ${error.message}`),
  });
  const [uploadExerciseImage] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION, {
    onError: (error) => toast.error(`Błąd uploadu zdjęcia: ${error.message}`),
  });
  const [deleteExerciseImage] = useMutation(DELETE_EXERCISE_IMAGE_MUTATION, {
    onError: (error) => toast.error(`Błąd usuwania zdjęcia: ${error.message}`),
  });

  // ============================================
  // FORM (autosave)
  // ============================================

  const updateCore = useCallback(
    async (variables: Record<string, unknown>) => {
      await updateExerciseDetails({ variables: { exerciseId: exercise.id, ...variables } });
    },
    [exercise.id, updateExerciseDetails]
  );

  const updateEnrichment = useCallback(
    async (payload: ExerciseEnrichmentData) => {
      await updateExerciseField({
        variables: { exerciseId: exercise.id, fieldName: 'enrichmentData', value: JSON.stringify(payload ?? {}) },
      });
    },
    [exercise.id, updateExerciseField]
  );

  const form = useExerciseEditorForm({
    source: exercise,
    updateCore,
    updateEnrichment,
    onError: () => toast.error('Nie udało się zapisać zmian'),
    autosaveDelayMs: 900,
  });
  const { core, enrichment, setCoreField, setEnrichmentPath, flush } = form;
  const patient = useMemo<ExerciseEnrichmentPatientV3>(() => enrichment.patient ?? {}, [enrichment.patient]);

  // ============================================
  // STATE
  // ============================================

  const [stage, setStage] = useState<VerificationStageKey>('material');
  const [visited, setVisited] = useState<ReadonlySet<VerificationStageKey>>(() => new Set(['material']));
  const [mode, setMode] = useState<ExecutionMode>(() => deriveExecutionMode(core));
  const [modeStash, setModeStash] = useState<ModeStash>({});
  const [isHoldPending, setIsHoldPending] = useState(false);
  const [acknowledged, setAcknowledged] = useState<ReadonlySet<AcknowledgeKey>>(() => new Set());
  const [descriptionAcknowledged, setDescriptionAcknowledged] = useState(false);
  const [proposal, setProposal] = useState<InstructionProposal | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [photoDialogIndex, setPhotoDialogIndex] = useState<number | null>(null);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [replacedPhotoCount, setReplacedPhotoCount] = useState(0);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const lastPhotoRequestRef = useRef<{ index: number; problems: string[]; note: string } | null>(null);

  const imageGeneration = useExerciseImageGeneration({ showSuccessToast: false });

  // ============================================
  // DERIVED
  // ============================================

  const photos = useMemo(() => (exercise.images ?? []).filter((url) => url.trim().length > 0), [exercise.images]);
  const allMediaUrls = useMemo(
    () => getMediaUrls([exercise.thumbnailUrl, exercise.imageUrl, ...(exercise.images ?? [])]),
    [exercise.thumbnailUrl, exercise.imageUrl, exercise.images]
  );
  const hasVideo = Boolean(core.videoUrl.trim() || exercise.gifUrl);

  const mediaItems = useMemo(
    () =>
      buildMediaItems({
        thumbnailUrl: exercise.thumbnailUrl,
        imageUrl: exercise.imageUrl,
        images: exercise.images,
        videoUrl: core.videoUrl.trim() || exercise.videoUrl,
        gifUrl: exercise.gifUrl,
        title: core.name,
      }),
    [
      exercise.thumbnailUrl,
      exercise.imageUrl,
      exercise.images,
      exercise.videoUrl,
      exercise.gifUrl,
      core.videoUrl,
      core.name,
    ]
  );

  const parameterValues = useMemo(() => {
    const values = toParameterValues(core, mode);
    return isHoldPending ? { ...values, hold: null } : values;
  }, [core, isHoldPending, mode]);
  const evaluation = useMemo(
    () => evaluateParameters({ values: parameterValues, mode, side: core.side, acknowledged }),
    [parameterValues, mode, core.side, acknowledged]
  );
  const descriptionNumbers = useMemo(
    () => (descriptionAcknowledged ? [] : findHardcodedNumbers(core.patientDescription)),
    [descriptionAcknowledged, core.patientDescription]
  );
  const stopIfCount = parseStopIf(enrichment.safety?.stop_if).length;

  const stages = useMemo(
    () =>
      computeVerificationStages({
        name: core.name,
        patientDescription: core.patientDescription,
        therapistDescription: core.clinicalDescription,
        hasVideo,
        imageCount: allMediaUrls.length,
        pendingPhotoCount: pendingPhoto ? 1 : 0,
        parameters: evaluation,
        descriptionNumberCount: descriptionNumbers.length,
        pendingProposalCount: proposal ? 1 : 0,
        stopIfCount,
      }),
    [
      core.name,
      core.patientDescription,
      core.clinicalDescription,
      hasVideo,
      allMediaUrls.length,
      pendingPhoto,
      evaluation,
      descriptionNumbers.length,
      proposal,
      stopIfCount,
    ]
  );

  const [initialSnapshot] = useState<ChangeSnapshot>(() => ({
    name: core.name,
    patientDescription: core.patientDescription,
    therapistDescription: core.clinicalDescription,
    sets: core.sets,
    reps: core.reps,
    executionTime: core.executionTime,
    restSets: core.restSets,
    side: core.side,
    videoUrl: core.videoUrl,
    imageCount: photos.length,
    enrichment,
  }));

  const changes = useMemo(
    () =>
      summarizeChanges(
        initialSnapshot,
        {
          name: core.name,
          patientDescription: core.patientDescription,
          therapistDescription: core.clinicalDescription,
          sets: core.sets,
          reps: core.reps,
          executionTime: core.executionTime,
          restSets: core.restSets,
          side: core.side,
          videoUrl: core.videoUrl,
          imageCount: photos.length,
          enrichment,
        },
        replacedPhotoCount
      ),
    [initialSnapshot, core, photos.length, enrichment, replacedPhotoCount]
  );

  const latestReport = useMemo(
    () =>
      openReports.length === 0 ? null : [...openReports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [openReports]
  );

  // ============================================
  // NAVIGATION
  // ============================================

  const goToStage = useCallback((key: VerificationStageKey) => {
    setStage(key);
    setVisited((previous) => new Set([...previous, key]));
    rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  const leaveToNext = useCallback(() => {
    router.push(nextExerciseId ? buildDetailUrl(nextExerciseId) : listUrl);
  }, [buildDetailUrl, listUrl, nextExerciseId, router]);

  const resolveReports = useCallback(
    async (note: string) => {
      if (!user?.id || openReports.length === 0) return;
      await resolveExerciseReports({
        exerciseId: exercise.id,
        resolvedByUserId: user.id,
        resolutionNote: note,
      }).catch(() => undefined);
    },
    [exercise.id, openReports.length, user?.id]
  );

  // ============================================
  // HANDLERS: parameters
  // ============================================

  const handleParameterChange = useCallback(
    (key: ParameterKey, value: number | null) => {
      if (key === 'sets') setCoreField('sets', value);
      if (key === 'reps') setCoreField('reps', value);
      if (key === 'repTime') setCoreField('executionTime', value);
      if (key === 'rest') setCoreField('restSets', value);
      if (key === 'hold') {
        setCoreField('executionTime', value);
        if (core.reps !== 1) setCoreField('reps', 1);
        setIsHoldPending(false);
      }
      setAcknowledged((previous) => {
        if (!previous.has(key) && !previous.has('session')) return previous;
        const next = new Set(previous);
        next.delete(key);
        next.delete('session');
        return next;
      });
    },
    [core.reps, setCoreField]
  );

  const handleModeChange = useCallback(
    (nextMode: ExecutionMode) => {
      if (nextMode === mode) return;
      const plan = planModeSwitch({
        current: core,
        from: mode,
        to: nextMode,
        stash: modeStash,
        isCurrentPending: isHoldPending,
      });
      if (plan.values) {
        if (plan.values.reps !== core.reps) setCoreField('reps', plan.values.reps);
        if (plan.values.executionTime !== core.executionTime) {
          setCoreField('executionTime', plan.values.executionTime);
        }
      }
      setModeStash(plan.stash);
      setIsHoldPending(nextMode === 'hold' && plan.values === null);
      setMode(nextMode);
      setAcknowledged(new Set());
    },
    [core, isHoldPending, mode, modeStash, setCoreField]
  );

  // ============================================
  // HANDLERS: photos
  // ============================================

  const replacePhotoAt = useCallback(
    async (index: number, dataUrl: string) => {
      const previousUrl = photos[index];
      if (!previousUrl) return;
      setIsSavingPhoto(true);
      try {
        await flush();
        const nextImages = photos.map((url, imageIndex) => (imageIndex === index ? dataUrl : url));
        await updateExerciseDetails({ variables: { exerciseId: exercise.id, images: nextImages } });
        const savedImages = await reloadImages();
        const nextUrl = savedImages[index];
        if (nextUrl && nextUrl !== previousUrl) {
          setEnrichmentPath('patient.step_images', replaceLinkedImage(patient.step_images, previousUrl, nextUrl));
          if (!savedImages.includes(previousUrl)) {
            await deleteExerciseImage({ variables: { exerciseId: exercise.id, imageUrl: previousUrl } }).catch(
              () => undefined
            );
          }
        }
        setPendingPhoto(null);
        setReplacedPhotoCount((count) => count + 1);
        toast.success(`Zdjęcie ${index + 1} wymienione`);
      } catch (error) {
        console.error('Błąd wymiany zdjęcia:', error);
        toast.error('Nie udało się wymienić zdjęcia');
      } finally {
        setIsSavingPhoto(false);
      }
    },
    [
      deleteExerciseImage,
      exercise.id,
      flush,
      patient.step_images,
      photos,
      reloadImages,
      setEnrichmentPath,
      updateExerciseDetails,
    ]
  );

  const generatePhoto = useCallback(
    async (index: number, problems: string[], note: string) => {
      lastPhotoRequestRef.current = { index, problems, note };
      setPhotoDialogIndex(null);
      setGeneratingIndex(index);
      const corrections = [problems.length > 0 ? `Popraw: ${problems.join(', ')}.` : '', note]
        .filter(Boolean)
        .join(' ');
      const file = await imageGeneration.generate({
        exerciseName: core.name,
        exerciseDescription: [core.patientDescription, corrections].filter(Boolean).join(' '),
        exerciseType: mode === 'hold' ? 'time' : 'reps',
      });
      setGeneratingIndex(null);
      if (!file) return;
      const previewUrl = await fileToDataUrl(file);
      setPendingPhoto({ index, previewUrl });
    },
    [core.name, core.patientDescription, imageGeneration, mode]
  );

  const handleRetryPhoto = useCallback(() => {
    const last = lastPhotoRequestRef.current;
    if (last) void generatePhoto(last.index, last.problems, last.note);
  }, [generatePhoto]);

  const handleUploadOwnPhoto = useCallback(
    async (file: File) => {
      const index = photoDialogIndex;
      setPhotoDialogIndex(null);
      if (index == null) return;
      const photoError = validatePhotoFile(file);
      if (photoError) {
        toast.error(photoError);
        return;
      }
      await replacePhotoAt(index, await fileToDataUrl(file));
    },
    [photoDialogIndex, replacePhotoAt]
  );

  const handleAddPhotos = useCallback(
    async (fileList: FileList) => {
      const slots = Math.max(0, MAX_PHOTOS - photos.length);
      const accepted = Array.from(fileList)
        .filter((file) => {
          const photoError = validatePhotoFile(file);
          if (photoError) toast.error(photoError);
          return photoError === null;
        })
        .slice(0, slots);
      if (accepted.length === 0) return;
      setIsSavingPhoto(true);
      try {
        for (const file of accepted) {
          const dataUrl = await fileToDataUrl(file);
          await uploadExerciseImage({
            variables: { exerciseId: exercise.id, base64Image: dataUrl.split(',')[1] ?? '', contentType: file.type },
          });
        }
        await reloadImages();
        toast.success(accepted.length === 1 ? 'Dodano zdjęcie' : `Dodano zdjęcia: ${accepted.length}`);
      } catch (error) {
        console.error('Błąd dodawania zdjęć:', error);
        toast.error('Nie udało się dodać wszystkich zdjęć');
      } finally {
        setIsSavingPhoto(false);
      }
    },
    [exercise.id, photos.length, reloadImages, uploadExerciseImage]
  );

  const handleDeletePhoto = useCallback(
    async (url: string) => {
      setIsSavingPhoto(true);
      try {
        await deleteExerciseImage({ variables: { exerciseId: exercise.id, imageUrl: url } });
        const savedImages = await reloadImages();
        if (patient.step_images?.some((link) => link.url === url)) {
          setEnrichmentPath('patient.step_images', keepExistingImages(patient.step_images, savedImages));
        }
      } finally {
        setIsSavingPhoto(false);
      }
    },
    [deleteExerciseImage, exercise.id, patient.step_images, reloadImages, setEnrichmentPath]
  );

  // ============================================
  // HANDLERS: instruction proposal
  // ============================================

  const handleRequestProposal = useCallback(async () => {
    setIsGeneratingProposal(true);
    try {
      const response = await aiService.generateEnrichment({
        exerciseName: core.name,
        patientDescription: core.patientDescription,
        clinicalDescription: core.clinicalDescription,
        type: mode === 'hold' ? 'time' : 'reps',
        tags: [...core.mainTags, ...core.additionalTags],
        existingEnrichmentJson: JSON.stringify(enrichment),
      });
      if (!response?.success || !response.enrichmentData) {
        toast.error('Agent nie przygotował propozycji. Spróbuj ponownie.');
        return;
      }
      const nextProposal = buildInstructionProposal(patient, toV3(response.enrichmentData).patient);
      if (!nextProposal) {
        toast.info('Agent nie ma nic nowego do dodania.');
        return;
      }
      setProposal(nextProposal);
    } finally {
      setIsGeneratingProposal(false);
    }
  }, [core, enrichment, mode, patient]);

  // ============================================
  // HANDLERS: decisions
  // ============================================

  const canDecide = canDecideOnExercise(exercise.status);

  const handlePublish = useCallback(async () => {
    if (!canDecide || !stages.canPublish) return;
    setIsLeaving(true);
    try {
      await flush();
      await approveExercise({ variables: { exerciseId: exercise.id, reviewNotes: null } });
      toast.success('Ćwiczenie zatwierdzone i opublikowane');
      await resolveReports('Poprawione i opublikowane w weryfikacji');
      leaveToNext();
    } catch (error) {
      console.error('Błąd zatwierdzania:', error);
      toast.error('Nie udało się zatwierdzić ćwiczenia');
      setIsLeaving(false);
    }
  }, [approveExercise, canDecide, exercise.id, flush, leaveToNext, resolveReports, stages.canPublish]);

  const handleMarkDuplicate = useCallback(
    async (target: DuplicateTarget) => {
      if (!canDecide) return;
      setIsLeaving(true);
      const notes = `To ćwiczenie jest już w bazie jako „${target.name}” (ID: ${target.id}).`;
      try {
        await flush();
        await rejectExercise({
          variables: { exerciseId: exercise.id, rejectionReason: 'POTENTIAL_DUPLICATE', notes },
        });
        toast.success(`Oznaczono jako duplikat „${target.name}”`);
        await resolveReports(notes);
        setIsDuplicateOpen(false);
        leaveToNext();
      } catch (error) {
        console.error('Błąd oznaczania duplikatu:', error);
        toast.error('Nie udało się oznaczyć duplikatu');
        setIsLeaving(false);
      }
    },
    [canDecide, exercise.id, flush, leaveToNext, rejectExercise, resolveReports]
  );

  const handleSkip = useCallback(() => {
    void flush().then(leaveToNext);
  }, [flush, leaveToNext]);

  const handleSave = useCallback(() => {
    void flush().then(() => toast.success('Zmiany zapisane'));
  }, [flush]);

  const currentIssues = stages.issues[stage];
  const isPrimaryBlocked = stage === 'decision' ? canDecide && !stages.canPublish : currentIssues.length > 0;

  const handlePrimary = useCallback(() => {
    if (isPrimaryBlocked || isLeaving) return;
    if (stage === 'decision') {
      if (canDecide) void handlePublish();
      else handleSkip();
      return;
    }
    const nextStage = VERIFICATION_STAGES[VERIFICATION_STAGES.indexOf(stage) + 1];
    if (nextStage) goToStage(nextStage);
  }, [canDecide, goToStage, handlePublish, handleSkip, isLeaving, isPrimaryBlocked, stage]);

  const isDialogOpen = photoDialogIndex !== null || isDuplicateOpen;

  useVerificationHotkeys({
    onApproveAndNext: handlePrimary,
    onSaveDraft: handleSave,
    canApprove: !isPrimaryBlocked,
    enabled: !isDialogOpen,
  });

  // ============================================
  // VIEW MODEL
  // ============================================

  const blockingFieldCount = evaluation.findings.filter(
    (finding) => finding.level === 'limit' && finding.key !== 'session'
  ).length;
  const sessionLine = `${parameterValues.sets ?? '–'} × ${
    mode === 'reps' ? (parameterValues.reps ?? '–') : `${parameterValues.hold ?? '–'} s`
  } · ≈ ${formatSessionDuration(evaluation.sessionSeconds)}`;
  const photoLabel = pluralizePl(allMediaUrls.length, 'zdjęcie', 'zdjęcia', 'zdjęć');

  const subs: Record<VerificationStageKey, string> = {
    material: pendingPhoto
      ? 'Nowe zdjęcie do przyjęcia'
      : stages.issues.material.length > 0
        ? 'Brak materiału'
        : `${photoLabel}${hasVideo ? ' · nagranie' : ' · bez nagrania'}`,
    parameters:
      stages.issues.parameters.length === 0
        ? sessionLine
        : evaluation.blockingCount > 0
          ? `Do poprawy: ${evaluation.blockingCount}`
          : `Sprawdź: ${stages.issues.parameters.length}`,
    instruction: proposal
      ? 'Propozycja do decyzji'
      : stages.issues.instruction.length > 0
        ? `Do poprawy: ${stages.issues.instruction.length}`
        : 'Opis, kroki, wskazówki',
    safety:
      stages.issues.safety.length > 0
        ? stopIfCount === 0
          ? 'Brak objawów przerwania'
          : `Do poprawy: ${stages.issues.safety.length}`
        : pluralizePl(stopIfCount, 'objaw przerwania', 'objawy przerwania', 'objawów przerwania'),
    decision: !canDecide
      ? 'Już w bazie'
      : stages.canPublish
        ? 'Zatwierdź'
        : `Do poprawy: ${formatStageCount(stages.openStages.length)}`,
  };

  const navItems: StageNavItem[] = VERIFICATION_STAGES.map((key) => {
    const hasIssues = key === 'decision' ? canDecide && !stages.canPublish : stages.issues[key].length > 0;
    let state: StageNavState = 'todo';
    if (key === stage) state = 'current';
    else if (visited.has(key)) state = hasIssues ? 'problem' : 'done';
    return { key, title: STAGE_TITLES[key], sub: subs[key], state, hasIssues };
  });

  const hints: Record<VerificationStageKey, string> = {
    material: pendingPhoto
      ? 'Przyjmij nowe zdjęcie albo zostaw stare.'
      : stages.issues.material.length > 0
        ? 'Dodaj nagranie albo zdjęcie.'
        : hasVideo
          ? 'Obejrzyj nagranie i zdjęcia.'
          : 'Sprawdź zdjęcia krok po kroku.',
    parameters:
      blockingFieldCount > 0
        ? `Popraw zaznaczone parametry: ${blockingFieldCount}.`
        : evaluation.sessionLevel === 'limit'
          ? 'Za długie ćwiczenie: zmniejsz serie, powtórzenia albo przerwę.'
          : stages.issues.parameters.length > 0
            ? 'Popraw albo potwierdź „Tak ma być”.'
            : 'Porównaj parametry z nagraniem.',
    instruction: proposal
      ? 'Wstaw propozycję agenta albo ją pomiń.'
      : (stages.issues.instruction[0]?.text ?? 'Przeczytaj opis oczami pacjenta.'),
    safety: stages.issues.safety[0]?.text ?? 'Sprawdź objawy i przeciwwskazania.',
    decision: !canDecide
      ? 'Ćwiczenie jest już w bazie. Poprawki zapisują się od razu.'
      : stages.canPublish
        ? `Trafi do bazy z podpisem: ${user?.fullName ?? 'Twoje konto'}.`
        : `Najpierw popraw: ${stages.openStages.map((key) => STAGE_TITLES[key]).join(', ')}.`,
  };

  const decisionRows: DecisionRow[] = [
    {
      key: 'material',
      title: STAGE_TITLES.material,
      summary: `${hasVideo ? 'Nagranie i ' : 'Bez nagrania, '}${photoLabel}`,
      changes: changes.material,
      issues: stages.issues.material,
    },
    {
      key: 'parameters',
      title: STAGE_TITLES.parameters,
      summary: `${buildPatientParameterLine(parameterValues, mode, core.side)} · ≈ ${formatSessionDuration(evaluation.sessionSeconds)}`,
      changes: changes.parameters,
      issues: stages.issues.parameters,
    },
    {
      key: 'instruction',
      title: STAGE_TITLES.instruction,
      summary: [
        'Opis',
        pluralizePl((patient.steps ?? []).filter(Boolean).length, 'krok', 'kroki', 'kroków'),
        pluralizePl(
          (patient.cues ?? []).filter(Boolean).length,
          'wskazówka głosowa',
          'wskazówki głosowe',
          'wskazówek głosowych'
        ),
        pluralizePl((patient.mistakes ?? []).length, 'typowy błąd', 'typowe błędy', 'typowych błędów'),
      ].join(', '),
      changes: changes.instruction,
      issues: stages.issues.instruction,
    },
    {
      key: 'safety',
      title: STAGE_TITLES.safety,
      summary: [
        parseStopIf(enrichment.safety?.stop_if).join(', '),
        pluralizePl(
          enrichment.therapist?.contraindications?.length ?? 0,
          'przeciwwskazanie',
          'przeciwwskazania',
          'przeciwwskazań'
        ),
        enrichment.safety?.requires_supervision ? 'tylko pod nadzorem' : '',
      ]
        .filter(Boolean)
        .join(' · '),
      changes: changes.safety,
      issues: stages.issues.safety,
    },
  ];

  const reportStage = latestReport ? (REPORT_STAGE[latestReport.reasonCategory] ?? 'parameters') : null;

  return (
    <PageSheet contentClassName="gap-5" data-testid="verification-workspace">
      <div ref={rootRef} className="scroll-mt-6" />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="plain"
            size="sm"
            className="-ml-3"
            onClick={() => router.push(listUrl)}
            data-testid="verification-back-btn"
          >
            <ArrowLeft />
            Lista ćwiczeń
          </Button>
          {queuePosition != null && queueTotal > 0 && (
            <span className="text-[13px] tabular-nums text-label-secondary">
              {queuePosition} z {queueTotal} do weryfikacji
            </span>
          )}
          <span className="flex-1" />
          <SaveStatus status={form.saveStatus} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={isLeaving}
            data-testid="verification-skip-btn"
          >
            Odłóż na później
          </Button>
        </div>
        <h1 className="text-[28px] font-bold leading-[34px] tracking-tight text-foreground">
          {core.name.trim() || 'Ćwiczenie bez nazwy'}
        </h1>
      </header>

      {latestReport && reportStage && (
        <div
          className="flex flex-wrap items-start gap-3 rounded-2xl bg-status-warning-muted px-4 py-3"
          data-testid="verification-report-banner"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-status-warning font-bold text-card">
            !
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground">
              Zgłoszenie od {latestReport.reportedBy.name ?? latestReport.reportedBy.email}: „{latestReport.description}
              ”
            </p>
            <p className="text-[13px] text-label-secondary">
              {openReports.length > 1 ? `Otwarte zgłoszenia: ${openReports.length}. ` : ''}
              Poprawka zmieni to ćwiczenie we wszystkich planach pacjentów po publikacji.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => goToStage(reportStage)}
            data-testid="verification-report-go-btn"
          >
            Pokaż w etapie {STAGE_TITLES[reportStage]}
          </Button>
        </div>
      )}

      {exercise.adminReviewNotes && (
        <div
          className="flex items-start gap-2 rounded-2xl bg-status-warning-muted px-4 py-3"
          data-testid="verification-previous-notes"
        >
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-status-warning">Poprzednie uwagi</p>
            <p className="text-[15px] text-foreground">{exercise.adminReviewNotes}</p>
          </div>
        </div>
      )}

      <VerificationStageNav items={navItems} onSelect={goToStage} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[104px] lg:self-start" aria-label="Materiał ćwiczenia">
          <MediaGallery
            items={mediaItems}
            title={core.name}
            layout="stage"
            aspectRatio="portrait"
            rootTestId="verification-media-panel"
            testIdPrefix="verification-media"
          />
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-[20px] font-semibold leading-[25px] text-foreground">{STAGE_TITLES[stage]}</h2>

          {stage === 'material' && (
            <MaterialStage
              videoUrl={core.videoUrl}
              photos={photos}
              stepImages={patient.step_images}
              maxPhotos={MAX_PHOTOS}
              pendingPhoto={pendingPhoto}
              generatingIndex={generatingIndex}
              isGenerating={imageGeneration.isGenerating}
              isSavingPhoto={isSavingPhoto}
              onVideoUrlChange={(value) => setCoreField('videoUrl', value)}
              onReplacePhoto={setPhotoDialogIndex}
              onDeletePhoto={(url) => void handleDeletePhoto(url)}
              onAddPhotos={(files) => void handleAddPhotos(files)}
              onAcceptPending={() => {
                if (pendingPhoto) void replacePhotoAt(pendingPhoto.index, pendingPhoto.previewUrl);
              }}
              onRetryPending={handleRetryPhoto}
              onDiscardPending={() => setPendingPhoto(null)}
            />
          )}

          {stage === 'parameters' && (
            <ParametersStage
              core={core}
              mode={mode}
              values={parameterValues}
              evaluation={evaluation}
              descriptionNumbers={descriptionNumbers}
              onModeChange={handleModeChange}
              onValueChange={handleParameterChange}
              onAcknowledge={(key) => setAcknowledged((previous) => new Set([...previous, key]))}
              onFixDescription={() =>
                setCoreField('patientDescription', replaceHardcodedNumbers(core.patientDescription))
              }
              onAcknowledgeDescription={() => setDescriptionAcknowledged(true)}
              onCoreFieldChange={setCoreField}
            />
          )}

          {stage === 'instruction' && (
            <InstructionStage
              name={core.name}
              patientDescription={core.patientDescription}
              patient={patient}
              imageUrls={photos}
              proposal={proposal}
              isGeneratingProposal={isGeneratingProposal}
              onCoreFieldChange={setCoreField}
              onPatientChange={(nextPatient) => setEnrichmentPath('patient', nextPatient)}
              onRequestProposal={() => void handleRequestProposal()}
              onInsertProposal={() => {
                if (!proposal) return;
                setEnrichmentPath('patient', applyInstructionProposal(patient, proposal));
                setProposal(null);
              }}
              onDismissProposal={() => setProposal(null)}
            />
          )}

          {stage === 'safety' && (
            <SafetyStage
              enrichment={enrichment}
              therapistDescription={core.clinicalDescription}
              onTherapistDescriptionChange={(value) => setCoreField('clinicalDescription', value)}
              onEnrichmentPathChange={setEnrichmentPath}
            />
          )}

          {stage === 'decision' && <DecisionStage rows={decisionRows} onGoToStage={goToStage} />}
        </div>
      </div>

      <VerificationFloatingBar
        hint={hints[stage]}
        isBlocked={isPrimaryBlocked}
        primaryLabel={stage === 'decision' && !canDecide ? 'Gotowe, dalej' : PRIMARY_LABELS[stage]}
        onPrimary={handlePrimary}
        isBusy={isLeaving || approving || rejecting}
        secondaryLabel={canDecide ? 'To duplikat' : undefined}
        onSecondary={canDecide ? () => setIsDuplicateOpen(true) : undefined}
      />

      <PhotoReplaceDialog
        open={photoDialogIndex !== null}
        photoLabel={photoDialogIndex !== null ? `zdjęcie ${photoDialogIndex + 1}` : ''}
        isGenerating={imageGeneration.isGenerating}
        onOpenChange={(open) => {
          if (!open) setPhotoDialogIndex(null);
        }}
        onGenerate={(problems, note) => {
          if (photoDialogIndex !== null) void generatePhoto(photoDialogIndex, problems, note);
        }}
        onUploadOwn={(file) => void handleUploadOwnPhoto(file)}
      />

      <DuplicateDialog
        open={isDuplicateOpen}
        exerciseId={exercise.id}
        exerciseName={core.name}
        isSubmitting={rejecting || isLeaving}
        onOpenChange={setIsDuplicateOpen}
        onConfirm={(target) => void handleMarkDuplicate(target)}
      />
    </PageSheet>
  );
}
