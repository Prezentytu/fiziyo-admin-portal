"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, Dumbbell, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/shared/SearchInput";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExerciseCard, Exercise } from "@/components/exercises/ExerciseCard";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";

import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { DELETE_EXERCISE_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import { matchesSearchQuery } from "@/utils/textUtils";
import type { UserByClerkIdResponse, OrganizationExercisesResponse } from "@/types/apollo";

export default function ExercisesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);

  // Get user data to get organizationId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organizationId = (userData as UserByClerkIdResponse)?.userByClerkId?.organizationIds?.[0];

  // Get exercises
  const { data, loading, error } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Delete mutation
  const [deleteExercise, { loading: deleting }] = useMutation(DELETE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISES_QUERY, variables: { organizationId } },
    ],
  });

  const exercises: Exercise[] = (data as OrganizationExercisesResponse)?.organizationExercises || [];

  // Filter exercises
  const filteredExercises = exercises.filter((exercise) =>
    matchesSearchQuery(exercise.name, searchQuery) ||
    matchesSearchQuery(exercise.description, searchQuery)
  );

  const handleView = (exercise: Exercise) => {
    router.push(`/exercises/${exercise.id}`);
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingExercise) return;

    try {
      await deleteExercise({
        variables: { exerciseId: deletingExercise.id },
      });
      toast.success("Ćwiczenie zostało usunięte");
      setDeletingExercise(null);
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć ćwiczenia");
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExercise(null);
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Błąd ładowania ćwiczeń: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ćwiczenia</h1>
          <p className="text-muted-foreground">
            Zarządzaj biblioteką ćwiczeń ({filteredExercises.length} z {exercises.length})
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} disabled={!organizationId}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj ćwiczenie
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Szukaj ćwiczeń..."
          className="max-w-sm"
        />
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
          <TabsList>
            <TabsTrigger value="grid">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState type="card" count={6} />
      ) : filteredExercises.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Dumbbell}
              title={searchQuery ? "Nie znaleziono ćwiczeń" : "Brak ćwiczeń"}
              description={
                searchQuery
                  ? "Spróbuj zmienić kryteria wyszukiwania"
                  : "Dodaj pierwsze ćwiczenie do biblioteki"
              }
              actionLabel={!searchQuery ? "Dodaj ćwiczenie" : undefined}
              onAction={!searchQuery ? () => setIsDialogOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(e) => setDeletingExercise(e)}
              onAddToSet={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              compact
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(e) => setDeletingExercise(e)}
              onAddToSet={() => {}}
            />
          ))}
        </div>
      )}

      {/* Exercise Dialog */}
      {organizationId && (
        <ExerciseDialog
          open={isDialogOpen}
          onOpenChange={handleCloseDialog}
          exercise={editingExercise}
          organizationId={organizationId}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingExercise}
        onOpenChange={(open) => !open && setDeletingExercise(null)}
        title="Usuń ćwiczenie"
        description={`Czy na pewno chcesz usunąć ćwiczenie "${deletingExercise?.name}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
}
