'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FolderKanban, FolderPlus, Sparkles, Filter, X, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { SearchInput } from '@/components/shared/SearchInput';
import { PageHeader } from '@/components/shared/page/PageHeader';
import { PageHero } from '@/components/shared/page/PageHero';
import { PageShell } from '@/components/shared/page/PageShell';
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
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { DELETE_EXERCISE_SET_MUTATION, DUPLICATE_EXERCISE_SET_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { matchesSearchQuery } from '@/utils/textUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrganizationExerciseSetsResponse, ExerciseTag } from '@/types/apollo';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type FilterType = 'all-templates' | 'fiziyo-templates' | 'my-templates' | 'patient-plans';

const VALID_FILTERS: FilterType[] = ['all-templates', 'fiziyo-templates', 'my-templates', 'patient-plans'];

function parseFilterFromUrl(rawFilter: string | null): FilterType {
  if (!rawFilter) return 'all-templates';
  return VALID_FILTERS.includes(rawFilter as FilterType) ? (rawFilter as FilterType) : 'all-templates';
}

export function ExerciseSetsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const { user: currentUser } = useCurrentUser();
  const therapistId = currentUser?.id;

  // Get exercise sets
  const { data, loading, error, refetch } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
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

  const [duplicateSet] = useMutation(DUPLICATE_EXERCISE_SET_MUTATION, {
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

  const isTemplateSet = (set: ExerciseSet) => set.kind === 'TEMPLATE' || set.isTemplate === true;
  const isFiziyoTemplate = (set: ExerciseSet) => isTemplateSet(set) && set.templateSource === 'FIZIYO_VERIFIED';
  const isMyTemplate = (set: ExerciseSet) =>
    isTemplateSet(set) &&
    (set.templateSource === 'ORGANIZATION_PRIVATE' || set.templateSource === 'ORG_PRIVATE' || !set.templateSource);
  const isPatientPlan = (set: ExerciseSet) => set.kind === 'PATIENT_PLAN';

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSetId = (result.data as any)?.duplicateExerciseSet?.id;
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
    return <ErrorState description={error.message} onRetry={() => void refetch()} />;
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Zestawy" titleTestId="set-page-title" className="shrink-0" />

        <div className="flex items-center gap-3 flex-1 justify-end">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Szukaj zestawów po nazwie lub opisie..."
            aria-label="Szukaj zestawów"
            testId="set-search-input"
            className="w-full sm:w-80 lg:w-96"
          />

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
                      data-testid="page-button-334"
                      onClick={() => setSelectedTags([])}
                      className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground text-left"
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
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        <PageHero
          title="Nowy zestaw"
          description="Utwórz zestaw ćwiczeń"
          icon={<FolderPlus className="h-5 w-5 text-primary-foreground" />}
          onClick={() => setIsCreateWizardOpen(true)}
          disabled={!organizationId}
          testId="set-create-wizard-btn"
        />

        {/* Quick Stats - Clickable filters */}
        <div className="grid grid-cols-2 gap-3 sm:col-span-1 lg:col-span-8 lg:grid-cols-4">
          <button
            onClick={() => applyFilter('all-templates')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'all-templates'
                ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
            data-testid="set-filter-all-templates-btn"
          >
            <div className="flex items-center gap-2">
              <FolderKanban
                className={cn('h-4 w-4', filter === 'all-templates' ? 'text-primary' : 'text-muted-foreground')}
              />
              <span
                className={cn('text-2xl font-bold', filter === 'all-templates' ? 'text-primary' : 'text-foreground')}
              >
                {allTemplatesCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Wszystkie zestawy źródłowe</p>
          </button>

          <button
            onClick={() => applyFilter('fiziyo-templates')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'fiziyo-templates'
                ? 'border-info/40 bg-info/10 ring-1 ring-info/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
            data-testid="set-filter-fiziyo-templates-btn"
          >
            <div className="flex items-center gap-2">
              <Sparkles
                className={cn('h-4 w-4', filter === 'fiziyo-templates' ? 'text-info' : 'text-muted-foreground')}
              />
              <span
                className={cn('text-2xl font-bold', filter === 'fiziyo-templates' ? 'text-info' : 'text-foreground')}
              >
                {fiziyoTemplatesCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Zestawy FiziYo</p>
          </button>

          <button
            onClick={() => applyFilter('my-templates')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'my-templates'
                ? 'border-info/40 bg-info/10 ring-1 ring-info/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
            data-testid="set-filter-my-templates-btn"
          >
            <div className="flex items-center gap-2">
              <UserRound className={cn('h-4 w-4', filter === 'my-templates' ? 'text-info' : 'text-muted-foreground')} />
              <span className={cn('text-2xl font-bold', filter === 'my-templates' ? 'text-info' : 'text-foreground')}>
                {myTemplatesCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Zestawy organizacji</p>
          </button>

          <button
            onClick={() => applyFilter('patient-plans')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'patient-plans'
                ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/15'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
            data-testid="set-filter-patient-plans-btn"
          >
            <div className="flex items-center gap-2">
              <FolderPlus
                className={cn('h-4 w-4', filter === 'patient-plans' ? 'text-primary' : 'text-muted-foreground')}
              />
              <span
                className={cn('text-2xl font-bold', filter === 'patient-plans' ? 'text-primary' : 'text-foreground')}
              >
                {patientPlansCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Zestawy spersonalizowane</p>
          </button>
        </div>
      </div>

      {/* Results info */}
      {(searchQuery || filter !== 'all-templates' || selectedTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Wyniki:</span>
          <Badge variant="secondary" className="text-xs">
            {filteredSets.length} z {exerciseSets.length}
          </Badge>

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
            <Button
              data-testid="set-exercise-sets-page-btn-495"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSearchQuery('')}
            >
              Wyczyść wyszukiwanie
            </Button>
          )}
          {filter !== 'all-templates' && (
            <Button
              data-testid="set-exercise-sets-page-btn-500"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => applyFilter('all-templates')}
            >
              Pokaż wszystkie zestawy źródłowe
            </Button>
          )}
          {!HIDE_EXERCISE_TAGS && selectedTags.length > 0 && (
            <Button
              data-testid="page-button-534"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSelectedTags([])}
            >
              Wyczyść tagi
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <ListSkeleton variant="grid" count={6} className="xl:grid-cols-4 2xl:grid-cols-5" />
      ) : filteredSets.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16">
            <EmptyState
              icon={FolderKanban}
              title={searchQuery || filter !== 'all-templates' ? 'Nie znaleziono zestawów' : 'Brak zestawów'}
              description={
                searchQuery || filter !== 'all-templates'
                  ? 'Spróbuj zmienić kryteria wyszukiwania lub filtry'
                  : 'Utwórz pierwszy zestaw ćwiczeń'
              }
              actionLabel={!searchQuery && filter === 'all-templates' ? 'Nowy zestaw' : undefined}
              onAction={!searchQuery && filter === 'all-templates' ? () => setIsCreateWizardOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 animate-stagger">
          {filteredSets.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              className={cn(
                highlightedSetId === set.id &&
                  'ring-2 ring-primary/40 shadow-lg shadow-primary/10 transition-shadow duration-300'
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
        description={`Czy na pewno chcesz usunąć zestaw "${deletingSet?.name}"? Ta operacja jest nieodwracalna.`}
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
    </PageShell>
  );
}
