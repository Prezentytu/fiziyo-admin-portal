'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Plus, Dumbbell, LayoutGrid, List, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExerciseCard, Exercise } from '@/components/exercises/ExerciseCard';
import { ExerciseDialog } from '@/components/exercises/ExerciseDialog';
import { cn } from '@/lib/utils';

import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import { DELETE_EXERCISE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { matchesSearchQuery } from '@/utils/textUtils';
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import type {
  UserByClerkIdResponse,
  OrganizationExercisesResponse,
  ExerciseTagsResponse,
  TagCategoriesResponse,
} from '@/types/apollo';

export default function ExercisesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
    refetchQueries: [
      {
        query: GET_ORGANIZATION_EXERCISES_QUERY,
        variables: { organizationId },
      },
    ],
  });

  const rawExercises: Exercise[] = (data as OrganizationExercisesResponse)?.organizationExercises || [];
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

  // Map tag IDs to full tag objects (with colors resolved from categories)
  const tagsMap = createTagsMap(tags, categories);
  const exercises = mapExercisesWithTags(rawExercises, tagsMap);

  // Stats
  const totalCount = exercises.length;

  // Filter exercises
  const filteredExercises = exercises.filter(
    (exercise) =>
      matchesSearchQuery(exercise.name, searchQuery) || matchesSearchQuery(exercise.description, searchQuery)
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
      toast.success('Ćwiczenie zostało usunięte');
      setDeletingExercise(null);
    } catch (err) {
      console.error('Błąd podczas usuwania:', err);
      toast.error('Nie udało się usunąć ćwiczenia');
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
      {/* Compact Header with Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ćwiczenia</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj ćwiczeń..."
            className="pl-9 bg-surface border-border/60"
          />
        </div>
      </div>

      {/* Hero Action + Stats + View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {/* Hero Action - Dodaj ćwiczenie */}
        <button
          onClick={() => setIsDialogOpen(true)}
          disabled={!organizationId}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex-1 sm:max-w-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">
                Dodaj ćwiczenie
              </h3>
              <p className="text-sm text-white/70">
                Nowe ćwiczenie w bibliotece
              </p>
            </div>
            <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
          </div>
        </button>

        {/* Stats Card */}
        <div className="rounded-2xl border border-border/40 bg-surface/50 p-5 flex items-center gap-4 flex-1 sm:max-w-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 shrink-0">
            <Dumbbell className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Ćwiczeń w bibliotece</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="rounded-2xl border border-border/40 bg-surface/50 p-3 flex items-center gap-2 sm:flex-col sm:justify-center">
          <span className="text-xs text-muted-foreground sm:hidden">Widok:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-light hover:text-foreground'
              )}
              title="Widok siatki"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-light hover:text-foreground'
              )}
              title="Widok listy"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results info */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Wyniki:</span>
          <Badge variant="secondary" className="text-xs">
            {filteredExercises.length} z {totalCount}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSearchQuery('')}
          >
            Wyczyść wyszukiwanie
          </Button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'space-y-2',
          'animate-stagger'
        )}>
          <LoadingState type={viewMode === 'grid' ? 'card' : 'row'} count={6} />
        </div>
      ) : filteredExercises.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16">
            <EmptyState
              icon={Dumbbell}
              title={searchQuery ? 'Nie znaleziono ćwiczeń' : 'Brak ćwiczeń'}
              description={
                searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Dodaj pierwsze ćwiczenie do biblioteki'
              }
              actionLabel={!searchQuery ? 'Dodaj ćwiczenie' : undefined}
              onAction={!searchQuery ? () => setIsDialogOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger">
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
