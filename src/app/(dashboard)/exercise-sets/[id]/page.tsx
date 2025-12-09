"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Dumbbell,
  Plus,
  GripVertical,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SetDialog } from "@/components/exercise-sets/SetDialog";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";

import {
  GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
  GET_ORGANIZATION_EXERCISE_SETS_QUERY,
} from "@/graphql/queries/exerciseSets.queries";
import {
  DELETE_EXERCISE_SET_MUTATION,
  REMOVE_EXERCISE_FROM_SET_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";

interface SetDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ExerciseSetData {
  exerciseSetById: {
    id: string;
    name: string;
    description?: string;
    exerciseMappings?: Array<{
      id: string;
      exerciseId: string;
      order?: number;
      sets?: number;
      reps?: number;
      duration?: number;
      exercise?: {
        id: string;
        name: string;
        description?: string;
        type?: string;
        imageUrl?: string;
        images?: string[];
        exerciseSide?: string;
      };
    }>;
    patientAssignments?: Array<{
      id: string;
      status?: string;
      user?: {
        id: string;
        fullname?: string;
        email?: string;
        image?: string;
      };
    }>;
    frequency?: {
      timesPerWeek?: number;
      timesPerDay?: number;
    };
  };
}

export default function SetDetailPage({ params }: SetDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [removingExerciseId, setRemovingExerciseId] = useState<string | null>(null);

  // Get user data
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organizationId = (userData as { userByClerkId?: { organizationIds?: string[] } })?.userByClerkId?.organizationIds?.[0];

  // Get set details
  const { data, loading, error, refetch } = useQuery(GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY, {
    variables: { exerciseSetId: id },
  });

  // Mutations
  const [deleteSet, { loading: deleting }] = useMutation(DELETE_EXERCISE_SET_MUTATION, {
    refetchQueries: organizationId
      ? [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }]
      : [],
  });

  const [removeExercise, { loading: removingExercise }] = useMutation(
    REMOVE_EXERCISE_FROM_SET_MUTATION
  );

  const exerciseSet = (data as ExerciseSetData | undefined)?.exerciseSetById;

  const handleDelete = async () => {
    try {
      await deleteSet({
        variables: { exerciseSetId: id },
      });
      toast.success("Zestaw został usunięty");
      router.push("/exercise-sets");
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć zestawu");
    }
  };

  const handleRemoveExercise = async () => {
    if (!removingExerciseId) return;

    try {
      await removeExercise({
        variables: {
          exerciseId: removingExerciseId,
          exerciseSetId: id,
        },
      });
      toast.success("Ćwiczenie zostało usunięte z zestawu");
      setRemovingExerciseId(null);
      refetch();
    } catch (error) {
      console.error("Błąd podczas usuwania ćwiczenia:", error);
      toast.error("Nie udało się usunąć ćwiczenia z zestawu");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
  }

  if (error || !exerciseSet) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-destructive">
          {error ? `Błąd: ${error.message}` : "Nie znaleziono zestawu"}
        </p>
        <Button variant="outline" onClick={() => router.push("/exercise-sets")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do listy
        </Button>
      </div>
    );
  }

  const exercises = exerciseSet?.exerciseMappings || [];
  const assignments = exerciseSet?.patientAssignments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/exercise-sets")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{exerciseSet.name}</h1>
            <p className="text-muted-foreground">
              {exercises.length} ćwiczeń • {assignments.length} przypisań
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edytuj
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          {exerciseSet.description && (
            <Card>
              <CardHeader>
                <CardTitle>Opis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{exerciseSet.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Exercises list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Ćwiczenia w zestawie
              </CardTitle>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj ćwiczenie
              </Button>
            </CardHeader>
            <CardContent>
              {exercises.length === 0 ? (
                <EmptyState
                  icon={Dumbbell}
                  title="Brak ćwiczeń"
                  description="Dodaj ćwiczenia do tego zestawu"
                  actionLabel="Dodaj ćwiczenie"
                  onAction={() => {}}
                />
              ) : (
                <div className="space-y-2">
                  {[...exercises]
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((mapping, index) => (
                      <div
                        key={mapping.id}
                        className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-light text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {mapping.exercise?.imageUrl ? (
                              <img
                                src={mapping.exercise.imageUrl}
                                alt={mapping.exercise?.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-light">
                                <Dumbbell className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium truncate">
                                {mapping.exercise?.name || "Nieznane ćwiczenie"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {mapping.sets && <span>{mapping.sets} serii</span>}
                                {mapping.reps && <span>{mapping.reps} powt.</span>}
                                {mapping.duration && <span>{mapping.duration}s</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setRemovingExerciseId(mapping.exerciseId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assigned patients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Przypisani pacjenci
              </CardTitle>
              <Badge variant="secondary">{assignments.length}</Badge>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak przypisanych pacjentów
                </p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-2"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                        {assignment.user?.fullname?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {assignment.user?.fullname || "Nieznany pacjent"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assignment.user?.email}
                        </p>
                      </div>
                      <Badge
                        variant={
                          assignment.status === "active" ? "success" : "secondary"
                        }
                      >
                        {assignment.status === "active" ? "Aktywne" : assignment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Frequency */}
          {exerciseSet?.frequency && (
            <Card>
              <CardHeader>
                <CardTitle>Częstotliwość</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {exerciseSet.frequency.timesPerWeek && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Razy w tygodniu:</span>
                    <span className="font-medium">{exerciseSet.frequency.timesPerWeek}</span>
                  </div>
                )}
                {exerciseSet.frequency.timesPerDay && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Razy dziennie:</span>
                    <span className="font-medium">{exerciseSet.frequency.timesPerDay}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      {organizationId && (
        <SetDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          set={exerciseSet}
          organizationId={organizationId}
          onSuccess={() => refetch()}
        />
      )}

      {/* Delete Set Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuń zestaw"
        description={`Czy na pewno chcesz usunąć zestaw "${exerciseSet.name}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />

      {/* Remove Exercise Confirmation */}
      <ConfirmDialog
        open={!!removingExerciseId}
        onOpenChange={(open) => !open && setRemovingExerciseId(null)}
        title="Usuń ćwiczenie z zestawu"
        description="Czy na pewno chcesz usunąć to ćwiczenie z zestawu?"
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleRemoveExercise}
        isLoading={removingExercise}
      />
    </div>
  );
}

