'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Plus, FolderKanban, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSheet, PageHeader } from '@/components/shared/page';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SetCard, ExerciseSet } from '@/features/exercise-sets/SetCard';
import { EditExerciseSetFullDialog } from '@/features/exercise-sets/EditExerciseSetFullDialog';
import { CreateSetWizard } from '@/features/exercise-sets/CreateSetWizard';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import { normalizeFrequencySeed } from '@/features/assignment/utils/scheduleFrequencyUtils';
import { cn } from '@/lib/utils';
import { HIDE_EXERCISE_TAGS } from '@/components/shared/exercise';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { DELETE_EXERCISE_SET_MUTATION, DUPLICATE_EXERCISE_SET_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { matchesSearchQuery } from '@/utils/textUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrganizationExerciseSetsResponse, ExerciseTag, UserByClerkIdResponse } from '@/types/apollo';
import type { DuplicateExerciseSetMutationData } from '@/graphql/types/operation-responses';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { isFiziyoTemplate, isMyTemplate, isPatientPlan, isTemplateSet } from '@/features/exercise-sets/utils/setKind';

type FilterType = 'all-templates' | 'fiziyo-templates' | 'my-templates' | 'patient-plans';

const VALID_FILTERS: FilterType[] = ['all-templates', 'fiziyo-templates', 'my-templates', 'patient-plans'];

function parseFilterFromUrl(rawFilter: string | null): FilterType {
  if (!rawFilter) return 'all-templates';
  return VALID_FILTERS.includes(rawFilter as FilterType) ? (rawFilter as FilterType) : 'all-templates';
}

export default function ExerciseSetsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>(() => parseFilterFromUrl(searchParams.get('filter')));
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ExerciseSet | null>(null);
  const [deletingSet, setDeletingSet] = useState<ExerciseSet | null>(null);
  const [assigningSet, setAssigningSet] = useState<ExerciseSet | null>(null);
  const highlightedSetId = searchParams.get('highlight');
  useEffect(() => {
    const nextFilter = parseFilterFromUrl(searchParams.get('filter'));
    setFilter((previousFilter) => (previousFilter === nextFilter ? previousFilter : nextFilter));
  }, [searchParams]);

  const applyFilter = useCallback(
    (nextFilter: FilterType) => {
      setFilter(nextFilter);
      const params = new URLSearchParams(searchParams.toString());

      if (nextFilter === 'all-templates') {
        params.delete('filter');
      } else {
        params.set('filter', nextFilter);
      }

      params.delete('highlight');
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get user data for therapistId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });
  const therapistId = (userData as UserByClerkIdResponse)?.userByClerkId?.id;

  // Get exercise sets
  const { data, loading, error } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get exercise tags for filtering
  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId || HIDE_EXERCISE_TAGS,
  });

  // Mutations
  const [deleteSet, { loading: deleting }] = useMutation(DELETE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
  });

  const [duplicateSet] = useMutation<DuplicateExerciseSetMutationData>(DUPLICATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
  });

  const exerciseSets: ExerciseSet[] = useMemo(
    () => (data as OrganizationExerciseSetsResponse)?.exerciseSets || [],
    [data]
  );
  const exerciseTags: ExerciseTag[] = useMemo(
    () => (HIDE_EXERCISE_TAGS ? [] : (tagsData as { exerciseTags?: ExerciseTag[] })?.exerciseTags || []),
    [tagsData]
  );

  // Create map of tags by ID for quick lookup
  const tagsMap = useMemo(() => {
    const map = new Map<string, ExerciseTag>();
    for (const tag of exerciseTags) {
      map.set(tag.id, tag);
    }
    return map;
  }, [exerciseTags]);

  // Get all unique tags used in exercise sets (aggregated from exercises)
  const availableTags = useMemo(() => {
    if (HIDE_EXERCISE_TAGS) return [];

    const tagIds = new Set<string>();
    for (const set of exerciseSets) {
      for (const mapping of set.exerciseMappings || []) {
        const exercise = mapping.exercise;
        if (exercise?.mainTags) {
          for (const tagId of exercise.mainTags) {
            tagIds.add(tagId);
          }
        }
        if (exercise?.additionalTags) {
          for (const tagId of exercise.additionalTags) {
            tagIds.add(tagId);
          }
        }
      }
    }
    // Return full tag objects for found IDs
    return Array.from(tagIds)
      .map((id) => tagsMap.get(id))
      .filter((tag): tag is ExerciseTag => tag !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exerciseSets, tagsMap]);

  // Helper: check if a set contains any of the selected tags
  const setHasSelectedTags = (set: ExerciseSet): boolean => {
    if (selectedTags.length === 0) return true;
    for (const mapping of set.exerciseMappings || []) {
      const exercise = mapping.exercise;
      const allTags = [...(exercise?.mainTags || []), ...(exercise?.additionalTags || [])];
      if (allTags.some((tagId) => selectedTags.includes(tagId))) {
        return true;
      }
    }
    return false;
  };

  // Calculate stats
  const allTemplatesCount = exerciseSets.filter(isTemplateSet).length;
  const fiziyoTemplatesCount = exerciseSets.filter(isFiziyoTemplate).length;
  const myTemplatesCount = exerciseSets.filter(isMyTemplate).length;
  const patientPlansCount = exerciseSets.filter(isPatientPlan).length;

  // Filter by status/template
  const statusFilteredSets = exerciseSets.filter((set) => {
    if (filter === 'all-templates') return isTemplateSet(set);
    if (filter === 'fiziyo-templates') return isFiziyoTemplate(set);
    if (filter === 'my-templates') return isMyTemplate(set);
    if (filter === 'patient-plans') return isPatientPlan(set);
    return true;
  });

  // Filter by selected tags
  const tagFilteredSets = statusFilteredSets.filter(setHasSelectedTags);

  // Filter by search query
  const searchFilteredSets = tagFilteredSets.filter(
    (set) => matchesSearchQuery(set.name, searchQuery) || matchesSearchQuery(set.description, searchQuery)
  );

  // Sort based on filter type
  const filteredSets = useMemo(() => {
    const sorted = [...searchFilteredSets];

    // Default sort: inactive at bottom, then by creation time
    sorted.sort((a, b) => {
      const aInactive = a.isActive === false;
      const bInactive = b.isActive === false;
      if (aInactive && !bInactive) return 1;
      if (!aInactive && bInactive) return -1;
      const aTime = a.creationTime ? new Date(a.creationTime).getTime() : 0;
      const bTime = b.creationTime ? new Date(b.creationTime).getTime() : 0;
      return bTime - aTime;
    });

    return sorted;
  }, [searchFilteredSets]);

  const handleView = (set: ExerciseSet) => {
    const detailQuery = new URLSearchParams();
    if (filter === 'patient-plans') {
      detailQuery.set('from', 'patient-plans');
    }
    const queryString = detailQuery.toString();
    router.push(queryString ? `/exercise-sets/${set.id}?${queryString}` : `/exercise-sets/${set.id}`);
  };

  const handleEdit = (set: ExerciseSet) => {
    setEditingSet(set);
    setIsEditDialogOpen(true);
  };

  const handleDuplicate = async (set: ExerciseSet) => {
    try {
      const result = await duplicateSet({
        variables: { exerciseSetId: set.id },
      });
      const newSetId = result.data?.duplicateExerciseSet?.id;
      toast.success('Zestaw został zduplikowany');

      // Smart Duplicate: redirect to the new set's detail page for editing
      if (newSetId) {
        router.push(`/exercise-sets/${newSetId}`);
      }
    } catch (err) {
      console.error('Błąd podczas duplikowania:', err);
      toast.error('Nie udało się zduplikować zestawu');
    }
  };

  const handleDelete = async () => {
    if (!deletingSet) return;

    try {
      await deleteSet({
        variables: { exerciseSetId: deletingSet.id },
      });
      toast.success('Zestaw został usunięty');
      setDeletingSet(null);
    } catch (err) {
      console.error('Błąd podczas usuwania:', err);
      toast.error('Nie udało się usunąć zestawu');
    }
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingSet(null);
  };

  const handleAssign = (set: ExerciseSet) => {
    setAssigningSet(set);
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Błąd ładowania zestawów: {error.message}</p>
      </div>
    );
  }

  const filterTabs: ReadonlyArray<{ id: typeof filter; label: string; count: number; testId: string }> = [
    { id: 'all-templates', label: 'Wszystkie szablony', count: allTemplatesCount, testId: 'set-filter-all-templates-btn' },
    { id: 'fiziyo-templates', label: 'Szablony FiziYo', count: fiziyoTemplatesCount, testId: 'set-filter-fiziyo-templates-btn' },
    { id: 'my-templates', label: 'Szablony organizacji', count: myTemplatesCount, testId: 'set-filter-my-templates-btn' },
    { id: 'patient-plans', label: 'Plany pacjentów', count: patientPlansCount, testId: 'set-filter-patient-plans-btn' },
  ];

  return (
    <PageSheet contentClassName="gap-6">
      <PageHeader
        title="Zestawy ćwiczeń"
        titleTestId="set-page-title"
        subtitle="Szablony do wielokrotnego użycia i plany pacjentów"
        actions={
          <>
            <label className="relative w-full sm:w-[340px]">
              <span className="sr-only">Szukaj zestawów</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-label-secondary" aria-hidden="true" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj zestawów po nazwie lub opisie"
                className="pl-10"
                data-testid="set-search-input"
              />
            </label>
          {/* Tag Filter Dropdown */}
            {!HIDE_EXERCISE_TAGS && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('gap-2 shrink-0', selectedTags.length > 0 && 'border-primary/40 bg-primary/5')}
                    data-testid="set-tag-filter-btn"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Tagi</span>
                    {selectedTags.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                        {selectedTags.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-auto">
                  {selectedTags.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedTags([])}
                        className="w-full px-2 py-1.5 text-left text-[13px] text-label-secondary hover:text-foreground"
                        data-testid="set-tag-filter-clear-btn"
                      >
                        Wyczyść filtry ({selectedTags.length})
                      </button>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {availableTags.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">Brak tagów</div>
                  ) : (
                    availableTags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag.id}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTags((prev) => (checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)));
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color || '#5bb89a' }}
                          />
                          <span className="truncate">{tag.name}</span>
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              onClick={() => setIsCreateWizardOpen(true)}
              disabled={!organizationId}
              data-testid="set-create-wizard-btn"
            >
              <Plus aria-hidden="true" />
              Utwórz zestaw
            </Button>
          </>
        }
      />

      <div role="group" aria-label="Rodzaj zestawów" className="flex gap-6 overflow-x-auto shadow-[inset_0_-0.5px_0_var(--separator)]">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => applyFilter(tab.id)}
              className={cn(
                'h-11 shrink-0 whitespace-nowrap text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                isActive
                  ? 'text-foreground shadow-[inset_0_-2px_0_var(--tint)]'
                  : 'text-label-secondary hover:text-foreground'
              )}
              data-testid={tab.testId}
            >
              {tab.label}
              <span className="ml-1.5 tabular-nums text-label-secondary">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Results info */}
      {(searchQuery || filter !== 'all-templates' || selectedTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-label-secondary">
          <span aria-live="polite">
            {filteredSets.length} z {exerciseSets.length} zestawów
          </span>

          {/* Selected tags display */}
          {!HIDE_EXERCISE_TAGS && selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedTags.map((tagId) => {
                const tag = tagsMap.get(tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={tag.id}
                    className="text-xs px-2 py-0.5 gap-1 cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: `${tag.color || '#5bb89a'}20`,
                      color: tag.color || '#5bb89a',
                      borderColor: `${tag.color || '#5bb89a'}40`,
                    }}
                    onClick={() => setSelectedTags((prev) => prev.filter((id) => id !== tag.id))}
                  >
                    {tag.name}
                    <X className="h-3 w-3" />
                  </Badge>
                );
              })}
            </div>
          )}

          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} data-testid="set-search-clear-btn">
              Wyczyść wyszukiwanie
            </Button>
          )}
          {filter !== 'all-templates' && (
            <Button variant="ghost" size="sm" onClick={() => applyFilter('all-templates')} data-testid="set-filter-reset-btn">
              Pokaż wszystkie szablony
            </Button>
          )}
          {!HIDE_EXERCISE_TAGS && selectedTags.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} data-testid="set-tags-clear-btn">
              Wyczyść tagi
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-card bg-grouped-tertiary">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="p-4">
                <Skeleton className="mb-2 h-5 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="rounded-card bg-grouped-tertiary">
          <EmptyState
            icon={FolderKanban}
            title={searchQuery || filter !== 'all-templates' ? 'Brak pasujących zestawów' : 'Nie masz jeszcze zestawów'}
            description={
              searchQuery || filter !== 'all-templates'
                ? 'Zmień wyszukiwanie albo wybierz inny rodzaj zestawów.'
                : 'Szablon to zestaw, który przypiszesz wielu pacjentom.'
            }
            actionLabel={!searchQuery && filter === 'all-templates' ? 'Utwórz zestaw' : undefined}
            onAction={!searchQuery && filter === 'all-templates' ? () => setIsCreateWizardOpen(true) : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSets.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              className={cn(
                highlightedSetId === set.id && 'ring-2 ring-tint'
              )}
              tagsMap={tagsMap}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(s) => setDeletingSet(s)}
              onDuplicate={handleDuplicate}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}

      {/* Create Set Wizard */}
      {organizationId && (
        <CreateSetWizard
          open={isCreateWizardOpen}
          onOpenChange={setIsCreateWizardOpen}
          organizationId={organizationId}
          onSuccess={() => setIsCreateWizardOpen(false)}
        />
      )}

      {/* Edit Set Dialog */}
      {organizationId && editingSet && (
        <EditExerciseSetFullDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseEditDialog();
          }}
          exerciseSetId={editingSet.id}
          organizationId={organizationId}
          set={editingSet}
          onSuccess={handleCloseEditDialog}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingSet}
        onOpenChange={(open) => !open && setDeletingSet(null)}
        title="Usuń zestaw"
        description={`Zestaw „${deletingSet?.name}” zniknie z listy szablonów. Tej operacji nie można cofnąć.`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />

      {/* Assignment Wizard */}
      {organizationId && therapistId && (
        <AssignmentWizard
          open={!!assigningSet}
          onOpenChange={(open) => !open && setAssigningSet(null)}
          mode="from-set"
          organizationId={organizationId}
          therapistId={therapistId}
          preselectedSet={
            assigningSet
              ? {
                  id: assigningSet.id,
                  name: assigningSet.name,
                  description: assigningSet.description,
                  frequency: assigningSet.frequency ? normalizeFrequencySeed(assigningSet.frequency) : undefined,
                  exerciseMappings: assigningSet.exerciseMappings?.map((m) => ({
                    id: m.id,
                    exerciseId: m.exerciseId,
                    order: m.order,
                    exercise: m.exercise
                      ? {
                          id: m.exercise.id,
                          name: m.exercise.name,
                          imageUrl: m.exercise.imageUrl,
                          images: m.exercise.images,
                        }
                      : undefined,
                  })),
                }
              : undefined
          }
          onSuccess={() => setAssigningSet(null)}
        />
      )}
    </PageSheet>
  );
}
