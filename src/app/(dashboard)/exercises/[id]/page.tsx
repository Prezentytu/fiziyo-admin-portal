"use client";

import { use } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";

import { GET_EXERCISE_BY_ID_QUERY, GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { DELETE_EXERCISE_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import { useState } from "react";
import type { UserByClerkIdResponse, ExerciseByIdResponse } from "@/types/apollo";

interface ExerciseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const imageUrl = exercise.imageUrl || exercise.images?.[0];
  const allImages = [exercise.imageUrl, ...(exercise.images || [])].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/exercises")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{exercise.name}</h1>
            <p className="text-muted-foreground">Szczegóły ćwiczenia</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edytuj
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Opis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {exercise.description || "Brak opisu"}
              </p>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Parametry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Typ</p>
                    <p className="font-medium">{getTypeLabel(exercise.type)}</p>
                  </div>
                </div>

                {exercise.sets !== undefined && exercise.sets > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Repeat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Serie</p>
                      <p className="font-medium">{exercise.sets}</p>
                    </div>
                  </div>
                )}

                {exercise.reps !== undefined && exercise.reps > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Repeat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Powtórzenia</p>
                      <p className="font-medium">{exercise.reps}</p>
                    </div>
                  </div>
                )}

                {exercise.duration !== undefined && exercise.duration > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Czas</p>
                      <p className="font-medium">{exercise.duration}s</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Strona ciała</p>
                    <p className="font-medium">{getSideLabel(exercise.exerciseSide)}</p>
                  </div>
                </div>
              </div>

              {(exercise.restSets || exercise.restReps || exercise.preparationTime) && (
                <>
                  <Separator className="my-4" />
                  <div className="grid gap-4 sm:grid-cols-3">
                    {exercise.restSets !== undefined && exercise.restSets > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Przerwa między seriami</p>
                        <p className="font-medium">{exercise.restSets}s</p>
                      </div>
                    )}
                    {exercise.restReps !== undefined && exercise.restReps > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Przerwa między powt.</p>
                        <p className="font-medium">{exercise.restReps}s</p>
                      </div>
                    )}
                    {exercise.preparationTime !== undefined && exercise.preparationTime > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Czas przygotowania</p>
                        <p className="font-medium">{exercise.preparationTime}s</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

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
          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Media
              </CardTitle>
            </CardHeader>
            <CardContent>
              {imageUrl ? (
                <div className="space-y-3">
                  <img
                    src={imageUrl}
                    alt={exercise.name}
                    className="w-full rounded-lg object-cover"
                  />
                  {allImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {allImages.slice(1, 5).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`${exercise.name} ${i + 2}`}
                          className="aspect-square rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ImageIcon className="mb-2 h-12 w-12" />
                  <p>Brak zdjęć</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video */}
          {exercise.videoUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Wideo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Play className="h-4 w-4" />
                  Obejrzyj na Vimeo
                </a>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {((exercise.mainTags?.length ?? 0) > 0 || (exercise.additionalTags?.length ?? 0) > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Tagi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(exercise.mainTags?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Główne</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.mainTags?.map((tag: string) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(exercise.additionalTags?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Dodatkowe</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.additionalTags?.map((tag: string) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
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

