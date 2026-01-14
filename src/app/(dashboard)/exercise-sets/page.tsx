'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Plus, FolderKanban, FolderPlus, Search, Sparkles, Clock, Filter, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SetCard, ExerciseSet } from '@/components/exercise-sets/SetCard';
import { SetDialog } from '@/components/exercise-sets/SetDialog';
import { CreateSetWizard } from '@/components/exercise-sets/CreateSetWizard';
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';
import { cn } from '@/lib/utils';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY, GET_RECENTLY_USED_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { DELETE_EXERCISE_SET_MUTATION, DUPLICATE_EXERCISE_SET_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { matchesSearchQuery } from '@/utils/textUtils';
import { useDataManagement } from '@/hooks/useDataManagement';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrganizationExerciseSetsResponse, ExerciseTag, UserByClerkIdResponse } from '@/types/apollo';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type FilterType = 'all' | 'recent' | 'templates';

interface RecentAssignment {
  exerciseSetId: string;
  assignedAt: string;
}

export default function ExerciseSetsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ExerciseSet | null>(null);
  const [deletingSet, setDeletingSet] = useState<ExerciseSet | null>(null);
  const [assigningSet, setAssigningSet] = useState<ExerciseSet | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get user data for therapistId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });
  const therapistId = (userData as UserByClerkIdResponse)?.userByClerkId?.id;

  // Data management hook for importing examples
  const { importExampleSets, isImporting, hasImportedExamples } = useDataManagement({
    organizationId,
  });

  // Get exercise sets
  const { data, loading, error } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get recently used sets (for "Ostatnio używane" filter)
  const { data: recentData } = useQuery(GET_RECENTLY_USED_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get exercise tags for filtering
  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Mutations
  const [deleteSet, { loading: deleting }] = useMutation(DELETE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
  });

  const [duplicateSet] = useMutation(DUPLICATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
  });

  const exerciseSets: ExerciseSet[] = (data as OrganizationExerciseSetsResponse)?.exerciseSets || [];
  const recentAssignments: RecentAssignment[] = (recentData as { patientAssignments?: RecentAssignment[] })?.patientAssignments || [];
  const exerciseTags: ExerciseTag[] = (tagsData as { exerciseTags?: ExerciseTag[] })?.exerciseTags || [];

  // Create map of tags by ID for quick lookup
  const tagsMap = useMemo(() => {
    const map = new Map<string, ExerciseTag>();
    for (const tag of exerciseTags) {
      map.set(tag.id, tag);
    }
    return map;
  }, [exerciseTags]);

  // Create map of recently used set IDs with their latest assignment date
  const recentSetMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const assignment of recentAssignments) {
      if (!map.has(assignment.exerciseSetId)) {
        map.set(assignment.exerciseSetId, assignment.assignedAt);
      }
    }
    return map;
  }, [recentAssignments]);

  // Get all unique tags used in exercise sets (aggregated from exercises)
  const availableTags = useMemo(() => {
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
      .map(id => tagsMap.get(id))
      .filter((tag): tag is ExerciseTag => tag !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exerciseSets, tagsMap]);

  // Helper: check if a set contains any of the selected tags
  const setHasSelectedTags = (set: ExerciseSet): boolean => {
    if (selectedTags.length === 0) return true;
    for (const mapping of set.exerciseMappings || []) {
      const exercise = mapping.exercise;
      const allTags = [...(exercise?.mainTags || []), ...(exercise?.additionalTags || [])];
      if (allTags.some(tagId => selectedTags.includes(tagId))) {
        return true;
      }
    }
    return false;
  };

  // Calculate stats
  const totalCount = exerciseSets.length;
  const recentCount = recentSetMap.size;
  const templatesCount = exerciseSets.filter((s) => s.isTemplate === true).length;

  // Filter by status/template
  const statusFilteredSets = exerciseSets.filter((set) => {
    if (filter === 'all') return true;
    if (filter === 'recent') return recentSetMap.has(set.id);
    if (filter === 'templates') return set.isTemplate === true;
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

    if (filter === 'recent') {
      // Sort by last assignment date (most recent first)
      sorted.sort((a, b) => {
        const aDate = recentSetMap.get(a.id);
        const bDate = recentSetMap.get(b.id);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    } else {
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
    }

    return sorted;
  }, [searchFilteredSets, filter, recentSetMap]);

  const handleView = (set: ExerciseSet) => {
    router.push(`/exercise-sets/${set.id}`);
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
    <div className="space-y-6">
      {/* Compact Header with Search and Tag Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground shrink-0" data-testid="set-page-title">Zestawy ćwiczeń</h1>

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "gap-2 shrink-0",
                  selectedTags.length > 0 && "border-primary/40 bg-primary/5"
                )}
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
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  Brak tagów
                </div>
              ) : (
                availableTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={selectedTags.includes(tag.id)}
                    onCheckedChange={(checked) => {
                      setSelectedTags(prev =>
                        checked
                          ? [...prev, tag.id]
                          : prev.filter(id => id !== tag.id)
                      );
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color || '#22c55e' }}
                      />
                      <span className="truncate">{tag.name}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <FolderPlus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">
                Nowy zestaw
              </h3>
              <p className="text-sm text-white/70">
                Utwórz program ćwiczeń
              </p>
            </div>
            <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
          </div>
        </button>

        {/* Quick Stats - Clickable filters */}
        <div className="grid grid-cols-3 gap-3 sm:col-span-1 lg:col-span-8">
          {/* All sets */}
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'all'
                ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
            data-testid="set-filter-all-btn"
          >
            <div className="flex items-center gap-2">
              <FolderKanban className={cn('h-4 w-4', filter === 'all' ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-2xl font-bold', filter === 'all' ? 'text-primary' : 'text-foreground')}>
                {totalCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Wszystkie</p>
          </button>

          {/* Recently used sets */}
          <button
            onClick={() => setFilter('recent')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'recent'
                ? 'border-secondary/40 bg-secondary/10 ring-1 ring-secondary/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
            data-testid="set-filter-recent-btn"
          >
            <div className="flex items-center gap-2">
              <Clock className={cn('h-4 w-4', filter === 'recent' ? 'text-secondary' : 'text-muted-foreground')} />
              <span className={cn('text-2xl font-bold', filter === 'recent' ? 'text-secondary' : 'text-foreground')}>
                {recentCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ostatnio używane</p>
          </button>

          {/* Templates */}
          <button
            onClick={() => setFilter('templates')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'templates'
                ? 'border-info/40 bg-info/10 ring-1 ring-info/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
            data-testid="set-filter-templates-btn"
          >
            <div className="flex items-center gap-2">
              <Sparkles className={cn('h-4 w-4', filter === 'templates' ? 'text-info' : 'text-muted-foreground')} />
              <span className={cn('text-2xl font-bold', filter === 'templates' ? 'text-info' : 'text-foreground')}>
                {templatesCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Szablony</p>
          </button>
        </div>
      </div>

      {/* Results info */}
      {(searchQuery || filter !== 'all' || selectedTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Wyniki:</span>
          <Badge variant="secondary" className="text-xs">
            {filteredSets.length} z {totalCount}
          </Badge>

          {/* Selected tags display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedTags.map(tagId => {
                const tag = tagsMap.get(tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={tag.id}
                    className="text-xs px-2 py-0.5 gap-1 cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: `${tag.color || '#22c55e'}20`,
                      color: tag.color || '#22c55e',
                      borderColor: `${tag.color || '#22c55e'}40`
                    }}
                    onClick={() => setSelectedTags(prev => prev.filter(id => id !== tag.id))}
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
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSearchQuery('')}
            >
              Wyczyść wyszukiwanie
            </Button>
          )}
          {filter !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setFilter('all')}
            >
              Pokaż wszystkie
            </Button>
          )}
          {selectedTags.length > 0 && (
            <Button
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger">
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
              title={searchQuery || filter !== 'all' ? 'Nie znaleziono zestawów' : 'Brak zestawów'}
              description={
                searchQuery || filter !== 'all'
                  ? 'Spróbuj zmienić kryteria wyszukiwania lub filtry'
                  : 'Utwórz pierwszy zestaw lub załaduj przykładowe zestawy ćwiczeń'
              }
              actionLabel={!searchQuery && filter === 'all' ? 'Nowy zestaw' : undefined}
              onAction={!searchQuery && filter === 'all' ? () => setIsCreateWizardOpen(true) : undefined}
              secondaryActionLabel={!searchQuery && filter === 'all' && !hasImportedExamples ? 'Załaduj przykłady' : undefined}
              onSecondaryAction={!searchQuery && filter === 'all' && !hasImportedExamples ? importExampleSets : undefined}
              secondaryActionLoading={isImporting}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger">
          {filteredSets.map((set) => (
            <SetCard
              key={set.id}
              set={set}
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
      {organizationId && (
        <SetDialog
          open={isEditDialogOpen}
          onOpenChange={handleCloseEditDialog}
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

      {/* Assignment Wizard */}
      {organizationId && therapistId && (
        <AssignmentWizard
          open={!!assigningSet}
          onOpenChange={(open) => !open && setAssigningSet(null)}
          mode="from-set"
          organizationId={organizationId}
          therapistId={therapistId}
          preselectedSet={assigningSet ? {
            id: assigningSet.id,
            name: assigningSet.name,
            description: assigningSet.description,
            exerciseMappings: assigningSet.exerciseMappings?.map(m => ({
              id: m.id,
              exerciseId: m.exerciseId,
              order: m.order,
              exercise: m.exercise ? {
                id: m.exercise.id,
                name: m.exercise.name,
                imageUrl: m.exercise.imageUrl,
                images: m.exercise.images,
              } : undefined,
            })),
          } : undefined}
          onSuccess={() => setAssigningSet(null)}
        />
      )}
    </div>
  );
}
