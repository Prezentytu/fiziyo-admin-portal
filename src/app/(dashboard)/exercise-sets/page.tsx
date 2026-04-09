'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Plus, FolderKanban, FolderPlus, Search, Sparkles, Filter, X, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SetCard, ExerciseSet } from '@/features/exercise-sets/SetCard';
import { EditExerciseSetFullDialog } from '@/features/exercise-sets/EditExerciseSetFullDialog';
import { CreateSetWizard } from '@/features/exercise-sets/CreateSetWizard';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import { cn } from '@/lib/utils';
import { HIDE_EXERCISE_TAGS } from '@/components/shared/exercise';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { DELETE_EXERCISE_SET_MUTATION, DUPLICATE_EXERCISE_SET_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { matchesSearchQuery } from '@/utils/textUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrganizationExerciseSetsResponse, ExerciseTag, UserByClerkIdResponse } from '@/types/apollo';
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
    isTemplateSet(set)
    && (set.templateSource === 'ORGANIZATION_PRIVATE' || set.templateSource === 'ORG_PRIVATE' || !set.templateSource);
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
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Błąd ładowania zestawów: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
      {/* Compact Header with Search and Tag Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground shrink-0" data-testid="set-page-title">
          Zestawy ćwiczeń
        </h1>

        <div className="flex items-center gap-3 flex-1 justify-end">
          {/* Enlarged Search */}
          <div className="relative w-full sm:w-80 lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj zestawów po nazwie lub opisie..."
              className="pl-9 pr-9 bg-surface border-border/60"
              data-testid="set-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

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

      {/* Hero Action + Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Nowy zestaw */}
        <button
          onClick={() => setIsCreateWizardOpen(true)}
          disabled={!organizationId}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:col-span-1 lg:col-span-4"
          data-testid="set-create-wizard-btn"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-foreground/10 rounded-full blur-3xl group-hover:bg-primary-foreground/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <FolderPlus className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-primary-foreground">Nowy zestaw</h3>
              <p className="text-sm text-primary-foreground/70">Utwórz program ćwiczeń</p>
            </div>
            <Plus className="h-5 w-5 text-primary-foreground/60 group-hover:text-primary-foreground transition-colors shrink-0" />
          </div>
        </button>

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
              <UserRound
                className={cn('h-4 w-4', filter === 'my-templates' ? 'text-info' : 'text-muted-foreground')}
              />
              <span
                className={cn('text-2xl font-bold', filter === 'my-templates' ? 'text-info' : 'text-foreground')}
              >
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
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSearchQuery('')}>
              Wyczyść wyszukiwanie
            </Button>
          )}
          {filter !== 'all-templates' && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => applyFilter('all-templates')}>
              Pokaz wszystkie zestawy zrodlowe
            </Button>
          )}
          {!HIDE_EXERCISE_TAGS && selectedTags.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedTags([])}>
              Wyczyść tagi
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 animate-stagger">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/40">
              <Skeleton className="aspect-[4/3] w-full" />
              <CardContent className="p-4">
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
    </div>
  );
}
