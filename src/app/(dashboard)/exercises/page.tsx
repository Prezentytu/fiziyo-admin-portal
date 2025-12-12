"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, Dumbbell, LayoutGrid, List, Filter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/SearchInput";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExerciseCard, Exercise } from "@/components/exercises/ExerciseCard";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";

import { GET_ORGANIZATION_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from "@/graphql/queries/exerciseTags.queries";
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from "@/graphql/queries/tagCategories.queries";
import { DELETE_EXERCISE_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import { matchesSearchQuery } from "@/utils/textUtils";
import { createTagsMap, mapExercisesWithTags } from "@/utils/tagUtils";
import type {
  UserByClerkIdResponse,
  OrganizationExercisesResponse,
  ExerciseTagsResponse,
  TagCategoriesResponse,
} from "@/types/apollo";

export default function ExercisesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(
    null
  );

  // Get user data to get organizationId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organizationId = (userData as UserByClerkIdResponse)?.userByClerkId
    ?.organizationIds?.[0];

  // Get exercises
  const { data, loading, error } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
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
      refetchQueries: [
        {
          query: GET_ORGANIZATION_EXERCISES_QUERY,
          variables: { organizationId },
        },
      ],
    }
  );

  const rawExercises: Exercise[] =
    (data as OrganizationExercisesResponse)?.organizationExercises || [];
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories =
    (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

  // Map tag IDs to full tag objects (with colors resolved from categories)
  const tagsMap = createTagsMap(tags, categories);
  const exercises = mapExercisesWithTags(rawExercises, tagsMap);

  // Filter exercises
  const filteredExercises = exercises.filter(
    (exercise) =>
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
        <p className="text-destructive">
          Błąd ładowania ćwiczeń: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ćwiczenia</h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj biblioteką ćwiczeń
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={!organizationId}
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Dodaj ćwiczenie
        </Button>
      </div>

      {/* Filters bar - sticky */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Szukaj ćwiczeń..."
              className="max-w-md"
            />
            <Badge variant="secondary" className="hidden sm:flex">
              {filteredExercises.length} z {exercises.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Filter className="mr-2 h-4 w-4" />
              Filtry
            </Button>
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "grid" | "list")}
            >
              <TabsList className="bg-surface-light">
                <TabsTrigger
                  value="grid"
                  className="data-[state=active]:bg-surface"
                >
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="data-[state=active]:bg-surface"
                >
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState type="card" count={6} />
      ) : filteredExercises.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger">
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
        <div className="space-y-2 animate-stagger">
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
