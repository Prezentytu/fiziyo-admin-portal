'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { Plus, Dumbbell, LayoutGrid, List, Search, Sparkles } from 'lucide-react';
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
import { SubmitToGlobalDialog } from '@/components/exercises/SubmitToGlobalDialog';
import { ExerciseBuilderSidebar } from '@/components/exercise-builder/ExerciseBuilderSidebar';
import { ExerciseBuilderFAB } from '@/components/exercise-builder/ExerciseBuilderFAB';
import { cn } from '@/lib/utils';

import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import { DELETE_EXERCISE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { matchesSearchQuery, matchesAnyText } from '@/utils/textUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useExerciseBuilder, type BuilderExercise } from '@/contexts/ExerciseBuilderContext';
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import { useDataManagement } from '@/hooks/useDataManagement';
import { useRealtimeExercises } from '@/hooks/useRealtimeExercises';
import type {
  AvailableExercisesResponse,
  ExerciseTagsResponse,
  TagCategoriesResponse,
} from '@/types/apollo';

// Typ dla filtra źródła ćwiczeń
type ExerciseSourceFilter = 'all' | 'organization' | 'fiziyo';

export default function ExercisesPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { toggleExercise, isInBuilder } = useExerciseBuilder();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sourceFilter, setSourceFilter] = useState<ExerciseSourceFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [submitToGlobalExercise, setSubmitToGlobalExercise] = useState<Exercise | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Handler for toggling exercise in builder
  const handleToggleBuilder = useCallback((exercise: Exercise) => {
    const builderExercise: BuilderExercise = {
      id: exercise.id,
      name: exercise.name,
      imageUrl: exercise.imageUrl,
      sets: exercise.sets || 3,
      reps: exercise.reps || 10,
      duration: exercise.duration || 0,
      type: exercise.type,
    };
    toggleExercise(builderExercise);
  }, [toggleExercise]);

  // Data management hook for importing examples
  const { importExampleSets, isImporting, hasImportedExamples } = useDataManagement({
    organizationId,
  });

  // Get exercises (includes organization, global, and personal exercises)
  const { data, loading, error } = useQuery(GET_AVAILABLE_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Real-time updates dla ćwiczeń (WebSocket subscriptions)
  // Automatycznie aktualizuje Apollo Cache - nie wymaga refetchQueries
  useRealtimeExercises({
    organizationId: organizationId ?? null,
    onCreated: () => toast.success('Nowe ćwiczenie zostało dodane'),
    onUpdated: () => toast.info('Ćwiczenie zostało zaktualizowane'),
    onDeleted: () => toast.info('Ćwiczenie zostało usunięte'),
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
        query: GET_AVAILABLE_EXERCISES_QUERY,
        variables: { organizationId },
      },
    ],
  });

  const rawExercises: Exercise[] = (data as AvailableExercisesResponse)?.availableExercises || [];
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

  // Map tag IDs to full tag objects (with colors resolved from categories)
  const tagsMap = createTagsMap(tags, categories);
  const exercises = mapExercisesWithTags(rawExercises, tagsMap);

  // Filtrowanie po źródle (zakładki)
  const sourceFilteredExercises = useMemo(() => {
    if (sourceFilter === 'all') return exercises;
    if (sourceFilter === 'organization') {
      return exercises.filter(e => e.scope === 'ORGANIZATION' || e.scope === 'PERSONAL');
    }
    if (sourceFilter === 'fiziyo') {
      return exercises.filter(e => e.scope === 'GLOBAL');
    }
    return exercises;
  }, [exercises, sourceFilter]);

  // Liczniki dla zakładek (po deduplikacji)
  const organizationCount = useMemo(() => 
    exercises.filter(e => e.scope === 'ORGANIZATION' || e.scope === 'PERSONAL').length,
    [exercises]
  );
  const fiziyoCount = useMemo(() => 
    exercises.filter(e => e.scope === 'GLOBAL').length,
    [exercises]
  );

  // Stats - łączna liczba (po deduplikacji)
  const totalCount = exercises.length;

  // Helper to get all tag names from an exercise
  const getTagNames = (exercise: Exercise): string[] => {
    const allTags = [...(exercise.mainTags || []), ...(exercise.additionalTags || [])];
    return allTags
      .map((tag) => (typeof tag === 'object' && 'name' in tag ? tag.name : null))
      .filter((name): name is string => name !== null);
  };

  // Filter exercises - by name, description, or tag names
  const searchFilteredExercises = sourceFilteredExercises.filter((exercise) => {
    // Match by name or description
    if (matchesSearchQuery(exercise.name, searchQuery) || matchesSearchQuery(exercise.description, searchQuery)) {
      return true;
    }
    // Match by tag names
    const tagNames = getTagNames(exercise);
    return matchesAnyText(tagNames, searchQuery);
  });

  // Sort by creation date (newest first)
  const filteredExercises = [...searchFilteredExercises].sort((a, b) => {
    const aTime = a.creationTime ? new Date(a.creationTime).getTime() : 0;
    const bTime = b.creationTime ? new Date(b.creationTime).getTime() : 0;
    return bTime - aTime;
  });

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
    <div className="flex h-[calc(100vh-theme(spacing.16))] overflow-hidden -m-4 lg:-m-6">
      {/* Left Panel: Strefa Inspiracji (Grid) */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 scroll-smooth custom-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Compact Header with Search + View Toggle */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 data-testid="exercise-page-title" className="text-2xl font-bold text-foreground">Ćwiczenia</h1>
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Szukaj ćwiczeń..."
                  className="pl-9 bg-surface border-border/60"
                  data-testid="exercise-search-input"
                />
              </div>
              {/* View Toggle - Linear/Figma style */}
              <div className="flex items-center rounded-lg border border-border/60 bg-surface p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  data-testid="exercise-view-grid-btn"
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200',
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-light'
                  )}
                  title="Widok siatki"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  data-testid="exercise-view-list-btn"
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200',
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-light'
                  )}
                  title="Widok listy"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Hero Action + Source Filters */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
            {/* Hero Action - Dodaj ćwiczenie */}
            <button
              onClick={() => setIsDialogOpen(true)}
              disabled={!organizationId}
              data-testid="exercise-create-btn"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:col-span-1 lg:col-span-4"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

              <div className="relative flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white">
                    Dodaj ćwiczenie
                  </h3>
                  <p className="text-sm text-white/70">
                    Utwórz własne
                  </p>
                </div>
              </div>
            </button>

            {/* Source Filters - subtelne kafle */}
            <div className="grid grid-cols-3 gap-3 sm:col-span-1 lg:col-span-8">
              {/* Wszystkie */}
              <button
                onClick={() => setSourceFilter('all')}
                data-testid="exercise-filter-all"
                className={cn(
                  'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
                  sourceFilter === 'all'
                    ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20'
                    : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
                )}
              >
                <div className="flex items-center gap-2">
                  <Dumbbell className={cn('h-4 w-4', sourceFilter === 'all' ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-2xl font-bold', sourceFilter === 'all' ? 'text-primary' : 'text-foreground')}>
                    {totalCount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Wszystkie</p>
              </button>

              {/* Moje ćwiczenia */}
              <button
                onClick={() => setSourceFilter('organization')}
                data-testid="exercise-filter-organization"
                className={cn(
                  'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
                  sourceFilter === 'organization'
                    ? 'border-secondary/40 bg-secondary/10 ring-1 ring-secondary/20'
                    : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
                )}
              >
                <div className="flex items-center gap-2">
                  <Dumbbell className={cn('h-4 w-4', sourceFilter === 'organization' ? 'text-secondary' : 'text-muted-foreground')} />
                  <span className={cn('text-2xl font-bold', sourceFilter === 'organization' ? 'text-secondary' : 'text-foreground')}>
                    {organizationCount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Moje ćwiczenia</p>
              </button>

              {/* Baza FiziYo */}
              <button
                onClick={() => setSourceFilter('fiziyo')}
                data-testid="exercise-filter-fiziyo"
                className={cn(
                  'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
                  sourceFilter === 'fiziyo'
                    ? 'border-violet-500/40 bg-violet-500/10 ring-1 ring-violet-500/20'
                    : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
                )}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={cn('h-4 w-4', sourceFilter === 'fiziyo' ? 'text-violet-500' : 'text-muted-foreground')} />
                  <span className={cn('text-2xl font-bold', sourceFilter === 'fiziyo' ? 'text-violet-500' : 'text-foreground')}>
                    {fiziyoCount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Baza FiziYo</p>
              </button>
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
              <LoadingState type={viewMode === 'grid' ? 'exercise' : 'exercise-row'} count={8} />
            </div>
          ) : filteredExercises.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-16">
                <EmptyState
                  icon={Dumbbell}
                  title={searchQuery ? 'Nie znaleziono ćwiczeń' : 'Brak ćwiczeń'}
                  description={
                    searchQuery
                      ? 'Spróbuj zmienić kryteria wyszukiwania'
                      : 'Dodaj pierwsze ćwiczenie lub załaduj przykładowe zestawy'
                  }
                  actionLabel={!searchQuery ? 'Dodaj ćwiczenie' : undefined}
                  onAction={!searchQuery ? () => setIsDialogOpen(true) : undefined}
                  secondaryActionLabel={!searchQuery && !hasImportedExamples ? 'Załaduj przykłady' : undefined}
                  onSecondaryAction={!searchQuery && !hasImportedExamples ? importExampleSets : undefined}
                  secondaryActionLoading={isImporting}
                />
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className={cn(
              "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 animate-stagger"
            )}>
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={(e) => setDeletingExercise(e)}
                  onAddToSet={() => {}}
                  onSubmitToGlobal={(e) => setSubmitToGlobalExercise(e)}
                  isInBuilder={isInBuilder(exercise.id)}
                  onToggleBuilder={handleToggleBuilder}
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
                  onSubmitToGlobal={(e) => setSubmitToGlobalExercise(e)}
                  isInBuilder={isInBuilder(exercise.id)}
                  onToggleBuilder={handleToggleBuilder}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Strefa Konstrukcji (Sidebar) - Desktop */}
      <ExerciseBuilderSidebar className="relative inset-y-0" />

      {/* Exercise Builder FAB - Mobile */}
      <ExerciseBuilderFAB />

      {/* Exercise Dialog */}
      {organizationId && (
        <ExerciseDialog
          open={isDialogOpen}
          onOpenChange={handleCloseDialog}
          exercise={editingExercise}
          organizationId={organizationId}
          onSubmitToGlobal={(exercise) => setSubmitToGlobalExercise(exercise)}
        />
      )}

      {/* Submit to Global Dialog */}
      {organizationId && (
        <SubmitToGlobalDialog
          open={!!submitToGlobalExercise}
          onOpenChange={(open) => !open && setSubmitToGlobalExercise(null)}
          exercise={submitToGlobalExercise}
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
