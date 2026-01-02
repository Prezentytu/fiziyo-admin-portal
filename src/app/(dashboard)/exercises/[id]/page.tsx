'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Clock,
  Repeat,
  Dumbbell,
  Play,
  ExternalLink,
  FolderPlus,
  ArrowLeftRight,
  FileText,
  MoreHorizontal,
  ChevronDown,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseDialog } from '@/components/exercises/ExerciseDialog';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl, getMediaUrls } from '@/utils/mediaUrl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import { GET_EXERCISE_BY_ID_QUERY, GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import { DELETE_EXERCISE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { createTagsMap, mapExerciseTagsToObjects } from '@/utils/tagUtils';
import type {
  UserByClerkIdResponse,
  ExerciseByIdResponse,
  ExerciseTagsResponse,
  TagCategoriesResponse,
} from '@/types/apollo';

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
  const { user } = useUser();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isTimesOpen, setIsTimesOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Get user data for organizationId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organizationId = (userData as UserByClerkIdResponse)?.userByClerkId?.organizationIds?.[0];

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
    // TODO: Implement add to set dialog
    toast.info('Funkcja dodawania do zestawu - wkrótce dostępna');
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'reps':
        return 'Powtórzenia';
      case 'time':
        return 'Czasowe';
      case 'hold':
        return 'Utrzymywanie';
      default:
        return type || 'Inne';
    }
  };

  const getSideLabel = (side?: string) => {
    switch (side) {
      case 'left':
        return 'Lewa strona';
      case 'right':
        return 'Prawa strona';
      case 'both':
        return 'Obie strony';
      case 'alternating':
        return 'Naprzemiennie';
      default:
        return 'Bez podziału';
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
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-2">
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

  const hasRestTimes =
    (exercise.restSets && exercise.restSets > 0) ||
    (exercise.restReps && exercise.restReps > 0) ||
    (exercise.preparationTime && exercise.preparationTime > 0);

  const hasTags = (exercise.mainTags?.length ?? 0) > 0 || (exercise.additionalTags?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/exercises')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Powrót do ćwiczeń
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Opcje
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hero Section: Image + Action + Stats */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Hero Image */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-surface-light">
            {currentImage ? (
              <>
                <img 
                  src={currentImage} 
                  alt={exercise.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </>
            ) : (
              <ImagePlaceholder type="exercise" className="h-full" iconClassName="h-16 w-16" />
            )}
            
            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2">
                {exercise.type && (
                  <Badge className="bg-primary/90 text-primary-foreground border-0">
                    {getTypeLabel(exercise.type)}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-black/40 text-white border-white/20 backdrop-blur-sm">
                  <ArrowLeftRight className="mr-1 h-3 w-3" />
                  {getSideLabel(exercise.exerciseSide)}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white">{exercise.name}</h1>
            </div>
          </div>

          {/* Thumbnails + Video */}
          {(allImages.length > 1 || exercise.videoUrl) && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all',
                    selectedImageIndex === index
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border/40 opacity-60 hover:opacity-100 hover:border-border'
                  )}
                >
                  <img src={img} alt={`${exercise.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              {exercise.videoUrl && (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-border/40 bg-surface flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all group"
                >
                  <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Hero Action + Quick Stats */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Hero Action - Dodaj do zestawu */}
          <button
            onClick={handleAddToSet}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
            
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
                <FolderPlus className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white">
                  Dodaj do zestawu
                </h3>
                <p className="text-sm text-white/70">
                  Przypisz ćwiczenie do programu
                </p>
              </div>
            </div>
          </button>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/40 bg-surface/50 p-4 text-center">
              <Repeat className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">
                {exercise.sets !== undefined && exercise.sets > 0 ? exercise.sets : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Serii</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-surface/50 p-4 text-center">
              <Dumbbell className="h-5 w-5 text-secondary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">
                {exercise.reps !== undefined && exercise.reps > 0 ? exercise.reps : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Powtórzeń</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-surface/50 p-4 text-center">
              <Clock className="h-5 w-5 text-info mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">
                {exercise.duration !== undefined && exercise.duration > 0 ? `${exercise.duration}s` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Czas</p>
            </div>
          </div>

          {/* Video link (if no thumbnails shown) */}
          {exercise.videoUrl && allImages.length <= 1 && (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-surface/50 hover:bg-surface-light hover:border-primary/30 transition-all group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Play className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Obejrzyj wideo</p>
                <p className="text-xs text-muted-foreground">Instrukcja wykonania</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>

      {/* Description */}
      {exercise.description && (
        <div className="rounded-xl border border-border/40 bg-surface/50 p-5">
          <p className="text-muted-foreground leading-relaxed">{exercise.description}</p>
        </div>
      )}

      {/* Tags */}
      {hasTags && (
        <div className="flex flex-wrap gap-2">
          {exercise.mainTags?.map((tag: string | ExerciseTag, index: number) => {
            if (isTagObject(tag)) {
              return (
                <ColorBadge key={tag.id} color={tag.color}>
                  {tag.name}
                </ColorBadge>
              );
            }
            return (
              <Badge key={index} variant="secondary">
                {tag}
              </Badge>
            );
          })}
          {exercise.additionalTags?.map((tag: string | ExerciseTag, index: number) => {
            if (isTagObject(tag)) {
              return (
                <ColorBadge key={tag.id} color={tag.color}>
                  {tag.name}
                </ColorBadge>
              );
            }
            return (
              <Badge key={index} variant="outline">
                {tag}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Collapsible: Times & Rests */}
      {hasRestTimes && (
        <Collapsible open={isTimesOpen} onOpenChange={setIsTimesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl border border-border/40 bg-surface/50 hover:bg-surface-light transition-colors group">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
                <Timer className="h-4 w-4 text-info" />
              </div>
              <span className="font-medium text-foreground">Czasy i przerwy</span>
            </div>
            <ChevronDown className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              isTimesOpen && 'rotate-180'
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="grid gap-2 sm:grid-cols-3 p-4 rounded-xl border border-border/40 bg-surface/30">
              {exercise.restSets !== undefined && exercise.restSets > 0 && (
                <div className="p-3 rounded-lg bg-surface-light">
                  <p className="text-xs text-muted-foreground">Przerwa między seriami</p>
                  <p className="font-semibold text-foreground">{exercise.restSets}s</p>
                </div>
              )}
              {exercise.restReps !== undefined && exercise.restReps > 0 && (
                <div className="p-3 rounded-lg bg-surface-light">
                  <p className="text-xs text-muted-foreground">Przerwa między powtórzeniami</p>
                  <p className="font-semibold text-foreground">{exercise.restReps}s</p>
                </div>
              )}
              {exercise.preparationTime !== undefined && exercise.preparationTime > 0 && (
                <div className="p-3 rounded-lg bg-surface-light">
                  <p className="text-xs text-muted-foreground">Czas przygotowania</p>
                  <p className="font-semibold text-foreground">{exercise.preparationTime}s</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Collapsible: Notes */}
      {exercise.notes && (
        <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl border border-border/40 bg-surface/50 hover:bg-surface-light transition-colors group">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                <FileText className="h-4 w-4 text-secondary" />
              </div>
              <span className="font-medium text-foreground">Notatki</span>
            </div>
            <ChevronDown className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              isNotesOpen && 'rotate-180'
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="p-4 rounded-xl border border-border/40 bg-surface/30">
              <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {exercise.notes}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
    </div>
  );
}
