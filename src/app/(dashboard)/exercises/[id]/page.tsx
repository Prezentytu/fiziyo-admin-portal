'use client';

import { use, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Trash2,
  Clock,
  Dumbbell,
  FolderPlus,
  MoreHorizontal,
  Sparkles,
  Plus,
  ExternalLink,
  Rocket,
  AlertCircle,
  Globe,
  RefreshCw,
  Copy,
  Flag,
  Upload,
  Loader2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/shared/LoadingState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseParametersPanel } from '@/features/exercises/ExerciseParametersPanel';
import { ExerciseEditor } from '@/features/exercises/ExerciseEditor';
import { ExerciseExecutionSteps } from '@/features/exercises/ExerciseExecutionSteps';
import { ExerciseAudioCues } from '@/features/exercises/ExerciseAudioCues';
import {
  PatientLeadSection,
  PatientExtrasSection,
  SafetySection,
  TherapistSection,
  MetadataSection,
} from '@/features/exercises/ExerciseDetailSections';
import { CreateSetWizard } from '@/features/exercise-sets';
import { SubmitToGlobalDialog } from '@/features/exercises/SubmitToGlobalDialog';
import { SubmitToOrganizationDialog } from '@/features/exercises/SubmitToOrganizationDialog';
import { FeedbackBanner } from '@/features/exercises/FeedbackBanner';
import { ReportExerciseDialog } from '@/features/exercises/ReportExerciseDialog';
import { MediaGallery, buildMediaItems } from '@/components/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { normalizeExerciseFieldValues } from '@/components/shared/exercise';

