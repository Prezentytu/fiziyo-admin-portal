'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Clock,
  Repeat,
  Dumbbell,
  Play,
  FolderPlus,
  ArrowLeftRight,
  FileText,
  MoreHorizontal,
  Timer,
  ZoomIn,
  Sparkles,
  Plus,
  ExternalLink,
  Rocket,
  AlertCircle,
  Globe,
  RefreshCw,
  Copy,
  ChevronDown,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseDialog } from '@/features/exercises/ExerciseDialog';
import { AddExerciseToSetsDialog } from '@/features/exercises/AddExerciseToSetsDialog';
import { SubmitToGlobalDialog } from '@/features/exercises/SubmitToGlobalDialog';
import { FeedbackBanner } from '@/features/exercises/FeedbackBanner';
import { ReportExerciseDialog } from '@/features/exercises/ReportExerciseDialog';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { getMediaUrls } from '@/utils/mediaUrl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  EMPTY_NUMERIC_VALUE,
  EXERCISE_FIELD_METADATA,
  formatFieldValueWithPlaceholder,
  normalizeExerciseFieldValues,
} from '@/components/shared/exercise';

import { GET_EXERCISE_BY_ID_QUERY, GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import {
  DELETE_EXERCISE_MUTATION,
  SUBMIT_TO_GLOBAL_REVIEW_MUTATION,
  RESUBMIT_FROM_ORIGINAL_MUTATION,
  CREATE_EXERCISE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { createTagsMap, mapExerciseTagsToObjects } from '@/utils/tagUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { ExerciseByIdResponse, ExerciseTagsResponse, TagCategoriesResponse } from '@/types/apollo';
import { translateExerciseSidePolish } from '@/components/pdf/polishUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getNextExerciseCopyName } from '@/features/exercises/utils/getNextExerciseCopyName';
import { calculateSeriesTimeSeconds } from '@/features/exercises/utils/calculateSeriesTime';
import { formatDurationPolish } from '@/utils/durationPolish';

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddToSetDialogOpen, setIsAddToSetDialogOpen] = useState(false);
  const [isSubmitToGlobalDialogOpen, setIsSubmitToGlobalDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isParametersOpen, setIsParametersOpen] = useState(false);

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
    setIsAddToSetDialogOpen(true);
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

  const allImages = getMediaUrls([exercise.imageUrl, ...(exercise.images || [])]);
  const currentImage = allImages[selectedImageIndex] || null;

  // Check if exercise can be submitted to global review
  // Only for ORGANIZATION scope exercises that don't have an active global submission
  const canSubmitToGlobal = exercise.scope === 'ORGANIZATION' && !exercise.globalSubmissionId;

  // Status checks for verification workflow
  const isGlobalExercise = exercise.scope === 'GLOBAL';
  const hasGlobalSubmission = !!exercise.globalSubmissionId;
  const isPendingReview = exercise.status === 'PENDING_REVIEW';
  const isChangesRequested = exercise.status === 'CHANGES_REQUESTED';
  const isSubmittedToGlobal = hasGlobalSubmission && exercise.scope === 'ORGANIZATION';

  // Can resubmit when changes were requested
  const canResubmit = isChangesRequested && hasGlobalSubmission;

  const normalizedFields = normalizeExerciseFieldValues(exercise);

  const computedSeriesTimeSeconds = calculateSeriesTimeSeconds({
    duration: normalizedFields.duration,
    reps: normalizedFields.reps,
    executionTime: normalizedFields.executionTime,
    restReps: normalizedFields.restReps,
  });

  const quickStats = [
    {
      id: 'sets',
      label: EXERCISE_FIELD_METADATA.sets.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.sets, normalizedFields),
      icon: Repeat,
      color: 'text-primary',
    },
    {
      id: 'reps',
      label: EXERCISE_FIELD_METADATA.reps.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.reps, normalizedFields),
      icon: Dumbbell,
      color: 'text-secondary',
    },
    ...(normalizedFields.executionTime
      ? [
          {
            id: 'executionTime',
            label: EXERCISE_FIELD_METADATA.executionTime.label,
            value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.executionTime, normalizedFields),
            icon: Clock,
            color: 'text-info',
          },
        ]
      : []),
    ...(computedSeriesTimeSeconds != null
      ? [
          {
            id: 'seriesTime',
            label:
              normalizedFields.duration && !normalizedFields.executionTime ? 'Czas serii' : 'Czas serii (wyliczany)',
            value: formatDurationPolish(computedSeriesTimeSeconds),
            icon: Timer,
            color: 'text-info',
          },
        ]
      : []),
  ];

  const detailStats = [
    {
      id: 'restBetweenSets',
      label: EXERCISE_FIELD_METADATA.restSets.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.restSets, normalizedFields),
      icon: Timer,
      color: 'text-orange-500',
    },
    {
      id: 'prep',
      label: EXERCISE_FIELD_METADATA.preparationTime.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.preparationTime, normalizedFields),
      icon: Clock,
      color: 'text-emerald-500',
    },
    {
      id: 'restBetweenReps',
      label: EXERCISE_FIELD_METADATA.restReps.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.restReps, normalizedFields),
      icon: Timer,
      color: 'text-cyan-500',
    },
    {
      id: 'tempo',
      label: EXERCISE_FIELD_METADATA.tempo.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.tempo, normalizedFields, 'Nie ustawiono'),
      icon: RefreshCw,
      color: 'text-violet',
    },
    {
      id: 'load',
      label: EXERCISE_FIELD_METADATA.load.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.load, normalizedFields, 'Nie ustawiono'),
      icon: Dumbbell,
      color: 'text-primary',
    },
    {
      id: 'side',
      label: EXERCISE_FIELD_METADATA.side.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.side, normalizedFields, 'Nie ustawiono'),
      icon: ArrowLeftRight,
      color: 'text-sky-500',
    },
    {
      id: 'rangeOfMotion',
      label: EXERCISE_FIELD_METADATA.rangeOfMotion.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.rangeOfMotion, normalizedFields, 'Nie ustawiono'),
      icon: Repeat,
      color: 'text-indigo-500',
    },
    {
      id: 'difficulty',
      label: EXERCISE_FIELD_METADATA.difficultyLevel.label,
      value: formatFieldValueWithPlaceholder(EXERCISE_FIELD_METADATA.difficultyLevel, normalizedFields, 'Nie ustawiono'),
      icon: Dumbbell,
      color: 'text-amber-500',
    },
  ];

  const patientDescription = exercise.patientDescription || exercise.description || '';
  const physiotherapistDescription = exercise.clinicalDescription || '';
  const audioCue = (exercise as { audioCue?: string }).audioCue || '';
  const notes = exercise.notes || '';
  const hasMissingCoreInformation = !patientDescription.trim() || !physiotherapistDescription.trim() || allImages.length === 0;

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-testid="exercise-detail-menu-trigger">
              Opcje
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} data-testid="exercise-detail-edit-btn">
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj ćwiczenie
            </DropdownMenuItem>
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
                  Zgłoś do bazy globalnej
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

      {/* Hero Section: Title + Meta */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
            <ArrowLeftRight className="mr-1 h-3 w-3" />
            {translateExerciseSidePolish(exercise.side || exercise.exerciseSide) || 'Bez podziału'}
          </Badge>
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
        <h1 className="text-2xl font-bold text-foreground" data-testid="exercise-detail-name">
          {exercise.name}
        </h1>
      </div>

      {/* Feedback Banner for CHANGES_REQUESTED */}
      {isChangesRequested && exercise.adminReviewNotes && (
        <FeedbackBanner adminReviewNotes={exercise.adminReviewNotes} updatedAt={exercise.updatedAt} />
      )}
      {hasMissingCoreInformation && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-foreground">Brak wszystkich informacji o ćwiczeniu</p>
              <p className="text-sm text-muted-foreground">
                Uzupełnij opis dla pacjenta, opis kliniczny i media, aby ćwiczenie było kompletne.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Action + Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Dodaj do zestawu */}
        <button
          onClick={handleAddToSet}
          className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer sm:col-span-1 lg:col-span-4"
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
          className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-left transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 hover:scale-[1.01] cursor-pointer sm:col-span-1 lg:col-span-4"
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

        {/* Quick Stats */}
        <div
          className={cn(
            'grid gap-3 sm:col-span-1 lg:col-span-12',
            quickStats.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
          )}
        >
          {quickStats.map((metric) => (
            <div
              key={metric.id}
              className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center"
            >
              <div className="flex items-center gap-2">
                <metric.icon className={cn('h-4 w-4', metric.color)} />
                <span className="text-2xl font-bold text-foreground tabular-nums">{metric.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
      <Collapsible open={isParametersOpen} onOpenChange={setIsParametersOpen}>
        <div className="rounded-2xl border border-border/40 bg-surface/50">
          <CollapsibleTrigger
            className="flex w-full items-center justify-between p-4 text-left hover:bg-surface-light/40 transition-colors"
            data-testid="exercise-detail-advanced-params-toggle"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Szczegóły parametrów</p>
              <p className="text-xs text-muted-foreground">Rozwiń, aby zobaczyć wszystkie parametry wykonania</p>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isParametersOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-3 border-t border-border/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {detailStats.map((metric) => (
                <div key={metric.id} className="rounded-xl bg-surface-light/40 p-3">
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <metric.icon className={cn('h-4 w-4', metric.color)} />
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        metric.value === EMPTY_NUMERIC_VALUE ? 'text-muted-foreground' : 'text-foreground'
                      )}
                    >
                      {metric.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Media Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            Zdjęcia i media
          </h2>
          {currentImage && (
            <Button variant="ghost" size="sm" onClick={() => setLightboxOpen(true)} className="gap-2">
              <ZoomIn className="h-4 w-4" />
              Powiększ
            </Button>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-surface/50 overflow-hidden">
          {currentImage ? (
            <div className="relative group">
              {/* Main Image */}
              <button
                type="button"
                className="relative aspect-video w-full bg-black/5 dark:bg-black/20 cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              >
                <Image src={currentImage} alt={exercise.name} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 800px" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
                    <ZoomIn className="h-6 w-6" />
                  </div>
                </div>
              </button>

              {/* Thumbnails */}
              {(allImages.length > 1 || exercise.videoUrl) && (
                <div className="flex gap-2 p-3 border-t border-border/40 overflow-x-auto">
                  {allImages.map((img, idx) => (
                    <button
                      key={img}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        'relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                        selectedImageIndex === idx
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-border'
                      )}
                    >
                      <Image src={img} alt={`${exercise.name} - ${idx + 1}`} fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                  {exercise.videoUrl && (
                    <a
                      href={exercise.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-transparent bg-surface-light flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Play className="h-6 w-6 text-muted-foreground" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <ImagePlaceholder type="exercise" className="h-24 w-24 opacity-30" iconClassName="h-16 w-16" />
            </div>
          )}
        </div>
      </div>

      {/* Information Sections */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Informacje o ćwiczeniu
        </h2>
        <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6">
          <Tabs defaultValue="patient" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-surface-light/60 p-1 sm:grid-cols-4">
              <TabsTrigger value="patient" className="text-xs sm:text-sm" data-testid="exercise-detail-tab-patient">
                Dla pacjenta
              </TabsTrigger>
              <TabsTrigger value="physio" className="text-xs sm:text-sm" data-testid="exercise-detail-tab-physio">
                Dla fizjoterapeuty
              </TabsTrigger>
              <TabsTrigger value="audio" className="text-xs sm:text-sm" data-testid="exercise-detail-tab-audio">
                Polecenia audio
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs sm:text-sm" data-testid="exercise-detail-tab-notes">
                Notatki
              </TabsTrigger>
            </TabsList>
            <TabsContent value="patient">
              <div className="rounded-xl bg-surface-light/30 p-4">
                {patientDescription ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{patientDescription}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak opisu dla pacjenta.</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="physio">
              <div className="rounded-xl bg-surface-light/30 p-4">
                {physiotherapistDescription ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {physiotherapistDescription}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak opisu klinicznego dla fizjoterapeuty.</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="audio">
              <div className="rounded-xl bg-surface-light/30 p-4">
                {audioCue ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{audioCue}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak podpowiedzi głosowej.</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="notes">
              <div className="rounded-xl bg-surface-light/30 p-4">
                {notes ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak notatek.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      {organizationId && (
        <ExerciseDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          exercise={exercise}
          organizationId={organizationId}
          onSuccess={(event) => {
            if (event?.action === 'copied' && event.exerciseId) {
              router.push(`/exercises/${event.exerciseId}`);
            }
          }}
        />
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

      {/* Add to Set Dialog with AI */}
      <AddExerciseToSetsDialog open={isAddToSetDialogOpen} onOpenChange={setIsAddToSetDialogOpen} exercise={exercise} />

      {/* Image Lightbox */}
      {currentImage && (
        <ImageLightbox
          src={currentImage}
          alt={exercise.name}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          images={allImages.length > 1 ? allImages : undefined}
          currentIndex={selectedImageIndex}
          onIndexChange={setSelectedImageIndex}
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

      <ReportExerciseDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        exercise={exercise}
        organizationId={organizationId}
      />
    </div>
  );
}
