"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SetCard, ExerciseSet } from "@/components/exercise-sets/SetCard";
import { SetDialog } from "@/components/exercise-sets/SetDialog";
import { SetFilters } from "@/components/exercise-sets/SetFilters";
import { SetQuickStats } from "@/components/exercise-sets/SetQuickStats";

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import {
  DELETE_EXERCISE_SET_MUTATION,
  DUPLICATE_EXERCISE_SET_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import { matchesSearchQuery } from "@/utils/textUtils";
import type { UserByClerkIdResponse, OrganizationExerciseSetsResponse } from "@/types/apollo";

type FilterType = "all" | "active" | "inactive" | "templates";

export default function ExerciseSetsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
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

  // Filter by status/template
  const statusFilteredSets = exerciseSets.filter((set) => {
    if (filter === "all") return true;
    if (filter === "active") return set.isActive !== false;
    if (filter === "inactive") return set.isActive === false;
    if (filter === "templates") return set.isTemplate === true;
    return true;
  });

  // Filter by search query
  const filteredSets = statusFilteredSets.filter((set) =>
    matchesSearchQuery(set.name, searchQuery) ||
    matchesSearchQuery(set.description, searchQuery)
  );

  // Calculate stats
  const activeSets = exerciseSets.filter((s) => s.isActive !== false);
  const templateSets = exerciseSets.filter((s) => s.isTemplate === true);
  const totalAssignments = exerciseSets.reduce(
    (sum, set) => sum + (set.patientAssignments?.length || 0),
    0
  );

  // Sort by most assigned for better UX
  const sortedSets = [...filteredSets].sort(
    (a, b) => (b.patientAssignments?.length || 0) - (a.patientAssignments?.length || 0)
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
      {/* Hero Section */}
      <div className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-surface via-surface to-surface-light p-8 lg:p-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                Zestawy ćwiczeń
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Twórz i zarządzaj gotowymi programami ćwiczeń dla pacjentów. 
                Masz <span className="text-primary font-semibold">{exerciseSets.length}</span> zestawów, 
                z czego <span className="text-secondary font-semibold">{activeSets.length}</span> aktywnych.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => setIsDialogOpen(true)}
                disabled={!organizationId}
                className="gap-2 h-12 px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all"
              >
                <Plus className="h-5 w-5" />
                Nowy zestaw
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <SetQuickStats
        totalSets={exerciseSets.length}
        activeSets={activeSets.length}
        templateSets={templateSets.length}
        totalAssignments={totalAssignments}
        isLoading={loading}
      />

      {/* Filters */}
      <SetFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
        resultCount={filteredSets.length}
        totalCount={exerciseSets.length}
      />

      {/* Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/60">
              <Skeleton className="aspect-[16/10] w-full" />
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16">
            <EmptyState
              icon={FolderKanban}
              title={searchQuery || filter !== "all" ? "Nie znaleziono zestawów" : "Brak zestawów"}
              description={
                searchQuery || filter !== "all"
                  ? "Spróbuj zmienić kryteria wyszukiwania lub filtry"
                  : "Utwórz pierwszy zestaw ćwiczeń dla pacjentów"
              }
              actionLabel={!searchQuery && filter === "all" ? "Nowy zestaw" : undefined}
              onAction={!searchQuery && filter === "all" ? () => setIsDialogOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedSets.map((set) => (
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
