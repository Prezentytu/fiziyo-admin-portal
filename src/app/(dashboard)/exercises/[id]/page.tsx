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
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/shared/LoadingState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseParametersPanel } from '@/features/exercises/ExerciseParametersPanel';
import { ExerciseExecutionSteps } from '@/features/exercises/ExerciseExecutionSteps';
import { ExerciseAudioCues } from '@/features/exercises/ExerciseAudioCues';
import { EnrichmentDisplay } from '@/features/exercises/EnrichmentDisplay';
import { CreateSetWizard } from '@/features/exercise-sets';
import { SubmitToGlobalDialog } from '@/features/exercises/SubmitToGlobalDialog';
import { SubmitToOrganizationDialog } from '@/features/exercises/SubmitToOrganizationDialog';
import { FeedbackBanner } from '@/features/exercises/FeedbackBanner';
import { ReportExerciseDialog } from '@/features/exercises/ReportExerciseDialog';
import { MediaGallery, buildMediaItems } from '@/components/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { UPDATE_EXERCISE_FIELD_MUTATION } from '@/graphql/mutations/adminExercises.mutations';
import { useEnrichmentDraft } from '@/components/shared/enrichment/useEnrichmentDraft';
import { aiService } from '@/services/aiService';
import { createTagsMap, mapExerciseTagsToObjects } from '@/utils/tagUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { ExerciseByIdResponse, ExerciseTagsResponse, TagCategoriesResponse } from '@/types/apollo';
import { getNextExerciseCopyName } from '@/features/exercises/utils/getNextExerciseCopyName';
import { calculateExerciseTotalSeconds, formatExerciseDuration } from '@/utils/exerciseTime';
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

const NUMERIC_UPDATE_FIELDS = new Set<string>([
  'sets',
  'reps',
  'duration',
  'executionTime',
  'restSets',
  'restReps',
  'preparationTime',
]);

/**
 * Maps a single edited display field to UPDATE_EXERCISE_MUTATION variables.
 * Returns null for fields that are not autosaved through this channel.
 */
function buildUpdateVariables(
  exerciseId: string,
  field: string,
  value: unknown
): Record<string, unknown> | null {
  const asText = (input: unknown): string | null => {
    const normalized = typeof input === 'string' ? input.trim() : input == null ? '' : String(input);
    return normalized === '' ? null : normalized;
  };

  if (NUMERIC_UPDATE_FIELDS.has(field)) {
    const numericValue =
      value === '' || value == null ? null : typeof value === 'number' ? value : Number(value);
    const safeValue = numericValue != null && Number.isNaN(numericValue) ? null : numericValue;
    return { exerciseId, [field]: safeValue };
  }

  switch (field) {
    case 'name':
      return { exerciseId, name: asText(value) ?? '' };
    case 'patientDescription':
      return { exerciseId, description: asText(value) };
    case 'clinicalDescription':
      return { exerciseId, clinicalDescription: asText(value) };
    case 'notes':
      return { exerciseId, notes: asText(value) };
    case 'audioCue':
      return { exerciseId, audioCue: asText(value) };
    case 'tempo':
      return { exerciseId, tempo: asText(value) };
    case 'rangeOfMotion':
      return { exerciseId, rangeOfMotion: asText(value) };
    case 'side': {
      const sideValue = asText(value);
      return { exerciseId, exerciseSide: sideValue === 'none' ? null : sideValue };
    }
    case 'difficultyLevel': {
      const difficulty = asText(value);
      return { exerciseId, difficultyLevel: difficulty === 'UNKNOWN' ? null : difficulty };
    }
    case 'load': {
      const loadText = asText(value);
      return { exerciseId, loadText, loadType: loadText ? 'text' : null };
    }
    default:
      return null;
  }
}

