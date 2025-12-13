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
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseDialog } from '@/components/exercises/ExerciseDialog';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';

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
    } catch (error) {
      console.error('Błąd podczas usuwania:', error);
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

  const allImages = [exercise.imageUrl, ...(exercise.images || [])].filter(Boolean) as string[];
  const currentImage = allImages[selectedImageIndex] || null;

  const hasRestTimes =
    (exercise.restSets && exercise.restSets > 0) ||
    (exercise.restReps && exercise.restReps > 0) ||
    (exercise.preparationTime && exercise.preparationTime > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => router.push('/exercises')} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do ćwiczeń
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddToSet}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Dodaj do zestawu
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edytuj
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Image */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-light">
                {currentImage ? (
                  <img src={currentImage} alt={exercise.name} className="w-full h-full object-contain" />
                ) : (
                  <ImagePlaceholder type="exercise" className="h-full" iconClassName="h-16 w-16" />
                )}
                {exercise.type && <Badge className="absolute top-3 left-3">{getTypeLabel(exercise.type)}</Badge>}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? 'border-primary'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${exercise.name} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Video link */}
              {exercise.videoUrl && (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 mt-4 p-3 rounded-lg border border-border hover:bg-surface-light transition-colors"
                >
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Obejrzyj wideo</span>
                  <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle column - Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and description */}
          <div>
            <h1 className="text-2xl font-semibold">{exercise.name}</h1>
            <p className="text-muted-foreground mt-2">{exercise.description || 'Brak opisu'}</p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            {exercise.sets !== undefined && exercise.sets > 0 && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                <Repeat className="h-3.5 w-3.5" />
                {exercise.sets} serii
              </Badge>
            )}
            {exercise.reps !== undefined && exercise.reps > 0 && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                <Dumbbell className="h-3.5 w-3.5" />
                {exercise.reps} powtórzeń
              </Badge>
            )}
            {exercise.duration !== undefined && exercise.duration > 0 && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                <Clock className="h-3.5 w-3.5" />
                {exercise.duration}s
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {getSideLabel(exercise.exerciseSide)}
            </Badge>
          </div>

          {/* Tags */}
          {((exercise.mainTags?.length ?? 0) > 0 || (exercise.additionalTags?.length ?? 0) > 0) && (
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

          {/* Rest times */}
          {hasRestTimes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" />
                  Czasy i przerwy
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-3">
                {exercise.restSets !== undefined && exercise.restSets > 0 && (
                  <div className="p-3 rounded-lg bg-surface-light">
                    <p className="text-xs text-muted-foreground">Przerwa między seriami</p>
                    <p className="font-semibold">{exercise.restSets}s</p>
                  </div>
                )}
                {exercise.restReps !== undefined && exercise.restReps > 0 && (
                  <div className="p-3 rounded-lg bg-surface-light">
                    <p className="text-xs text-muted-foreground">Przerwa między powtórzeniami</p>
                    <p className="font-semibold">{exercise.restReps}s</p>
                  </div>
                )}
                {exercise.preparationTime !== undefined && exercise.preparationTime > 0 && (
                  <div className="p-3 rounded-lg bg-surface-light">
                    <p className="text-xs text-muted-foreground">Czas przygotowania</p>
                    <p className="font-semibold">{exercise.preparationTime}s</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {exercise.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Notatki
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap text-sm">{exercise.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
