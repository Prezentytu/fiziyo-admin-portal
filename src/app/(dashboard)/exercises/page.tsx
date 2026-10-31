'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Dumbbell, LayoutGrid, List, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ListPagination } from '@/components/shared/ListPagination';
import { ExerciseCard, Exercise } from '@/features/exercises/ExerciseCard';
import { ExerciseDialog } from '@/features/exercises/ExerciseDialog';
import { SubmitToGlobalDialog } from '@/features/exercises/SubmitToGlobalDialog';
import { SubmitToOrganizationDialog } from '@/features/exercises/SubmitToOrganizationDialog';
import { ReportExerciseDialog } from '@/features/exercises/ReportExerciseDialog';
import { ExerciseBuilderSidebar } from '@/components/exercise-builder/ExerciseBuilderSidebar';
import { ExerciseBuilderFAB } from '@/components/exercise-builder/ExerciseBuilderFAB';
import { cn } from '@/lib/utils';

import {
  EXERCISE_LIBRARY_REFETCH_QUERIES,
  GET_AVAILABLE_EXERCISES_PAGE_QUERY,
} from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import {
  DELETE_EXERCISE_MUTATION,
  SUBMIT_FOR_ORGANIZATION_REVIEW_MUTATION,
  SUBMIT_TO_GLOBAL_REVIEW_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useExerciseBuilder, type BuilderExercise } from '@/contexts/ExerciseBuilderContext';
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import { useDataManagement } from '@/hooks/useDataManagement';
import { useRealtimeExercises } from '@/hooks/useRealtimeExercises';
import { ORG_VERIFICATION_REFETCH_QUERIES } from '@/hooks/useOrganizationVerificationRealtime';
import type { AvailableExercisesPageResponse, ExerciseTagsResponse, TagCategoriesResponse } from '@/types/apollo';
import {
  buildExerciseLibraryQueryString,
  EXERCISE_LIBRARY_PAGE_SIZES,
  parseExerciseLibraryUrlState,
  toExerciseLibraryTab,
  type ExerciseLibraryUrlState,
} from '@/features/exercises/utils/exerciseLibraryUrlState';
import { getExerciseDefaultParams } from '@/features/exercise-sets/utils/exerciseDefaults';
import { PageHeader } from '@/components/shared/page';
import { useUrlSearchInput } from '@/features/exercises/useUrlSearchInput';

