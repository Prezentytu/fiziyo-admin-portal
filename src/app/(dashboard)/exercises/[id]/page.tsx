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
  Image as ImageIcon,
  Tag,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";
import { ColorBadge } from "@/components/shared/ColorBadge";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";

import { GET_EXERCISE_BY_ID_QUERY, GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { DELETE_EXERCISE_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import type { UserByClerkIdResponse, ExerciseByIdResponse } from "@/types/apollo";

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

  // Delete mutation
  const [deleteExercise, { loading: deleting }] = useMutation(DELETE_EXERCISE_MUTATION, {
    refetchQueries: organizationId
      ? [{ query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } }]
      : [],
  });

  const exercise = (data as ExerciseByIdResponse)?.exerciseById;

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

  const allImages = [exercise.imageUrl, ...(exercise.images || [])].filter(Boolean) as string[];
  const currentImage = allImages[selectedImageIndex] || null;

  return (
    <div className="space-y-8">
      {/* Hero section with image */}
      <div className="relative rounded-2xl overflow-hidden bg-surface-light">
        {/* Background image with blur */}
        {currentImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
            style={{ backgroundImage: `url(${currentImage})` }}
          />
        )}
        
        <div className="relative p-6 md:p-8">
          {/* Navigation and actions */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push("/exercises")}
              className="bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditDialogOpen(true)}
                className="bg-black/20 hover:bg-black/40 backdrop-blur-sm border-white/20"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </Button>
            </div>
          </div>

          {/* Main hero content */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Image gallery */}
            <div className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlaceholder type="exercise" className="h-full" iconClassName="h-16 w-16" />
                )}
                
                {/* Type badge overlay */}
                {exercise.type && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm">
                      {getTypeLabel(exercise.type)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
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
            </div>

            {/* Exercise info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{exercise.name}</h1>
                <p className="text-muted-foreground text-lg">
                  {exercise.description || "Brak opisu"}
                </p>
              </div>

              {/* Tags */}
              {((exercise.mainTags?.length ?? 0) > 0 || (exercise.additionalTags?.length ?? 0) > 0) && (
                <div className="flex flex-wrap gap-2">
                  {exercise.mainTags?.map((tag: string | ExerciseTag, index: number) => {
                    if (isTagObject(tag)) {
                      return <ColorBadge key={tag.id} color={tag.color}>{tag.name}</ColorBadge>;
                    }
                    return <Badge key={index}>{tag}</Badge>;
                  })}
                  {exercise.additionalTags?.map((tag: string | ExerciseTag, index: number) => {
                    if (isTagObject(tag)) {
                      return <ColorBadge key={tag.id} color={tag.color}>{tag.name}</ColorBadge>;
                    }
                    return <Badge key={index} variant="outline">{tag}</Badge>;
                  })}
                </div>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-4">
                {exercise.sets !== undefined && exercise.sets > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm">
                    <div className="stats-icon">
                      <Repeat className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{exercise.sets}</p>
                      <p className="text-sm text-muted-foreground">serii</p>
                    </div>
                  </div>
                )}
                {exercise.reps !== undefined && exercise.reps > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm">
                    <div className="stats-icon-secondary">
                      <Dumbbell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{exercise.reps}</p>
                      <p className="text-sm text-muted-foreground">powtórzeń</p>
                    </div>
                  </div>
                )}
                {exercise.duration !== undefined && exercise.duration > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm">
                    <div className="stats-icon-info">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{exercise.duration}</p>
                      <p className="text-sm text-muted-foreground">sekund</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 backdrop-blur-sm">
                  <div className="stats-icon-warning">
                    <Dumbbell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getSideLabel(exercise.exerciseSide)}</p>
                    <p className="text-sm text-muted-foreground">strona ciała</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Rest times */}
          {(exercise.restSets || exercise.restReps || exercise.preparationTime) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Czasy i przerwy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {exercise.restSets !== undefined && exercise.restSets > 0 && (
                    <div className="p-4 rounded-xl bg-surface-light">
                      <p className="text-2xl font-bold">{exercise.restSets}s</p>
                      <p className="text-sm text-muted-foreground">przerwa między seriami</p>
                    </div>
                  )}
                  {exercise.restReps !== undefined && exercise.restReps > 0 && (
                    <div className="p-4 rounded-xl bg-surface-light">
                      <p className="text-2xl font-bold">{exercise.restReps}s</p>
                      <p className="text-sm text-muted-foreground">przerwa między powtórzeniami</p>
                    </div>
                  )}
                  {exercise.preparationTime !== undefined && exercise.preparationTime > 0 && (
                    <div className="p-4 rounded-xl bg-surface-light">
                      <p className="text-2xl font-bold">{exercise.preparationTime}s</p>
                      <p className="text-sm text-muted-foreground">czas przygotowania</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {exercise.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notatki</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {exercise.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Video */}
          {exercise.videoUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  Wideo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-4 rounded-xl bg-surface-light hover:bg-surface-hover transition-colors text-primary"
                >
                  <Play className="h-5 w-5" />
                  <span className="flex-1">Obejrzyj wideo</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Tags detail */}
          {((exercise.mainTags?.length ?? 0) > 0 || (exercise.additionalTags?.length ?? 0) > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Tagi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(exercise.mainTags?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Główne</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.mainTags?.map((tag: string | ExerciseTag, index: number) => {
                        if (isTagObject(tag)) {
                          return <ColorBadge key={tag.id} color={tag.color} size="lg">{tag.name}</ColorBadge>;
                        }
                        return <Badge key={index} className="px-3 py-1">{tag}</Badge>;
                      })}
                    </div>
                  </div>
                )}
                {(exercise.additionalTags?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Dodatkowe</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.additionalTags?.map((tag: string | ExerciseTag, index: number) => {
                        if (isTagObject(tag)) {
                          return <ColorBadge key={tag.id} color={tag.color} size="lg">{tag.name}</ColorBadge>;
                        }
                        return <Badge key={index} variant="outline" className="px-3 py-1">{tag}</Badge>;
                      })}
                    </div>
                  </div>
                )}
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
