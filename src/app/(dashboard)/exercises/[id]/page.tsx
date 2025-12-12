"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";
import { ColorBadge } from "@/components/shared/ColorBadge";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";

import {
  GET_EXERCISE_BY_ID_QUERY,
  GET_ORGANIZATION_EXERCISES_QUERY,
} from "@/graphql/queries/exercises.queries";
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from "@/graphql/queries/exerciseTags.queries";
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from "@/graphql/queries/tagCategories.queries";
import { DELETE_EXERCISE_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import { createTagsMap, mapExerciseTagsToObjects } from "@/utils/tagUtils";
import type {
  UserByClerkIdResponse,
  ExerciseByIdResponse,
  ExerciseTagsResponse,
  TagCategoriesResponse,
} from "@/types/apollo";

interface ExerciseDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ExerciseTag {
  id: string;
  name: string;
  color: string;
}

function isTagObject(tag: string | ExerciseTag): tag is ExerciseTag {
  return typeof tag === "object" && "name" in tag;
}

export default function ExerciseDetailPage({
  params,
}: ExerciseDetailPageProps) {
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

  const organizationId = (userData as UserByClerkIdResponse)?.userByClerkId
    ?.organizationIds?.[0];

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
  const { data: categoriesData } = useQuery(
    GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  // Delete mutation
  const [deleteExercise, { loading: deleting }] = useMutation(
    DELETE_EXERCISE_MUTATION,
    {
      refetchQueries: organizationId
        ? [
            {
              query: GET_ORGANIZATION_EXERCISES_QUERY,
              variables: { organizationId },
            },
          ]
        : [],
    }
  );

  const rawExercise = (data as ExerciseByIdResponse)?.exerciseById;
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories =
    (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

  // Map tag IDs to full tag objects (with colors resolved from categories)
  const tagsMap = createTagsMap(tags, categories);
  const exercise = rawExercise
    ? mapExerciseTagsToObjects(rawExercise, tagsMap)
    : null;

  const handleDelete = async () => {
    try {
      await deleteExercise({
        variables: { exerciseId: id },
      });
      toast.success("Ćwiczenie zostało usunięte");
      router.push("/exercises");
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć ćwiczenia");
    }
  };

  const handleAddToSet = () => {
    // TODO: Implement add to set dialog
    toast.info("Funkcja dodawania do zestawu - wkrótce dostępna");
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "reps":
        return "Powtórzenia";
      case "time":
        return "Czasowe";
      case "hold":
        return "Utrzymywanie";
      default:
        return type || "Inne";
    }
  };

  const getSideLabel = (side?: string) => {
    switch (side) {
      case "left":
        return "Lewa strona";
      case "right":
        return "Prawa strona";
      case "both":
        return "Obie strony";
      case "alternating":
        return "Naprzemiennie";
      default:
        return "Bez podziału";
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
        <p className="text-destructive">
          {error ? `Błąd: ${error.message}` : "Nie znaleziono ćwiczenia"}
        </p>
        <Button variant="outline" onClick={() => router.push("/exercises")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do listy
        </Button>
      </div>
    );
  }

  const allImages = [exercise.imageUrl, ...(exercise.images || [])].filter(
    Boolean
  ) as string[];
  const currentImage = allImages[selectedImageIndex] || null;

  const hasRestTimes =
    (exercise.restSets && exercise.restSets > 0) ||
    (exercise.restReps && exercise.restReps > 0) ||
    (exercise.preparationTime && exercise.preparationTime > 0);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <Button variant="ghost" onClick={() => router.push("/exercises")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleAddToSet}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Dodaj do zestawu
            </Button>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          {/* Main content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

            {/* Hero section */}
            <div className="relative rounded-2xl overflow-hidden bg-surface-light min-h-[400px] lg:min-h-[500px]">
              {/* Background image with blur */}
              {currentImage && (
                <div
                  className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110"
                  style={{ backgroundImage: `url(${currentImage})` }}
                />
              )}

              <div className="relative h-full p-6 lg:p-8">
                {/* Main hero content - responsive grid */}
                <div className="h-full flex flex-col lg:flex-row gap-8">
                  {/* Image gallery - responsive sizing */}
                  <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 space-y-4">
                    <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-surface shadow-lg">
                      {currentImage ? (
                        <img
                          src={currentImage}
                          alt={exercise.name}
                          className="w-full h-full object-contain bg-white/5"
                        />
                      ) : (
                        <ImagePlaceholder
                          type="exercise"
                          className="h-full"
                          iconClassName="h-20 w-20"
                        />
                      )}

                      {/* Type badge overlay */}
                      {exercise.type && (
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm text-sm px-3 py-1">
                            {getTypeLabel(exercise.type)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Thumbnails and video link row */}
                    <div className="flex items-center gap-3">
                      {/* Thumbnails */}
                      {allImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto flex-1">
                          {allImages.map((img, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImageIndex(index)}
                              className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all hover:scale-105 ${
                                selectedImageIndex === index
                                  ? "ring-2 ring-primary ring-offset-2 ring-offset-surface-light"
                                  : "opacity-60 hover:opacity-100"
                              }`}
                            >
                              <img
                                src={img}
                                alt={`${exercise.name} ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
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
                          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/20 hover:bg-black/30 transition-colors text-primary shrink-0"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
                            <Play className="h-4 w-4" />
                          </div>
                          <div className="hidden sm:block">
                            <span className="font-medium text-sm">
                              Obejrzyj wideo
                            </span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Exercise info - takes remaining space */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center space-y-6">
                    {/* Title and description */}
                    <div className="space-y-3">
                      <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
                        {exercise.name}
                      </h1>
                      <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                        {exercise.description || "Brak opisu"}
                      </p>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {exercise.sets !== undefined && exercise.sets > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 backdrop-blur-sm">
                          <Repeat className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-lg">{exercise.sets}</div>
                            <div className="text-xs text-muted-foreground">serii</div>
                          </div>
                        </div>
                      )}
                      {exercise.reps !== undefined && exercise.reps > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 backdrop-blur-sm">
                          <Dumbbell className="h-5 w-5 text-secondary shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-lg">{exercise.reps}</div>
                            <div className="text-xs text-muted-foreground">powtórzeń</div>
                          </div>
                        </div>
                      )}
                      {exercise.duration !== undefined && exercise.duration > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 backdrop-blur-sm">
                          <Clock className="h-5 w-5 text-info shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-lg">{exercise.duration}</div>
                            <div className="text-xs text-muted-foreground">sekund</div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 backdrop-blur-sm">
                        <ArrowLeftRight className="h-5 w-5 text-warning shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {getSideLabel(exercise.exerciseSide)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {((exercise.mainTags?.length ?? 0) > 0 ||
                      (exercise.additionalTags?.length ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {exercise.mainTags?.map(
                          (tag: string | ExerciseTag, index: number) => {
                            if (isTagObject(tag)) {
                              return (
                                <ColorBadge key={tag.id} color={tag.color} size="lg">
                                  {tag.name}
                                </ColorBadge>
                              );
                            }
                            return (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-sm px-3 py-1"
                              >
                                {tag}
                              </Badge>
                            );
                          }
                        )}
                        {exercise.additionalTags?.map(
                          (tag: string | ExerciseTag, index: number) => {
                            if (isTagObject(tag)) {
                              return (
                                <ColorBadge key={tag.id} color={tag.color} size="lg">
                                  {tag.name}
                                </ColorBadge>
                              );
                            }
                            return (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-sm px-3 py-1"
                              >
                                {tag}
                              </Badge>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            </div>
          </div>

          {/* Sidebar with additional details */}
          {(hasRestTimes || exercise.notes) && (
            <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/50 bg-surface/30">
              <div className="p-6 space-y-6">
                {/* Rest times */}
                {hasRestTimes && (
                  <Card className="bg-surface border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4 text-primary" />
                        Czasy i przerwy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {exercise.restSets !== undefined && exercise.restSets > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-light">
                            <span className="text-sm text-muted-foreground">
                              Przerwa między seriami
                            </span>
                            <span className="font-semibold">
                              {exercise.restSets}s
                            </span>
                          </div>
                        )}
                        {exercise.restReps !== undefined && exercise.restReps > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-light">
                            <span className="text-sm text-muted-foreground">
                              Przerwa między powtórzeniami
                            </span>
                            <span className="font-semibold">
                              {exercise.restReps}s
                            </span>
                          </div>
                        )}
                        {exercise.preparationTime !== undefined &&
                          exercise.preparationTime > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-light">
                              <span className="text-sm text-muted-foreground">
                                Czas przygotowania
                              </span>
                              <span className="font-semibold">
                                {exercise.preparationTime}s
                              </span>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {exercise.notes && (
                  <Card className="bg-surface border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-primary" />
                        Notatki
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                        {exercise.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
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
