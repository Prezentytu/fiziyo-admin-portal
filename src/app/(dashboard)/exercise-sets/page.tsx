'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { Plus, FolderKanban, FolderPlus, Search, Sparkles } from 'lucide-react';
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
import { cn } from '@/lib/utils';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { DELETE_EXERCISE_SET_MUTATION, DUPLICATE_EXERCISE_SET_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { matchesSearchQuery } from '@/utils/textUtils';
import { useDataManagement } from '@/hooks/useDataManagement';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { OrganizationExerciseSetsResponse } from '@/types/apollo';

type FilterType = 'all' | 'active' | 'templates' | 'inactive';

export default function ExerciseSetsPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ExerciseSet | null>(null);
  const [deletingSet, setDeletingSet] = useState<ExerciseSet | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Data management hook for importing examples
  const { importExampleSets, isImporting, hasImportedExamples } = useDataManagement({
    organizationId,
  });

  // Get exercise sets
  const { data, loading, error } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
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

  // Calculate stats
  const totalCount = exerciseSets.length;
  const activeCount = exerciseSets.filter((s) => s.isActive !== false).length;
  const templatesCount = exerciseSets.filter((s) => s.isTemplate === true).length;
  const inactiveCount = exerciseSets.filter((s) => s.isActive === false).length;

  // Filter by status/template
  const statusFilteredSets = exerciseSets.filter((set) => {
    if (filter === 'all') return true;
    if (filter === 'active') return set.isActive !== false;
    if (filter === 'inactive') return set.isActive === false;
    if (filter === 'templates') return set.isTemplate === true;
    return true;
  });

  // Filter by search query
  const searchFilteredSets = statusFilteredSets.filter(
    (set) => matchesSearchQuery(set.name, searchQuery) || matchesSearchQuery(set.description, searchQuery)
  );

  // Sort by creation date (newest first), inactive at the bottom
  const filteredSets = [...searchFilteredSets].sort((a, b) => {
    // Inactive at bottom
    const aInactive = a.isActive === false;
    const bInactive = b.isActive === false;
    if (aInactive && !bInactive) return 1;
    if (!aInactive && bInactive) return -1;
    // Then by creation time (newest first)
    const aTime = a.creationTime ? new Date(a.creationTime).getTime() : 0;
    const bTime = b.creationTime ? new Date(b.creationTime).getTime() : 0;
    return bTime - aTime;
  });

  const handleView = (set: ExerciseSet) => {
    router.push(`/exercise-sets/${set.id}`);
  };

  const handleEdit = (set: ExerciseSet) => {
    setEditingSet(set);
    setIsEditDialogOpen(true);
  };

  const handleDuplicate = async (set: ExerciseSet) => {
    try {
      await duplicateSet({
        variables: { exerciseSetId: set.id },
      });
      toast.success('Zestaw został zduplikowany');
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

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Błąd ładowania zestawów: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Header with Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground" data-testid="set-page-title">Zestawy ćwiczeń</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj zestawów..."
            className="pl-9 bg-surface border-border/60"
            data-testid="set-search-input"
          />
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

          {/* Active sets */}
          <button
            onClick={() => setFilter('active')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'active'
                ? 'border-secondary/40 bg-secondary/10 ring-1 ring-secondary/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
            data-testid="set-filter-active-btn"
          >
            <div className="flex items-center gap-2">
              <FolderKanban className={cn('h-4 w-4', filter === 'active' ? 'text-secondary' : 'text-muted-foreground')} />
              <span className={cn('text-2xl font-bold', filter === 'active' ? 'text-secondary' : 'text-foreground')}>
                {activeCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aktywne</p>
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
      {(searchQuery || filter !== 'all') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Wyniki:</span>
          <Badge variant="secondary" className="text-xs">
            {filteredSets.length} z {totalCount}
          </Badge>
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
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(s) => setDeletingSet(s)}
              onDuplicate={handleDuplicate}
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
    </div>
  );
}