export default function ExercisesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { toggleExercise, isInBuilder } = useExerciseBuilder();
  // Filter, search and page live in the URL, so going back from an exercise returns to the same page.
  const listState = useMemo(() => parseExerciseLibraryUrlState(searchParams), [searchParams]);
  const { filter: sourceFilter, search: committedSearch } = listState;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [submitToGlobalExercise, setSubmitToGlobalExercise] = useState<Exercise | null>(null);
  const [submitToOrganizationExercise, setSubmitToOrganizationExercise] = useState<Exercise | null>(null);
  const [reportExercise, setReportExercise] = useState<Exercise | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Handler for toggling exercise in builder
  const handleToggleBuilder = useCallback(
    (exercise: Exercise) => {
      const defaults = getExerciseDefaultParams(exercise);
      const builderExercise: BuilderExercise = {
        id: exercise.id,
        name: exercise.name,
        description: exercise.description,
        patientDescription: exercise.patientDescription ?? exercise.description,
        clinicalDescription: exercise.clinicalDescription,
        audioCue: exercise.audioCue,
        notes: exercise.notes,
        tempo: exercise.tempo,
        side: exercise.side,
        exerciseSide: defaults.exerciseSide,
        preparationTime: exercise.preparationTime,
        thumbnailUrl: exercise.thumbnailUrl,
        imageUrl: exercise.imageUrl,
        images: exercise.images,
        defaultSets: exercise.defaultSets,
        defaultReps: exercise.defaultReps,
        defaultDuration: exercise.defaultDuration,
        defaultExecutionTime: exercise.defaultExecutionTime,
        defaultRestBetweenSets: exercise.defaultRestBetweenSets,
        defaultRestBetweenReps: exercise.defaultRestBetweenReps,
        sets: defaults.sets,
        reps: defaults.reps,
        duration: defaults.duration,
        executionTime: defaults.executionTime,
        restSets: defaults.restSets,
        restReps: defaults.restReps,
        customName: defaults.customName,
        customDescription: defaults.customDescription,
        loadType: defaults.loadType,
        loadValue: defaults.loadValue,
        loadUnit: defaults.loadUnit,
        loadText: defaults.loadText,
        type: exercise.type,
      };
      toggleExercise(builderExercise);
    },
    [toggleExercise]
  );

  // Data management hook for importing examples
  const { importExampleSets, isImporting, hasImportedExamples } = useDataManagement({
    organizationId,
  });

  const updateListState = useCallback(
    (patch: Partial<ExerciseLibraryUrlState>) => {
      const query = buildExerciseLibraryQueryString({ ...listState, page: 1, ...patch });
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [listState, pathname, router]
  );

  const commitSearch = useCallback((search: string) => updateListState({ search }), [updateListState]);
  const {
    input: searchQuery,
    setInput: setSearchQuery,
    clear: clearSearch,
  } = useUrlSearchInput(committedSearch, commitSearch);

  // One page of the library: tab, search, sorting and counts come from the API, not from 5k records in memory.
  const { data, previousData, loading, error } = useQuery<AvailableExercisesPageResponse>(
    GET_AVAILABLE_EXERCISES_PAGE_QUERY,
    {
      variables: {
        organizationId,
        tab: toExerciseLibraryTab(sourceFilter),
        search: committedSearch || null,
        page: listState.page,
        pageSize: listState.pageSize,
      },
      skip: !organizationId,
      fetchPolicy: 'cache-and-network',
    }
  );
  // Keep the previous page on screen while the next one loads instead of flashing skeletons,
  // but never another organization's exercises after switching organizations.
  const [loadedOrganizationId, setLoadedOrganizationId] = useState(organizationId);
  if (data && loadedOrganizationId !== organizationId) {
    setLoadedOrganizationId(organizationId);
  }
  const libraryPage =
    data?.availableExercisesPage ??
    (loadedOrganizationId === organizationId ? previousData?.availableExercisesPage : undefined);

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

  // The page and its counts change after a delete, so refetch the (small) page; the full library only if shown.
  const [deleteExercise, { loading: deleting }] = useMutation(DELETE_EXERCISE_MUTATION, {
    refetchQueries: EXERCISE_LIBRARY_REFETCH_QUERIES,
  });

  // Submit to global review mutation
  const [submitToGlobalReview, { loading: submittingToGlobal }] = useMutation(SUBMIT_TO_GLOBAL_REVIEW_MUTATION, {
    refetchQueries: EXERCISE_LIBRARY_REFETCH_QUERIES,
  });
  const [submitForOrganizationReview, { loading: submittingToOrganization }] = useMutation(
    SUBMIT_FOR_ORGANIZATION_REVIEW_MUTATION,
    {
      refetchQueries: [...EXERCISE_LIBRARY_REFETCH_QUERIES, ...ORG_VERIFICATION_REFETCH_QUERIES],
    }
  );

  const rawExercises = useMemo<Exercise[]>(() => libraryPage?.items ?? [], [libraryPage]);
  const tags = useMemo(() => (tagsData as ExerciseTagsResponse)?.exerciseTags || [], [tagsData]);
  const categories = useMemo(
    () => (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [],
    [categoriesData]
  );

  // Map tag IDs to full tag objects (with colors resolved from categories)
  const tagsMap = useMemo(() => createTagsMap(tags, categories), [tags, categories]);
  const exercises = useMemo(() => mapExercisesWithTags(rawExercises, tagsMap), [rawExercises, tagsMap]);

  const counts = libraryPage?.counts;
  const totalCount = counts?.all ?? 0;
  const isSearching = searchQuery.trim().length > 0;
  const isInitialLoading = loading && !libraryPage;

  const handlePageChange = (page: number) => {
    updateListState({ page });
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };


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

  const handleSubmitToGlobal = async (exerciseId: string) => {
    try {
      await submitToGlobalReview({
        variables: { exerciseId },
      });
      toast.success('Ćwiczenie zostało zgłoszone do weryfikacji');
      setSubmitToGlobalExercise(null);
    } catch (err) {
      console.error('Błąd podczas zgłaszania:', err);
      toast.error('Nie udało się zgłosić ćwiczenia do weryfikacji');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExercise(null);
  };

  const handleSubmitToOrganization = async (exerciseId: string) => {
    try {
      await submitForOrganizationReview({
        variables: { exerciseId },
      });
      toast.success('Ćwiczenie zostało zgłoszone do weryfikacji organizacyjnej');
      setSubmitToOrganizationExercise(null);
    } catch (err) {
      console.error('Błąd podczas zgłaszania organizacyjnego:', err);
      toast.error('Nie udało się zgłosić ćwiczenia do weryfikacji organizacyjnej');
    }
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Błąd ładowania ćwiczeń: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden rounded-card bg-card">
      {/* Left Panel: Strefa Inspiracji (Grid) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 xl:px-11 xl:py-9 scroll-smooth custom-scrollbar [--surface-card:var(--grouped-tertiary)]"
      >
        <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
          <PageHeader
            title="Ćwiczenia"
            titleTestId="exercise-page-title"
            subtitle="Twoje ćwiczenia i baza FiziYo"
            actions={
              <>
                <label className="relative w-full sm:w-[280px]">
                  <span className="sr-only">Szukaj ćwiczeń</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-label-secondary" aria-hidden="true" />
                  <Input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj ćwiczeń"
                    className="pl-10"
                    data-testid="exercise-search-input"
                  />
                </label>
                <div role="group" aria-label="Widok" className="flex h-9 items-center gap-0.5 rounded-[10px] bg-fill-tertiary p-0.5">
                  {([
                    { mode: 'grid', label: 'Widok siatki', Icon: LayoutGrid, testId: 'exercise-view-grid-btn' },
                    { mode: 'list', label: 'Widok listy', Icon: List, testId: 'exercise-view-list-btn' },
                  ] as const).map(({ mode, label, Icon, testId }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      aria-pressed={viewMode === mode}
                      aria-label={label}
                      title={label}
                      data-testid={testId}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        viewMode === mode ? 'bg-elevated text-foreground shadow-raised' : 'text-label-secondary hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  disabled={!organizationId}
                  data-testid="exercise-create-btn"
                >
                  <Plus aria-hidden="true" />
                  Utwórz ćwiczenie
                </Button>
              </>
            }
          />

          <div role="group" aria-label="Źródło ćwiczeń" className="flex gap-6 overflow-x-auto shadow-[inset_0_-0.5px_0_var(--separator)]">
            {([
              { id: 'all', label: 'Wszystkie', count: totalCount, testId: 'exercise-filter-all' },
              { id: 'organization', label: 'Moje ćwiczenia', count: counts?.organization ?? 0, testId: 'exercise-filter-organization' },
              { id: 'fiziyo', label: 'Baza FiziYo', count: counts?.fiziyo ?? 0, testId: 'exercise-filter-fiziyo' },
              { id: 'needsChanges', label: 'Do poprawy', count: counts?.needsChanges ?? 0, testId: 'exercise-filter-needs-changes' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={sourceFilter === tab.id}
                onClick={() => updateListState({ filter: tab.id })}
                data-testid={tab.testId}
                className={cn(
                  'h-11 shrink-0 whitespace-nowrap text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  sourceFilter === tab.id
                    ? 'text-foreground shadow-[inset_0_-2px_0_var(--tint)]'
                    : 'text-label-secondary hover:text-foreground'
                )}
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums text-label-secondary">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Results info */}
          {isSearching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Wyniki:</span>
              <Badge variant="secondary" className="text-xs">
                {libraryPage?.totalCount ?? 0} z {totalCount}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={clearSearch}
                data-testid="exercise-search-clear-btn"
              >
                Wyczyść wyszukiwanie
              </Button>
            </div>
          )}

          {/* Content */}
          {isInitialLoading ? (
            <div
              className={cn(
                viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-2',
                'animate-stagger'
              )}
            >
              <LoadingState type={viewMode === 'grid' ? 'exercise' : 'exercise-row'} count={8} />
            </div>
          ) : exercises.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-16">
                <EmptyState
                  icon={Dumbbell}
                  title={committedSearch ? 'Nie znaleziono ćwiczeń' : 'Brak ćwiczeń'}
                  description={
                    committedSearch
                      ? 'Spróbuj zmienić kryteria wyszukiwania'
                      : 'Dodaj pierwsze ćwiczenie lub załaduj przykładowe zestawy'
                  }
                  actionLabel={!committedSearch ? 'Dodaj ćwiczenie' : undefined}
                  onAction={!committedSearch ? () => setIsDialogOpen(true) : undefined}
                  secondaryActionLabel={!committedSearch && !hasImportedExamples ? 'Załaduj przykłady' : undefined}
                  onSecondaryAction={!committedSearch && !hasImportedExamples ? importExampleSets : undefined}
                  secondaryActionLoading={isImporting}
                />
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div
              aria-busy={loading}
              className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 animate-stagger', loading && 'opacity-60')}
            >
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={(e) => setDeletingExercise(e)}
                  onAddToSet={() => {}}
                  onSubmitToGlobal={(e) => setSubmitToGlobalExercise(e)}
                  onSubmitToOrganizationReview={(e) => setSubmitToOrganizationExercise(e)}
                  onReportIssue={(e) => setReportExercise(e)}
                  isInBuilder={isInBuilder(exercise.id)}
                  onToggleBuilder={handleToggleBuilder}
                />
              ))}
            </div>
          ) : (
            <div aria-busy={loading} className={cn('space-y-2 animate-stagger', loading && 'opacity-60')}>
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  compact
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={(e) => setDeletingExercise(e)}
                  onAddToSet={() => {}}
                  onSubmitToGlobal={(e) => setSubmitToGlobalExercise(e)}
                  onSubmitToOrganizationReview={(e) => setSubmitToOrganizationExercise(e)}
                  onReportIssue={(e) => setReportExercise(e)}
                  isInBuilder={isInBuilder(exercise.id)}
                  onToggleBuilder={handleToggleBuilder}
                />
              ))}
            </div>
          )}
          {libraryPage && libraryPage.totalCount > 0 && (
            <ListPagination
              page={libraryPage.page}
              totalPages={libraryPage.totalPages}
              totalCount={libraryPage.totalCount}
              visibleCount={exercises.length}
              pageSize={libraryPage.pageSize}
              pageSizeOptions={EXERCISE_LIBRARY_PAGE_SIZES}
              hasPreviousPage={libraryPage.hasPreviousPage}
              hasNextPage={libraryPage.hasNextPage}
              onPageChange={handlePageChange}
              onPageSizeChange={(pageSize) => updateListState({ pageSize })}
              testIdPrefix="exercise"
            />
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
          onSubmitToOrganizationReview={(exercise) => setSubmitToOrganizationExercise(exercise)}
          onSuccess={(event) => {
            if (event?.action === 'copied' && event.exerciseId) {
              router.push(`/exercises/${event.exerciseId}`);
            }
          }}
        />
      )}

      {/* Submit to Global Dialog */}
      {organizationId && (
        <SubmitToGlobalDialog
          open={!!submitToGlobalExercise}
          onOpenChange={(open) => !open && setSubmitToGlobalExercise(null)}
          exercise={submitToGlobalExercise}
          onConfirm={handleSubmitToGlobal}
          isLoading={submittingToGlobal}
        />
      )}
      {organizationId && (
        <SubmitToOrganizationDialog
          open={!!submitToOrganizationExercise}
          onOpenChange={(open) => !open && setSubmitToOrganizationExercise(null)}
          exercise={submitToOrganizationExercise}
          onConfirm={handleSubmitToOrganization}
          isLoading={submittingToOrganization}
        />
      )}

      <ReportExerciseDialog
        open={!!reportExercise}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setReportExercise(null);
          }
        }}
        exercise={reportExercise}
        organizationId={organizationId}
      />

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