export default function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apolloClient = useApolloClient();
  const [isCreateSetWizardOpen, setIsCreateSetWizardOpen] = useState(false);
  const [isSubmitToGlobalDialogOpen, setIsSubmitToGlobalDialogOpen] = useState(false);
  const [isSubmitToOrganizationDialogOpen, setIsSubmitToOrganizationDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get exercise details
  const { data, loading, error } = useQuery(GET_EXERCISE_BY_ID_QUERY, {
    variables: { id },
  });
  const { data: organizationExercisesData } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get tags for mapping
  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get tag categories for color resolution
  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Autosave mutations
  const [updateExercise] = useMutation(UPDATE_EXERCISE_MUTATION);
  const [updateExerciseField] = useMutation(UPDATE_EXERCISE_FIELD_MUTATION);
  const [uploadExerciseImage] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION);
  const [deleteExerciseImage] = useMutation(DELETE_EXERCISE_IMAGE_MUTATION);

  // Delete mutation
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

  // Submit to global review mutation
  const [submitToGlobalReview, { loading: submittingToGlobal }] = useMutation(SUBMIT_TO_GLOBAL_REVIEW_MUTATION, {
    refetchQueries: [{ query: GET_EXERCISE_BY_ID_QUERY, variables: { id } }],
  });
  const [submitForOrganizationReview, { loading: submittingToOrganization }] = useMutation(
    SUBMIT_FOR_ORGANIZATION_REVIEW_MUTATION,
    {
      refetchQueries: [
        { query: GET_EXERCISE_BY_ID_QUERY, variables: { id } },
        ...ORG_VERIFICATION_REFETCH_QUERIES,
      ],
    }
  );

  // Resubmit after changes mutation
  const [resubmitFromOriginal, { loading: resubmitting }] = useMutation(RESUBMIT_FROM_ORIGINAL_MUTATION, {
    refetchQueries: [{ query: GET_EXERCISE_BY_ID_QUERY, variables: { id } }],
  });
  const [createExercise, { loading: duplicating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: organizationId
      ? [{ query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } }]
      : [],
  });

  const rawExercise = (data as ExerciseByIdResponse)?.exerciseById;
  const organizationExerciseNames =
    ((organizationExercisesData as { organizationExercises?: { name?: string | null }[] } | undefined)?.organizationExercises ??
      [])
      .map((organizationExercise) => organizationExercise.name?.trim())
      .filter((name): name is string => Boolean(name));
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

  // Map tag IDs to full tag objects (with colors resolved from categories)
  const tagsMap = createTagsMap(tags, categories);
  const exercise = rawExercise ? mapExerciseTagsToObjects(rawExercise, tagsMap) : null;

  const handleDelete = async () => {
    try {
      await deleteExercise({
        variables: { exerciseId: id },
      });
      toast.success('Ćwiczenie zostało usunięte');
      router.push('/exercises');
    } catch (err) {
      console.error('Błąd podczas usuwania:', err);
      toast.error('Nie udało się usunąć ćwiczenia');
    }
  };

  const handleAddToSet = () => {
    setIsCreateSetWizardOpen(true);
  };

  const handleSubmitToGlobal = async (exerciseId: string) => {
    try {
      await submitToGlobalReview({
        variables: { exerciseId },
      });
      toast.success('Ćwiczenie zostało zgłoszone do weryfikacji');
    } catch (err) {
      console.error('Błąd podczas zgłaszania:', err);
      toast.error('Nie udało się zgłosić ćwiczenia do weryfikacji');
    }
  };

  const handleResubmit = async () => {
    try {
      await resubmitFromOriginal({
        variables: { originalExerciseId: id },
      });
      toast.success('Ćwiczenie zostało ponownie zgłoszone do weryfikacji');
    } catch (err) {
      console.error('Błąd podczas ponownego zgłaszania:', err);
      toast.error('Nie udało się ponownie zgłosić ćwiczenia');
    }
  };

  const handleSubmitToOrganization = async (exerciseId: string) => {
    try {
      await submitForOrganizationReview({
        variables: { exerciseId },
      });
      toast.success('Ćwiczenie zostało zgłoszone do weryfikacji organizacyjnej');
      setIsSubmitToOrganizationDialogOpen(false);
    } catch (err) {
      console.error('Błąd podczas zgłaszania organizacyjnego:', err);
      toast.error('Nie udało się zgłosić ćwiczenia do weryfikacji organizacyjnej');
    }
  };

  const normalizeTagIds = (tagValues: (string | ExerciseTag)[] | undefined) => {
    if (!tagValues || tagValues.length === 0) return null;
    const tagIds = tagValues
      .map((tag) => (isTagObject(tag) ? tag.id : tag))
      .filter((tag): tag is string => Boolean(tag));

    return tagIds.length > 0 ? tagIds : null;
  };

  const handleDuplicateExercise = async () => {
    if (!organizationId || !exercise) return;

    const setsValue = exercise.defaultSets ?? exercise.sets ?? null;
    const repsValue = exercise.defaultReps ?? exercise.reps ?? null;
    const durationValue = exercise.defaultDuration ?? exercise.duration ?? null;
    const restBetweenSetsValue = exercise.defaultRestBetweenSets ?? exercise.restSets ?? null;
    const restBetweenRepsValue = exercise.defaultRestBetweenReps ?? exercise.restReps ?? null;
    const sideValue = exercise.side || exercise.exerciseSide;
    const duplicatedExerciseName = getNextExerciseCopyName(exercise.name, organizationExerciseNames);

    try {
      const result = await createExercise({
        variables: {
          organizationId,
          scope: 'ORGANIZATION',
          name: duplicatedExerciseName,
          description: (exercise.patientDescription || exercise.description || '').trim(),
          type: exercise.type || 'reps',
          sets: setsValue,
          reps: repsValue,
          duration: durationValue,
          restSets: restBetweenSetsValue,
          restReps: restBetweenRepsValue,
          preparationTime: exercise.preparationTime ?? null,
          executionTime: exercise.defaultExecutionTime ?? exercise.executionTime ?? null,
          videoUrl: exercise.videoUrl || null,
          images: exercise.images?.length ? exercise.images : null,
          notes: exercise.notes || null,
          exerciseSide: sideValue && sideValue !== 'none' ? sideValue : null,
          mainTags: normalizeTagIds(exercise.mainTags),
          additionalTags: normalizeTagIds(exercise.additionalTags),
          tempo: exercise.tempo || null,
          clinicalDescription: exercise.clinicalDescription || null,
          audioCue: (exercise as { audioCue?: string }).audioCue || null,
          rangeOfMotion: (exercise as { rangeOfMotion?: string }).rangeOfMotion || null,
          isActive: true,
        },
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
  // AUTOSAVE + MEDIA HANDLERS
  // ============================================

  const handleFieldUpdate = useCallback(
    async (field: string, value: unknown) => {
      if (!exercise) return;

      if (field === 'enrichmentData') {
        try {
          await updateExerciseField({
            variables: { exerciseId: id, fieldName: 'enrichmentData', value: JSON.stringify(value ?? {}) },
          });
        } catch (err) {
          console.error('[ExerciseDetail] Autosave failed for field enrichmentData:', err);
          toast.error('Nie udało się zapisać zmian');
        }
        return;
      }

      const variables = buildUpdateVariables(id, field, value);
      if (!variables) {
        console.warn(`[ExerciseDetail] Unhandled autosave field: ${field}`);
        return;
      }

      try {
        await updateExercise({ variables });
      } catch (err) {
        console.error(`[ExerciseDetail] Autosave failed for field ${field}:`, err);
        toast.error('Nie udało się zapisać zmian');
      }
    },
    [exercise, id, updateExercise, updateExerciseField]
  );

  const {
    draft: enrichmentDraft,
    setPath: setEnrichmentPath,
    persist: persistEnrichmentDraft,
  } = useEnrichmentDraft({
    enrichmentData: exercise?.enrichmentData,
    onFieldChange: handleFieldUpdate,
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
        await uploadExerciseImage({
          variables: { exerciseId: id, base64Image, contentType: file.type },
        });
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
    if (!exercise?.name) return;

    const currentCount = exercise.images?.length ?? 0;
    if (currentCount >= 5) {
      toast.error('Maksymalna liczba zdjęć to 5');
      return;
    }

    setUploadingImage(true);
    try {
      const description = [exercise.patientDescription, exercise.description].filter(Boolean).join(' ');
      const generated = await aiService.generateExerciseImage(
        exercise.name,
        description,
        exercise.type?.toLowerCase() === 'time' ? 'time' : 'reps',
        'illustration'
      );

      const generatedFile = generated?.file;
      if (!generatedFile) {
        toast.error('Nie udało się wygenerować obrazu');
        return;
      }

      const base64Image = await fileToBase64(generatedFile);
      await uploadExerciseImage({
        variables: { exerciseId: id, base64Image, contentType: generatedFile.type || 'image/png' },
      });
      await apolloClient.refetchQueries({ include: [GET_EXERCISE_BY_ID_QUERY] });
      toast.success('Zdjęcie AI zostało wygenerowane');
    } catch (err) {
      console.error('[ExerciseDetail] AI image generation failed:', err);
      toast.error('Nie udało się wygenerować zdjęcia AI');
    } finally {
      setUploadingImage(false);
    }
  }, [exercise, id, uploadExerciseImage, fileToBase64, apolloClient]);

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
        <Button variant="outline" onClick={() => router.push('/exercises')}>
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

  // Check if exercise can be submitted to global review
  // Only for ORGANIZATION scope exercises that don't have an active global submission
  const canSubmitToGlobal = exercise.scope === 'ORGANIZATION' && !exercise.globalSubmissionId;
  const canSubmitToOrganization =
    exercise.scope === 'ORGANIZATION' &&
    (exercise.organizationVerificationStatus === 'NOT_SUBMITTED' ||
      exercise.organizationVerificationStatus === 'ORG_CHANGES_REQUESTED');

  // Status checks for verification workflow
  const isGlobalExercise = exercise.scope === 'GLOBAL';
  const hasGlobalSubmission = !!exercise.globalSubmissionId;
  const isPendingReview = exercise.status === 'PENDING_REVIEW';
  const isChangesRequested = exercise.status === 'CHANGES_REQUESTED';
  const isSubmittedToGlobal = hasGlobalSubmission && exercise.scope === 'ORGANIZATION';

  // Can resubmit when changes were requested
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
  const notes = exercise.notes || '';
  const hasMissingCoreInformation =
    !patientDescription.trim() || !physiotherapistDescription.trim() || imageItemsCount === 0;

  const isPendingOrganizationReview = exercise.organizationVerificationStatus === 'PENDING_ORG_REVIEW';
  const isLocked = isGlobalExercise || isPendingReview || isPendingOrganizationReview;
  const isEditing = isEditMode && !isLocked;
  const canEditMedia = isEditing;

  return (
    <div className="space-y-6">
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
                  <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer">
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
          {/* Verification Status Badges */}
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
            defaultValue={exercise.name}
            className="h-auto border-0 border-b border-border/60 bg-transparent px-0 text-2xl font-bold text-foreground shadow-none focus-visible:ring-0 focus-visible:border-primary rounded-none"
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next && next !== exercise.name) {
                handleFieldUpdate('name', next);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            data-testid="exercise-detail-name-input"
          />
        ) : (
          <h1 className="text-2xl font-bold text-foreground" data-testid="exercise-detail-name">
            {exercise.name}
          </h1>
        )}
      </div>

      {/* Feedback Banner for CHANGES_REQUESTED */}
      {isChangesRequested && exercise.adminReviewNotes && (
        <FeedbackBanner adminReviewNotes={exercise.adminReviewNotes} updatedAt={exercise.updatedAt} />
      )}

      {/* Hero Actions */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Dodaj do zestawu */}
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

        {/* Hero Action - Edytuj / Zapisz */}
        {!isLocked && (
          <button
            onClick={() => setIsEditMode((current) => !current)}
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
                <h3 className="text-base font-bold text-foreground">{isEditing ? 'Zapisz' : 'Edytuj ćwiczenie'}</h3>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? 'Zakończ edycję parametrów' : 'Zmień parametry i opisy'}
                </p>
              </div>
            </div>
          </button>
        )}
      </div>
      {hasMissingCoreInformation && (
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
        {/* Left column: media gallery + editable media controls */}
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

          {/* Editable media controls */}
          {canEditMedia && (
            <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 space-y-3" data-testid="exercise-detail-media-edit-section">
              <p className="text-sm font-semibold text-foreground">Zarządzaj zdjęciami</p>

              {/* Existing images with delete buttons */}
              {(exercise.images?.length ?? 0) > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {exercise.images?.map((imageUrl) => (
                    <div
                      key={imageUrl}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-border/40"
                    >
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
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

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || (exercise.images?.length ?? 0) >= 5}
                  data-testid="exercise-detail-upload-image-btn"
                >
                  {uploadingImage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Dodaj zdjęcie
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAIGenerateImage}
                  disabled={uploadingImage || !exercise.name || (exercise.images?.length ?? 0) >= 5}
                  data-testid="exercise-detail-ai-image-btn"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generuj AI
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

        <div className="space-y-4">
          {/* Wszystkie parametry wykonania — zawsze widoczne */}
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              Parametry wykonania
            </h2>
            <ExerciseParametersPanel
              source={normalizedFields}
              editable={isEditing}
              onFieldChange={isEditing ? handleFieldUpdate : undefined}
              summaryStat={exerciseDurationSummary}
            />
          </div>

          {/* Kroki wykonania */}
          <ExerciseExecutionSteps
            enrichmentData={enrichmentDraft}
            patientDescription={patientDescription}
            editable={isEditing}
            setPath={isEditing ? setEnrichmentPath : undefined}
            persist={isEditing ? persistEnrichmentDraft : undefined}
          />

          {/* Wskazówki głosowe */}
          <ExerciseAudioCues
            audioCue={audioCue}
            enrichmentData={enrichmentDraft}
            editable={isEditing}
            onAudioCueChange={isEditing ? (value) => handleFieldUpdate('audioCue', value) : undefined}
            setPath={isEditing ? setEnrichmentPath : undefined}
            persist={isEditing ? persistEnrichmentDraft : undefined}
          />

          {/* Informacje o ćwiczeniu */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Informacje o ćwiczeniu
            </h2>
            <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6">
              <Tabs defaultValue="patient" className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-surface-light/60 p-1">
                  <TabsTrigger value="patient" className="text-xs sm:text-sm" data-testid="exercise-detail-tab-patient">
                    Dla pacjenta
                  </TabsTrigger>
                  <TabsTrigger value="physio" className="text-xs sm:text-sm" data-testid="exercise-detail-tab-physio">
                    Dla fizjoterapeuty
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs sm:text-sm" data-testid="exercise-detail-tab-notes">
                    Notatki
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="patient">
                  <div className="rounded-xl bg-surface-light/30 p-4">
                    {isEditing ? (
                      <Textarea
                        defaultValue={patientDescription}
                        placeholder="Instrukcja dla pacjenta prostym językiem: co ma zrobić krok po kroku."
                        className="min-h-[140px] text-sm"
                        onBlur={(event) => {
                          if (event.target.value !== patientDescription) {
                            handleFieldUpdate('patientDescription', event.target.value);
                          }
                        }}
                        data-testid="exercise-detail-patient-description-input"
                      />
                    ) : patientDescription ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {patientDescription}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Brak opisu dla pacjenta.</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="physio">
                  <div className="rounded-xl bg-surface-light/30 p-4">
                    {isEditing ? (
                      <Textarea
                        defaultValue={physiotherapistDescription}
                        placeholder="Opis kliniczny dla fizjoterapeuty: cel, biomechanika, uwagi terapeutyczne."
                        className="min-h-[140px] text-sm"
                        onBlur={(event) => {
                          if (event.target.value !== physiotherapistDescription) {
                            handleFieldUpdate('clinicalDescription', event.target.value);
                          }
                        }}
                        data-testid="exercise-detail-clinical-description-input"
                      />
                    ) : physiotherapistDescription ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {physiotherapistDescription}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Brak opisu klinicznego dla fizjoterapeuty.</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="notes">
                  <div className="rounded-xl bg-surface-light/30 p-4">
                    {isEditing ? (
                      <Textarea
                        defaultValue={notes}
                        placeholder="Dodatkowe notatki terapeuty: na co szczególnie zwrócić uwagę przy wykonaniu."
                        className="min-h-[140px] text-sm"
                        onBlur={(event) => {
                          if (event.target.value !== notes) {
                            handleFieldUpdate('notes', event.target.value);
                          }
                        }}
                        data-testid="exercise-detail-notes-input"
                      />
                    ) : notes ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{notes}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Brak notatek.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Dane rozszerzone */}
          <EnrichmentDisplay
            enrichmentData={enrichmentDraft}
            editable={isEditing}
            setPath={isEditing ? setEnrichmentPath : undefined}
            persist={isEditing ? persistEnrichmentDraft : undefined}
          />
        </div>
      </div>

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

      {/* Submit to Global Dialog */}
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
