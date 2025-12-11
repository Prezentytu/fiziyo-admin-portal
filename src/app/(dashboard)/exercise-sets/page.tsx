"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban, Filter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/SearchInput";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SetCard, ExerciseSet } from "@/components/exercise-sets/SetCard";
import { SetDialog } from "@/components/exercise-sets/SetDialog";

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import {
  DELETE_EXERCISE_SET_MUTATION,
  DUPLICATE_EXERCISE_SET_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import { matchesSearchQuery } from "@/utils/textUtils";
import type { UserByClerkIdResponse, OrganizationExerciseSetsResponse } from "@/types/apollo";

export default function ExerciseSetsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ExerciseSet | null>(null);
  const [deletingSet, setDeletingSet] = useState<ExerciseSet | null>(null);

  // Get user data
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organizationId = (userData as UserByClerkIdResponse)?.userByClerkId?.organizationIds?.[0];

  // Get exercise sets
  const { data, loading, error } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Mutations
  const [deleteSet, { loading: deleting }] = useMutation(DELETE_EXERCISE_SET_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
    ],
  });

  const [duplicateSet] = useMutation(DUPLICATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } },
    ],
  });

  const exerciseSets: ExerciseSet[] = (data as OrganizationExerciseSetsResponse)?.exerciseSets || [];

  // Filter
  const filteredSets = exerciseSets.filter((set) =>
    matchesSearchQuery(set.name, searchQuery) ||
    matchesSearchQuery(set.description, searchQuery)
  );

  const handleView = (set: ExerciseSet) => {
    router.push(`/exercise-sets/${set.id}`);
  };

  const handleEdit = (set: ExerciseSet) => {
    setEditingSet(set);
    setIsDialogOpen(true);
  };

  const handleDuplicate = async (set: ExerciseSet) => {
    try {
      await duplicateSet({
        variables: { exerciseSetId: set.id },
      });
      toast.success("Zestaw został zduplikowany");
    } catch (error) {
      console.error("Błąd podczas duplikowania:", error);
      toast.error("Nie udało się zduplikować zestawu");
    }
  };

  const handleDelete = async () => {
    if (!deletingSet) return;

    try {
      await deleteSet({
        variables: { exerciseSetId: deletingSet.id },
      });
      toast.success("Zestaw został usunięty");
      setDeletingSet(null);
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć zestawu");
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSet(null);
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Błąd ładowania zestawów: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zestawy ćwiczeń</h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj zestawami ćwiczeń dla pacjentów
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} disabled={!organizationId} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nowy zestaw
        </Button>
      </div>

      {/* Filters bar - sticky */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Szukaj zestawów..."
              className="max-w-md"
            />
            <Badge variant="secondary" className="hidden sm:flex">
              {filteredSets.length} z {exerciseSets.length}
            </Badge>
          </div>
          
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Filter className="mr-2 h-4 w-4" />
            Filtry
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState type="card" count={6} />
      ) : filteredSets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <EmptyState
              icon={FolderKanban}
              title={searchQuery ? "Nie znaleziono zestawów" : "Brak zestawów"}
              description={
                searchQuery
                  ? "Spróbuj zmienić kryteria wyszukiwania"
                  : "Utwórz pierwszy zestaw ćwiczeń dla pacjentów"
              }
              actionLabel={!searchQuery ? "Nowy zestaw" : undefined}
              onAction={!searchQuery ? () => setIsDialogOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger">
          {filteredSets.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(s) => setDeletingSet(s)}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* Set Dialog */}
      {organizationId && (
        <SetDialog
          open={isDialogOpen}
          onOpenChange={handleCloseDialog}
          set={editingSet}
          organizationId={organizationId}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingSet}
        onOpenChange={(open) => !open && setDeletingSet(null)}
        title="Usuń zestaw"
        description={`Czy na pewno chcesz usunąć zestaw "${deletingSet?.name}"? Ta operacja jest nieodwracalna.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
}
