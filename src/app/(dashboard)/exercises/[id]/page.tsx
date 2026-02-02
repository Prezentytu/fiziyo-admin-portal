'use client';

import { use, useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseDialog } from '@/components/exercises/ExerciseDialog';
import { AddExerciseToSetsDialog } from '@/components/exercises/AddExerciseToSetsDialog';
import { SubmitToGlobalDialog } from '@/components/exercises/SubmitToGlobalDialog';
import { FeedbackBanner } from '@/components/exercises/FeedbackBanner';
import { ColorBadge } from '@/components/shared/ColorBadge';
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

import { GET_EXERCISE_BY_ID_QUERY, GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import { DELETE_EXERCISE_MUTATION, SUBMIT_TO_GLOBAL_REVIEW_MUTATION, RESUBMIT_FROM_ORIGINAL_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { createTagsMap, mapExerciseTagsToObjects } from '@/utils/tagUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useExerciseBuilder } from '@/contexts/ExerciseBuilderContext';
import type {
  ExerciseByIdResponse,
  ExerciseTagsResponse,
  TagCategoriesResponse,
} from '@/types/apollo';
import { translateExerciseTypeShort, translateExerciseSidePolish } from '@/components/pdf/polishUtils';

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
  const { setIsChatOpen } = useExerciseBuilder();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddToSetDialogOpen, setIsAddToSetDialogOpen] = useState(false);
  const [isSubmitToGlobalDialogOpen, setIsSubmitToGlobalDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get exercise details
  const { data, loading, error } = useQuery(GET_EXERCISE_BY_ID_QUERY, {
    variables: { id },
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
    refetchQueries: [
      { query: GET_EXERCISE_BY_ID_QUERY, variables: { id } },
    ],
  });

  // Resubmit after changes mutation
  const [resubmitFromOriginal, { loading: resubmitting }] = useMutation(RESUBMIT_FROM_ORIGINAL_MUTATION, {
    refetchQueries: [
      { query: GET_EXERCISE_BY_ID_QUERY, variables: { id } },
    ],
  });

  const rawExercise = (data as ExerciseByIdResponse)?.exerciseById;
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

  const hasTags = (exercise.mainTags?.length ?? 0) > 0 || (exercise.additionalTags?.length ?? 0) > 0;

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

  // Metrics for Quick Stats
  const metrics = [
    { id: 'sets', label: 'Serie', value: exercise.sets, icon: Repeat, color: 'text-primary' },
    { id: 'reps', label: 'Powtórzenia', value: exercise.reps, icon: Dumbbell, color: 'text-secondary' },
    { id: 'duration', label: 'Czas', value: exercise.duration ? `${exercise.duration}s` : null, icon: Clock, color: 'text-info' },
    { id: 'rest', label: 'Przerwa', value: exercise.restSets ? `${exercise.restSets}s` : null, icon: Timer, color: 'text-orange-500' },
    { id: 'prep', label: 'Przygotowanie', value: exercise.preparationTime ? `${exercise.preparationTime}s` : null, icon: Clock, color: 'text-emerald-500' },
  ].filter(m => m.value);

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
            <DropdownMenuItem onClick={() => setIsChatOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Asystent AI
            </DropdownMenuItem>
            {exercise.videoUrl && (
              <DropdownMenuItem asChild>
                <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Otwórz wideo
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
                  <RefreshCw className={cn("mr-2 h-4 w-4", resubmitting && "animate-spin")} />
                  Zgłoś ponownie do weryfikacji
                </DropdownMenuItem>
              </>
            )}
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
          {exercise.type && (
            <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
              {translateExerciseTypeShort(exercise.type)}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
            <ArrowLeftRight className="mr-1 h-3 w-3" />
            {translateExerciseSidePolish(exercise.side || exercise.exerciseSide) || 'Bez podziału'}
          </Badge>
          {/* Verification Status Badges */}
          {isGlobalExercise && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-violet-500/10 text-violet-600 border-violet-500/20">
              <Sparkles className="mr-1 h-3 w-3" />
              FiziYo
            </Badge>
          )}
          {isSubmittedToGlobal && !isPendingReview && !isChangesRequested && !isGlobalExercise && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Globe className="mr-1 h-3 w-3" />
              W FiziYo
            </Badge>
          )}
          {isPendingReview && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Clock className="mr-1 h-3 w-3" />
              Weryfikacja
            </Badge>
          )}
          {isChangesRequested && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-orange-500/10 text-orange-600 border-orange-500/20">
              <AlertCircle className="mr-1 h-3 w-3" />
              Do poprawy
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="exercise-detail-name">
          {exercise.name}
        </h1>
        {hasTags && (
          <div className="flex flex-wrap gap-2 pt-1">
            {exercise.mainTags?.map((tag) => (
              isTagObject(tag) ? (
                <ColorBadge
                  key={tag.id}
                  color={tag.color}
                  className="text-[10px] uppercase font-medium tracking-wider"
                  variant="outline"
                >
                  {tag.name}
                </ColorBadge>
              ) : (
                <Badge key={tag} variant="outline" className="text-[10px] uppercase font-medium tracking-wider opacity-60">
                  {tag}
                </Badge>
              )
            ))}
            {exercise.additionalTags?.map((tag) => (
              isTagObject(tag) ? (
                <ColorBadge
                  key={tag.id}
                  color={tag.color}
                  className="text-[10px] uppercase font-medium tracking-wider opacity-60"
                  variant="outline"
                >
                  {tag.name}
                </ColorBadge>
              ) : (
                <Badge key={tag} variant="outline" className="text-[10px] uppercase font-medium tracking-wider opacity-40">
                  {tag}
                </Badge>
              )
            ))}
          </div>
        )}
      </div>

      {/* Feedback Banner for CHANGES_REQUESTED */}
      {isChangesRequested && exercise.adminReviewNotes && (
        <FeedbackBanner
          adminReviewNotes={exercise.adminReviewNotes}
          updatedAt={exercise.updatedAt}
        />
      )}

      {/* Hero Action + Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Dodaj do zestawu */}
        <button
          onClick={handleAddToSet}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer sm:col-span-1 lg:col-span-4"
          data-testid="exercise-detail-add-to-set-btn"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <FolderPlus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">
                Dodaj do zestawu
              </h3>
              <p className="text-sm text-white/70">
                Użyj w programie
              </p>
            </div>
            <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
          </div>
        </button>

        {/* Quick Stats */}
        <div className={cn(
          "grid gap-3 sm:col-span-1 lg:col-span-8",
          metrics.length <= 3 ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-5"
        )}>
          {metrics.slice(0, 5).map((metric) => (
            <div
              key={metric.id}
              className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center"
            >
              <div className="flex items-center gap-2">
                <metric.icon className={cn("h-4 w-4", metric.color)} />
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {metric.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

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
                <img
                  src={currentImage}
                  alt={exercise.name}
                  className="w-full h-full object-contain"
                />
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
                        'shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                        selectedImageIndex === idx
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-border'
                      )}
                    >
                      <img src={img} alt={`${exercise.name} - ${idx + 1}`} className="w-full h-full object-cover" />
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

      {/* Description Section */}
      {exercise.description && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Opis ćwiczenia
          </h2>
          <div className="rounded-2xl border border-border/40 bg-surface/50 p-6">
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {exercise.description}
            </p>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {exercise.notes && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Notatki
          </h2>
          <div className="rounded-2xl border border-border/40 bg-surface/50 p-6">
            <div className="relative pl-4 border-l-2 border-primary/30">
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed italic">
                &quot;{exercise.notes}&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {organizationId && (
        <ExerciseDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          exercise={exercise}
          organizationId={organizationId}
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
      <AddExerciseToSetsDialog
        open={isAddToSetDialogOpen}
        onOpenChange={setIsAddToSetDialogOpen}
        exercise={exercise}
      />

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
    </div>
  );
}