import { GET_EXERCISE_BY_ID_QUERY, GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import {
  DELETE_EXERCISE_MUTATION,
  UPDATE_EXERCISE_MUTATION,
  UPLOAD_EXERCISE_IMAGE_MUTATION,
  DELETE_EXERCISE_IMAGE_MUTATION,
  SUBMIT_FOR_ORGANIZATION_REVIEW_MUTATION,
  SUBMIT_TO_GLOBAL_REVIEW_MUTATION,
  RESUBMIT_FROM_ORIGINAL_MUTATION,
  CREATE_EXERCISE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { useExerciseEditorForm } from '@/features/exercises/useExerciseEditorForm';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { createTagsMap, mapExerciseTagsToObjects } from '@/utils/tagUtils';
import { useExerciseImageGeneration } from '@/features/exercises/useExerciseImageGeneration';
import { ImageStylePicker } from '@/features/exercises/ImageStylePicker';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { ExerciseByIdResponse, ExerciseTagsResponse, TagCategoriesResponse } from '@/types/apollo';
import {
  buildEnrichmentUpdateVariables,
  isExerciseSaveAuthError,
} from '@/features/exercises/utils/buildEnrichmentUpdateVariables';
import { getNextExerciseCopyName } from '@/features/exercises/utils/getNextExerciseCopyName';
import { buildCreateExerciseVariables } from '@/features/exercises/utils/buildCreateExerciseVariables';
import { calculateExerciseTotalSeconds, formatExerciseDuration } from '@/utils/exerciseTime';
import { resolveLoadKg } from '@/utils/exerciseLoadMutation';
import { verificationCopy } from '@/features/verification/verificationCopy';
import { ORG_VERIFICATION_REFETCH_QUERIES } from '@/hooks/useOrganizationVerificationRealtime';

interface ExerciseDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ExerciseTag {
  id: string;
  name: string;
  color: string;
}

function isTagObject(tag: string | ExerciseTag): tag is ExerciseTag {
  return typeof tag === 'object' && 'name' in tag;
}

export default function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const {
    generate: generateAiImage,
    isGenerating: isGeneratingAiImage,
    imageStyle,
    setImageStyle,
  } = useExerciseImageGeneration({ showSuccessToast: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apolloClient = useApolloClient();
  const [isCreateSetWizardOpen, setIsCreateSetWizardOpen] = useState(false);
  const [isSubmitToGlobalDialogOpen, setIsSubmitToGlobalDialogOpen] = useState(false);
  const [isSubmitToOrganizationDialogOpen, setIsSubmitToOrganizationDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const organizationId = currentOrganization?.organizationId;

  const { data, loading, error } = useQuery(GET_EXERCISE_BY_ID_QUERY, {
    variables: { id },
  });
  const { data: organizationExercisesData } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const [updateExercise] = useMutation(UPDATE_EXERCISE_MUTATION);
  const [uploadExerciseImage] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION);
  const [deleteExerciseImage] = useMutation(DELETE_EXERCISE_IMAGE_MUTATION);

  const [deleteExercise, { loading: deleting }] = useMutation(DELETE_EXERCISE_MUTATION, {
    refetchQueries: organizationId
      ? [
          {
            query: GET_ORGANIZATION_EXERCISES_QUERY,
            variables: { organizationId },
          },
        ]
      : [],
  });

  const [submitToGlobalReview, { loading: submittingToGlobal }] = useMutation(SUBMIT_TO_GLOBAL_REVIEW_MUTATION, {
    refetchQueries: [{ query: GET_EXERCISE_BY_ID_QUERY, variables: { id } }],
  });
  const [submitForOrganizationReview, { loading: submittingToOrganization }] = useMutation(
    SUBMIT_FOR_ORGANIZATION_REVIEW_MUTATION,
    {
      refetchQueries: [{ query: GET_EXERCISE_BY_ID_QUERY, variables: { id } }, ...ORG_VERIFICATION_REFETCH_QUERIES],
    }
  );

  const [resubmitFromOriginal, { loading: resubmitting }] = useMutation(RESUBMIT_FROM_ORIGINAL_MUTATION, {
    refetchQueries: [{ query: GET_EXERCISE_BY_ID_QUERY, variables: { id } }],
  });
  const [createExercise, { loading: duplicating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: organizationId
      ? [{ query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } }]
      : [],
  });

  const rawExercise = (data as ExerciseByIdResponse)?.exerciseById;
  const organizationExerciseNames = (
    (organizationExercisesData as { organizationExercises?: { name?: string | null }[] } | undefined)
      ?.organizationExercises ?? []
  )
    .map((organizationExercise) => organizationExercise.name?.trim())
    .filter((name): name is string => Boolean(name));
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

  const tagsMap = createTagsMap(tags, categories);
  const exercise = rawExercise ? mapExerciseTagsToObjects(rawExercise, tagsMap) : null;

  // ============================================
  // SINGLE FORM MODEL (core + v3) — coordinated save, dirty tracking
  // ============================================

  const updateCore = useCallback(
    async (variables: Record<string, unknown>) => {
      await updateExercise({ variables: { exerciseId: id, ...variables } });
    },
    [id, updateExercise]
  );

  const updateEnrichment = useCallback(
    async (payload: ExerciseEnrichmentData) => {
      await updateExercise({
        variables: buildEnrichmentUpdateVariables(id, payload),
      });
    },
    [id, updateExercise]
  );

  const handleSaved = useCallback(() => {
    toast.success('Zmiany zostały zapisane');
    setIsEditMode(false);
    void apolloClient.refetchQueries({ include: [GET_EXERCISE_BY_ID_QUERY] });
  }, [apolloClient]);

  const handleSaveError = useCallback((error?: unknown) => {
    if (error && isExerciseSaveAuthError(error)) {
      toast.error('Brak uprawnień do zapisu tych zmian');
      return;
    }
    toast.error('Nie udało się zapisać zmian');
  }, []);

  const exerciseEditorForm = useExerciseEditorForm({
    source: rawExercise,
    updateCore,
    updateEnrichment,
    onSaved: handleSaved,
    onError: handleSaveError,
  });
  const {
    core,
    enrichment,
    setCoreField,
    setEnrichmentPath,
    isDirty,
    isCoreFieldDirty,
    isPathDirty,
    saveStatus,
    save,
    reset,
  } = exerciseEditorForm;

  const handleDelete = async () => {
    try {
      await deleteExercise({ variables: { exerciseId: id } });
      toast.success('Ćwiczenie zostało usunięte');
      router.push('/exercises');
    } catch (err) {
      console.error('Błąd podczas usuwania:', err);
      toast.error('Nie udało się usunąć ćwiczenia');
    }
  };

  const handleAddToSet = () => setIsCreateSetWizardOpen(true);

  const handleSubmitToGlobal = async (exerciseId: string) => {
    try {
      await submitToGlobalReview({ variables: { exerciseId } });
      toast.success('Ćwiczenie zostało zgłoszone do weryfikacji');
    } catch (err) {
      console.error('Błąd podczas zgłaszania:', err);
      toast.error('Nie udało się zgłosić ćwiczenia do weryfikacji');
    }
  };

  const handleResubmit = async () => {
    try {
      await resubmitFromOriginal({ variables: { originalExerciseId: id } });
      toast.success('Ćwiczenie zostało ponownie zgłoszone do weryfikacji');
    } catch (err) {
      console.error('Błąd podczas ponownego zgłaszania:', err);
      toast.error('Nie udało się ponownie zgłosić ćwiczenia');
    }
  };

  const handleSubmitToOrganization = async (exerciseId: string) => {
    try {
      await submitForOrganizationReview({ variables: { exerciseId } });
      toast.success('Ćwiczenie zostało zgłoszone do weryfikacji organizacyjnej');
      setIsSubmitToOrganizationDialogOpen(false);
    } catch (err) {
      console.error('Błąd podczas zgłaszania organizacyjnego:', err);
      toast.error('Nie udało się zgłosić ćwiczenia do weryfikacji organizacyjnej');
    }
  };

  const normalizeTagIds = (tagValues: (string | ExerciseTag)[] | undefined) => {
    if (!tagValues || tagValues.length === 0) return null;
    const tagIds = tagValues.map((tag) => (isTagObject(tag) ? tag.id : tag)).filter((tag): tag is string => Boolean(tag));
    return tagIds.length > 0 ? tagIds : null;
  };

  const handleDuplicateExercise = async () => {
    if (!organizationId || !exercise) return;

    const duplicatedExerciseName = getNextExerciseCopyName(exercise.name, organizationExerciseNames);
    const exerciseWithLoad = exercise as typeof exercise & {
      defaultLoad?: {
        loadWeightKg?: number | null;
        value?: number | null;
        unit?: string | null;
      } | null;
    };
    const loadKg = resolveLoadKg(exerciseWithLoad.defaultLoad) ?? null;

    try {
      const result = await createExercise({
        variables: buildCreateExerciseVariables({
          organizationId,
          draft: {
            name: duplicatedExerciseName,
            patientDescription: exercise.patientDescription || exercise.description || '',
            clinicalDescription: exercise.clinicalDescription,
            notes: exercise.notes,
            audioCue: exercise.audioCue,
            tempo: exercise.tempo,
            rangeOfMotion: exercise.rangeOfMotion,
            side: exercise.side || exercise.exerciseSide,
            difficultyLevel: exercise.difficultyLevel,
            videoUrl: exercise.videoUrl,
            sets: exercise.defaultSets ?? exercise.sets ?? null,
            reps: exercise.defaultReps ?? exercise.reps ?? null,
            duration: exercise.defaultDuration ?? exercise.duration ?? null,
            restSets: exercise.defaultRestBetweenSets ?? exercise.restSets ?? null,
            restReps: exercise.defaultRestBetweenReps ?? exercise.restReps ?? null,
            preparationTime: exercise.preparationTime ?? null,
            executionTime: exercise.defaultExecutionTime ?? exercise.executionTime ?? null,
            loadKg,
            images: exercise.images?.length ? exercise.images : null,
            mainTags: normalizeTagIds(exercise.mainTags),
            additionalTags: normalizeTagIds(exercise.additionalTags),
          },
        }),
      });

      const duplicatedExerciseId = (result.data as { createExercise?: { id?: string } } | undefined)?.createExercise?.id;

      toast.success('Kopia ćwiczenia została utworzona', {
        description: `Nowe ćwiczenie: "${duplicatedExerciseName}"`,
        action: duplicatedExerciseId
          ? {
              label: 'Zobacz kopię',
              onClick: () => router.push(`/exercises/${duplicatedExerciseId}`),
            }
          : undefined,
      });
      if (duplicatedExerciseId) {
        router.push(`/exercises/${duplicatedExerciseId}`);
      }
    } catch (err) {
      console.error('Błąd podczas duplikowania ćwiczenia:', err);
      toast.error('Nie udało się utworzyć kopii ćwiczenia');
    }
  };

  // ============================================
  // MEDIA HANDLERS
  // ============================================

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

  const handleImageFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const currentCount = exercise?.images?.length ?? 0;
      if (currentCount >= 5) {
        toast.error('Maksymalna liczba zdjęć to 5');
        return;
      }

      setUploadingImage(true);
      try {
        const base64Image = await fileToBase64(file);
        await uploadExerciseImage({ variables: { exerciseId: id, base64Image, contentType: file.type } });
        await apolloClient.refetchQueries({ include: [GET_EXERCISE_BY_ID_QUERY] });
        toast.success('Zdjęcie zostało dodane');
      } catch (err) {
        console.error('[ExerciseDetail] Image upload failed:', err);
        toast.error('Nie udało się dodać zdjęcia');
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [exercise, id, uploadExerciseImage, fileToBase64, apolloClient]
  );

  const handleDeleteImage = useCallback(
    async (imageUrl: string) => {
      setUploadingImage(true);
      try {
        await deleteExerciseImage({ variables: { exerciseId: id, imageUrl } });
        await apolloClient.refetchQueries({ include: [GET_EXERCISE_BY_ID_QUERY] });
        toast.success('Zdjęcie zostało usunięte');
      } catch (err) {
        console.error('[ExerciseDetail] Image delete failed:', err);
        toast.error('Nie udało się usunąć zdjęcia');
      } finally {
        setUploadingImage(false);
      }
    },
    [id, deleteExerciseImage, apolloClient]
  );

  const handleAIGenerateImage = useCallback(async () => {
    if (!exercise?.name?.trim()) {
      toast.error('Brak nazwy ćwiczenia do generowania obrazu');
      return;
    }

    const currentCount = exercise.images?.length ?? 0;
    if (currentCount >= 5) {
      toast.error('Maksymalna liczba zdjęć to 5');
      return;
    }

    const description = [exercise.patientDescription, exercise.description].filter(Boolean).join(' ');
    const generatedFile = await generateAiImage({
      exerciseName: exercise.name,
      exerciseDescription: description,
      exerciseType: exercise.type?.toLowerCase() === 'time' ? 'time' : 'reps',
      style: imageStyle,
    });

    if (!generatedFile) {
      return;
    }

    setUploadingImage(true);
    try {
      const base64Image = await fileToBase64(generatedFile);
      await uploadExerciseImage({
        variables: { exerciseId: id, base64Image, contentType: generatedFile.type || 'image/png' },
      });
      await apolloClient.refetchQueries({ include: [GET_EXERCISE_BY_ID_QUERY] });
      toast.success('Zdjęcie AI zostało wygenerowane');
    } catch (err) {
      console.error('[ExerciseDetail] AI image upload failed:', err);
      toast.error('Nie udało się zapisać wygenerowanego zdjęcia');
    } finally {
      setUploadingImage(false);
    }
  }, [exercise, id, uploadExerciseImage, fileToBase64, apolloClient, generateAiImage, imageStyle]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
        <div className="h-16 w-16 rounded-2xl bg-surface-light flex items-center justify-center">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-destructive">{error ? `Błąd: ${error.message}` : 'Nie znaleziono ćwiczenia'}</p>
        <Button variant="outline" onClick={() => router.push('/exercises')} data-testid="exercise-detail-error-back-btn">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do listy
        </Button>
      </div>
    );
  }

  const mediaItems = buildMediaItems({
    thumbnailUrl: exercise.thumbnailUrl,
    imageUrl: exercise.imageUrl,
    images: exercise.images,
    videoUrl: exercise.videoUrl,
    gifUrl: exercise.gifUrl,
    title: exercise.name,
  });
  const imageItemsCount = mediaItems.filter((item) => item.kind === 'image').length;

  const canSubmitToGlobal = exercise.scope === 'ORGANIZATION' && !exercise.globalSubmissionId;
  const canSubmitToOrganization =
    exercise.scope === 'ORGANIZATION' &&
    (exercise.organizationVerificationStatus === 'NOT_SUBMITTED' ||
      exercise.organizationVerificationStatus === 'ORG_CHANGES_REQUESTED');

  const isGlobalExercise = exercise.scope === 'GLOBAL';
  const hasGlobalSubmission = !!exercise.globalSubmissionId;
  const isPendingReview = exercise.status === 'PENDING_REVIEW';
  const isChangesRequested = exercise.status === 'CHANGES_REQUESTED';
  const isSubmittedToGlobal = hasGlobalSubmission && exercise.scope === 'ORGANIZATION';
  const canResubmit = isChangesRequested && hasGlobalSubmission;

  const normalizedFields = normalizeExerciseFieldValues(exercise);

  const totalExerciseTime = calculateExerciseTotalSeconds({
    sets: normalizedFields.sets ?? 0,
    duration: normalizedFields.duration,
    reps: normalizedFields.reps,
    executionTime: normalizedFields.executionTime,
    restSets: normalizedFields.restSets,
    restReps: normalizedFields.restReps,
    preparationTime: normalizedFields.preparationTime,
    tempo: normalizedFields.tempo ?? undefined,
    side: normalizedFields.side ?? undefined,
  });

  const exerciseDurationSummary =
    totalExerciseTime.seconds > 0
      ? {
          label: 'Czas trwania ćwiczenia',
          value: formatExerciseDuration(totalExerciseTime.seconds, totalExerciseTime.isEstimate),
          tooltip: 'Szacowany łączny czas całego ćwiczenia (wszystkie serie + przerwy + przygotowanie).',
        }
      : undefined;

  const patientDescription = exercise.patientDescription || exercise.description || '';
  const physiotherapistDescription = exercise.clinicalDescription || '';
  const audioCue = (exercise as { audioCue?: string }).audioCue || '';
  const hasMissingCoreInformation =
    !patientDescription.trim() || !physiotherapistDescription.trim() || imageItemsCount === 0;

  const isPendingOrganizationReview = exercise.organizationVerificationStatus === 'PENDING_ORG_REVIEW';
  const isLocked = isGlobalExercise || isPendingReview || isPendingOrganizationReview;
  const isEditing = isEditMode && !isLocked;
  const canEditMedia = isEditing;

  const handleToggleEdit = () => {
    if (isEditing) {
      reset();
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    reset();
    setIsEditMode(false);
  };

  return (
    <div className={cn('space-y-6', isEditing && 'pb-24')}>
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/exercises')}
          className="gap-2"
          data-testid="exercise-detail-back-btn"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót do ćwiczeń
        </Button>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="exercise-detail-menu-trigger">
                Opcje
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDuplicateExercise}
                disabled={duplicating}
                data-testid="exercise-detail-duplicate-btn"
              >
                <Copy className="mr-2 h-4 w-4" />
                {duplicating ? 'Tworzenie kopii...' : 'Duplikuj'}
              </DropdownMenuItem>
              {exercise.videoUrl && (
                <DropdownMenuItem asChild>
                  <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" data-testid="exercise-detail-open-video-link">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Otwórz film
                  </a>
                </DropdownMenuItem>
              )}
              {canSubmitToGlobal && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsSubmitToGlobalDialogOpen(true)}
                    className="text-primary focus:text-primary"
                    data-testid="exercise-detail-submit-global-btn"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    {verificationCopy.submitGlobal}
                  </DropdownMenuItem>
                </>
              )}
              {canSubmitToOrganization && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsSubmitToOrganizationDialogOpen(true)}
                    className="text-emerald-600 focus:text-emerald-600"
                    data-testid="exercise-detail-submit-org-btn"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    {verificationCopy.submitOrganization}
                  </DropdownMenuItem>
                </>
              )}
              {canResubmit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleResubmit}
                    disabled={resubmitting}
                    className="text-primary focus:text-primary"
                    data-testid="exercise-detail-resubmit-btn"
                  >
                    <RefreshCw className={cn('mr-2 h-4 w-4', resubmitting && 'animate-spin')} />
                    Zgłoś ponownie do weryfikacji
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsReportDialogOpen(true)}
                data-testid="exercise-detail-report-btn"
                className="text-amber-500 focus:text-amber-500 focus:bg-amber-500/10"
              >
                <Flag className="mr-2 h-4 w-4" />
                Zgłoś do poprawki
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
                data-testid="exercise-detail-delete-btn"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń ćwiczenie
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hero Section: Title + Meta */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {isGlobalExercise && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold tracking-wider bg-violet/10 text-violet border-violet/20"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              FiziYo
            </Badge>
          )}
          {isSubmittedToGlobal && !isPendingReview && !isChangesRequested && !isGlobalExercise && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-600 border-blue-500/20"
            >
              <Globe className="mr-1 h-3 w-3" />W FiziYo
            </Badge>
          )}
          {isPendingReview && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-600 border-amber-500/20"
            >
              <Clock className="mr-1 h-3 w-3" />
              Weryfikacja
            </Badge>
          )}
          {isChangesRequested && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold tracking-wider bg-orange-500/10 text-orange-600 border-orange-500/20"
            >
              <AlertCircle className="mr-1 h-3 w-3" />
              Do poprawy
            </Badge>
          )}
        </div>
        {isEditing ? (
          <Input
            value={core.name}
            className="h-auto border-0 border-b border-border/60 bg-transparent px-0 text-2xl font-bold text-foreground shadow-none focus-visible:ring-0 focus-visible:border-primary rounded-none"
            onChange={(event) => setCoreField('name', event.target.value)}
            data-testid="exercise-detail-name-input"
          />
        ) : (
          <h1 className="text-2xl font-bold text-foreground" data-testid="exercise-detail-name">
            {exercise.name}
          </h1>
        )}
      </div>

      {isChangesRequested && exercise.adminReviewNotes && (
        <FeedbackBanner adminReviewNotes={exercise.adminReviewNotes} updatedAt={exercise.updatedAt} />
      )}

      {/* Hero Actions */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        <button
          onClick={handleAddToSet}
          className={cn(
            'group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer sm:col-span-1',
            isLocked ? 'lg:col-span-6' : 'lg:col-span-4'
          )}
          data-testid="exercise-detail-add-to-set-btn"
        >
          <div className="absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-foreground/10 rounded-full blur-3xl group-hover:bg-primary-foreground/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <FolderPlus className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-primary-foreground">Dodaj do zestawu</h3>
              <p className="text-sm text-primary-foreground/70">Użyj w programie</p>
            </div>
            <Plus className="h-5 w-5 text-primary-foreground/60 group-hover:text-primary-foreground transition-colors shrink-0" />
          </div>
        </button>

        <button
          onClick={() => setIsReportDialogOpen(true)}
          className={cn(
            'group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-left transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 hover:scale-[1.01] cursor-pointer sm:col-span-1',
            isLocked ? 'lg:col-span-6' : 'lg:col-span-4'
          )}
          data-testid="exercise-detail-report-hero-btn"
        >
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Flag className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground">Zgłoś do poprawki</h3>
              <p className="text-sm text-muted-foreground">Przekaż do weryfikacji</p>
            </div>
          </div>
        </button>

        {!isLocked && (
          <button
            onClick={handleToggleEdit}
            className={cn(
              'group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer sm:col-span-2 lg:col-span-4',
              isEditing
                ? 'border-emerald-500/30 bg-emerald-500/10 hover:shadow-emerald-500/20'
                : 'border-border/40 bg-surface/50 hover:shadow-primary/10'
            )}
            data-testid="exercise-detail-edit-btn"
          >
            <div className="relative flex items-center gap-4">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl shrink-0 group-hover:scale-110 transition-transform duration-300',
                  isEditing ? 'bg-emerald-500/20 text-emerald-600' : 'bg-primary/10 text-primary'
                )}
              >
                {isEditing ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-foreground">{isEditing ? 'Zakończ edycję' : 'Edytuj ćwiczenie'}</h3>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? 'Wróć do podglądu' : 'Zmień parametry i opisy'}
                </p>
              </div>
            </div>
          </button>
        )}
      </div>

      {hasMissingCoreInformation && !isEditing && (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-50/50 p-4 dark:bg-sky-500/5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
            <div>
              <p className="text-sm font-semibold text-foreground">To ćwiczenie może być jeszcze lepsze</p>
              <p className="text-sm text-muted-foreground">
                Dodaj opis dla pacjenta, opis kliniczny i zdjęcia, aby pacjent lepiej rozumiał sposób wykonania.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left column: media */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            Zdjęcia i media
          </h2>
          <MediaGallery
            items={mediaItems}
            title={exercise.name}
            layout="fill"
            rootTestId="exercise-detail-media-player"
            testIdPrefix="exercise-detail-media"
            className="h-[320px] lg:h-[520px]"
          />

          {canEditMedia && (
            <div
              className="rounded-2xl border border-border/40 bg-surface/50 p-4 space-y-3"
              data-testid="exercise-detail-media-edit-section"
            >
              <p className="text-sm font-semibold text-foreground">Zarządzaj zdjęciami</p>

              {(exercise.images?.length ?? 0) > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {exercise.images?.map((imageUrl) => (
                    <div
                      key={imageUrl}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-border/40"
                    >
                      <Image src={imageUrl} alt="" fill className="object-cover" sizes="80px" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(imageUrl)}
                        disabled={uploadingImage}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors"
                        aria-label="Usuń zdjęcie"
                        data-testid="exercise-detail-delete-image-btn"
                      >
                        <Trash2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isGeneratingAiImage && (
                <div
                  className="mb-3 aspect-video w-full max-w-[220px] animate-pulse rounded-xl border border-dashed border-border bg-muted/40"
                  aria-hidden
                  data-testid="exercise-detail-ai-image-skeleton"
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || isGeneratingAiImage || (exercise.images?.length ?? 0) >= 5}
                  data-testid="exercise-detail-upload-image-btn"
                >
                  {uploadingImage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Dodaj zdjęcie
                </Button>
                <ImageStylePicker
                  value={imageStyle}
                  onChange={setImageStyle}
                  disabled={isGeneratingAiImage || uploadingImage}
                  testIdPrefix="exercise-detail-ai-style"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAIGenerateImage}
                  disabled={uploadingImage || isGeneratingAiImage || !exercise.name || (exercise.images?.length ?? 0) >= 5}
                  aria-busy={isGeneratingAiImage}
                  data-testid="exercise-detail-ai-image-btn"
                >
                  {isGeneratingAiImage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {isGeneratingAiImage ? 'Generowanie…' : 'Generuj AI'}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
                data-testid="exercise-detail-image-file-input"
              />
            </div>
          )}

          {isLocked && (
            <div className="rounded-2xl border border-border/40 bg-surface/50 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {isGlobalExercise
                ? 'Ćwiczenie z bazy FiziYo — tylko do odczytu. Użyj "Duplikuj" aby je edytować.'
                : 'Edycja zablokowana podczas weryfikacji.'}
            </div>
          )}
        </div>

        {/* Right column: content, ordered by importance */}
        <div className="space-y-4">
          {isEditing ? (
            <ExerciseEditor form={exerciseEditorForm} />
          ) : (
            <>
              {/* 1. Parametry (dawkowanie) */}
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  Parametry wykonania
                </h2>
                <ExerciseParametersPanel source={normalizedFields} summaryStat={exerciseDurationSummary} />
              </div>

              {/* 2. Instrukcje dla pacjenta */}
              <PatientLeadSection
                data={enrichment}
                patientDescription={core.patientDescription}
                editable={false}
                patientDescriptionDirty={isCoreFieldDirty('patientDescription')}
                isPathDirty={isPathDirty}
                onPatientDescriptionChange={(value) => setCoreField('patientDescription', value)}
                setPath={setEnrichmentPath}
              />

              <ExerciseExecutionSteps
                enrichmentData={enrichment}
                patientDescription={patientDescription}
                editable={false}
              />

              <ExerciseAudioCues audioCue={audioCue} enrichmentData={enrichment} editable={false} />

              <PatientExtrasSection data={enrichment} editable={false} isPathDirty={isPathDirty} setPath={setEnrichmentPath} />

              {/* 3. Bezpieczeństwo */}
              <SafetySection data={enrichment} editable={false} isPathDirty={isPathDirty} setPath={setEnrichmentPath} />

              {/* 4. Dla terapeuty */}
              <TherapistSection
                data={enrichment}
                clinicalDescription={core.clinicalDescription}
                editable={false}
                clinicalDescriptionDirty={isCoreFieldDirty('clinicalDescription')}
                onClinicalDescriptionChange={(value) => setCoreField('clinicalDescription', value)}
                setPath={setEnrichmentPath}
                persist={async () => {}}
              />

              {/* 5. Metadane */}
              <MetadataSection
                data={enrichment}
                videoUrl={core.videoUrl}
                notes={core.notes}
                editable={false}
                videoUrlDirty={isCoreFieldDirty('videoUrl')}
                notesDirty={isCoreFieldDirty('notes')}
                isPathDirty={isPathDirty}
                onVideoUrlChange={(value) => setCoreField('videoUrl', value)}
                onNotesChange={(value) => setCoreField('notes', value)}
                setPath={setEnrichmentPath}
              />
            </>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      {isEditing && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          data-testid="exercise-detail-save-bar"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saveStatus === 'error' ? (
                <span className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Nie udało się zapisać — spróbuj ponownie
                </span>
              ) : isDirty ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Masz niezapisane zmiany
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Wszystko zapisane
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleCancelEdit} data-testid="exercise-detail-cancel-btn">
                <X className="mr-2 h-4 w-4" />
                Anuluj
              </Button>
              <Button
                onClick={() => void save()}
                disabled={!isDirty || saveStatus === 'saving'}
                data-testid="exercise-detail-save-btn"
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Zapisz zmiany
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń ćwiczenie"
        description={`Czy na pewno chcesz usunąć ćwiczenie "${exercise.name}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />

      {organizationId && (
        <CreateSetWizard
          open={isCreateSetWizardOpen}
          onOpenChange={setIsCreateSetWizardOpen}
          organizationId={organizationId}
          initialExerciseIds={[exercise.id]}
          onSuccess={() => setIsCreateSetWizardOpen(false)}
        />
      )}

      <SubmitToGlobalDialog
        open={isSubmitToGlobalDialogOpen}
        onOpenChange={setIsSubmitToGlobalDialogOpen}
        exercise={exercise}
        onConfirm={handleSubmitToGlobal}
        isLoading={submittingToGlobal}
      />
      <SubmitToOrganizationDialog
        open={isSubmitToOrganizationDialogOpen}
        onOpenChange={setIsSubmitToOrganizationDialogOpen}
        exercise={exercise}
        onConfirm={handleSubmitToOrganization}
        isLoading={submittingToOrganization}
      />

      <ReportExerciseDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        exercise={exercise}
        organizationId={organizationId}
      />
    </div>
  );
}
