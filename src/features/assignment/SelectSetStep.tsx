'use client';

import { useState, type MouseEvent } from 'react';
import Image from 'next/image';
import { Search, FolderKanban, Check, Dumbbell, ChevronRight, X, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ExerciseExecutionCard, fromExerciseMapping } from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import { ExerciseDetailsDialog } from './ExerciseDetailsDialog';
import { filterSetsByQuery, sortSetsForSelection } from './utils/selectSetStepUtils';
import type { ExerciseSet, AssignedSetInfo, ExerciseMapping } from './types';

interface SelectSetStepProps {
  exerciseSets: ExerciseSet[];
  selectedSet: ExerciseSet | null;
  onSelectSet: (set: ExerciseSet | null) => void;
  assignedSets?: AssignedSetInfo[];
  onUnassign?: (assignmentId: string, setName: string) => void;
  loading?: boolean;
  // Phantom Set props
  onCreateSet?: (searchQuery?: string) => void | Promise<void>;
  isCreatingSet?: boolean;
  patientName?: string;
}

export function SelectSetStep({
  exerciseSets,
  selectedSet,
  onSelectSet,
  assignedSets = [],
  onUnassign,
  loading = false,
  // Phantom Set props
  onCreateSet,
  isCreatingSet = false,
  patientName,
}: Readonly<SelectSetStepProps>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewSet, setPreviewSet] = useState<ExerciseSet | null>(selectedSet);
  const [selectedToUnassign, setSelectedToUnassign] = useState<string | null>(null);
  const [selectedMappingForDetails, setSelectedMappingForDetails] = useState<ExerciseMapping | null>(null);

  // Create a map for quick lookup of assigned sets
  const assignedSetsMap = new Map(assignedSets.map((a) => [a.exerciseSetId, a]));

  const filteredSets = filterSetsByQuery(exerciseSets, searchQuery);
  const sortedSets = sortSetsForSelection(filteredSets, assignedSets);

  const availableCount = exerciseSets.filter((set) => !assignedSetsMap.has(set.id)).length;

  const handleSetClick = (set: ExerciseSet) => {
    const isAssigned = assignedSetsMap.has(set.id);

    if (isAssigned) {
      // Toggle unassign selection for assigned sets
      if (selectedToUnassign === set.id) {
        setSelectedToUnassign(null);
        setPreviewSet(null);
        setSelectedMappingForDetails(null);
      } else {
        setSelectedToUnassign(set.id);
        setPreviewSet(set);
        setSelectedMappingForDetails(null);
        // Clear normal selection when selecting for unassign
        onSelectSet(null);
      }
    } else {
      // Normal selection for available sets
      setSelectedToUnassign(null);
      setPreviewSet(set);
      setSelectedMappingForDetails(null);
      onSelectSet(set);
    }
  };

  const handleUnassign = () => {
    if (!selectedToUnassign) return;
    const assignmentInfo = assignedSetsMap.get(selectedToUnassign);
    const set = exerciseSets.find((s) => s.id === selectedToUnassign);
    if (assignmentInfo && set && onUnassign) {
      onUnassign(assignmentInfo.assignmentId, set.name);
    }
    setSelectedToUnassign(null);
    setPreviewSet(null);
    setSelectedMappingForDetails(null);
  };

  const handleExerciseCardClick = (mapping: ExerciseMapping, event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) return;
    setSelectedMappingForDetails(mapping);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-6 p-4 lg:grid lg:grid-cols-2 sm:p-6">
      {/* Left column - Set list */}
      <div className="flex min-h-56 min-w-0 flex-1 flex-col lg:min-h-0">
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj zestawów..."
              aria-label="Szukaj zestawów"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
              data-testid="assign-set-search"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {availableCount} dostępnych
              {assignedSets.length > 0 && <span> • {assignedSets.length} przypisanych</span>}
            </p>
            {(selectedSet || selectedToUnassign) && (
              <button
                data-testid="selectsetstep-button-121"
                type="button"
                onClick={() => {
                  setPreviewSet(null);
                  onSelectSet(null);
                  setSelectedToUnassign(null);
                  setSelectedMappingForDetails(null);
                }}
                className="min-h-11 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Wyczyść wybór
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-2 pr-3">
              {/* Phantom Set - Karta "Stwórz nowy" */}
              {onCreateSet && (
                <button
                  type="button"
                  disabled={isCreatingSet}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-sm border border-border p-3 text-left transition-colors duration-150',
                    'hover:border-primary hover:bg-primary-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:pointer-events-none disabled:opacity-50'
                  )}
                  onClick={() => !isCreatingSet && onCreateSet(searchQuery)}
                  data-testid="assign-set-create-btn"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted">
                    {isCreatingSet ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 wrap-anywhere">
                    <span className="block text-sm font-semibold">Utwórz plan od zera</span>
                    {patientName && <span className="block text-sm text-muted-foreground">{patientName}</span>}
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              )}

              {/* Empty state */}
              {sortedSets.length === 0 && (
                <EmptyState
                  density="compact"
                  icon={FolderKanban}
                  title={searchQuery ? 'Nie znaleziono zestawów' : 'Brak dostępnych zestawów'}
                />
              )}
              {sortedSets.map((set) => {
                const isAssigned = assignedSetsMap.has(set.id);
                const isSelectedForAssign = selectedSet?.id === set.id;
                const isSelectedForUnassign = selectedToUnassign === set.id;
                const isPreview = previewSet?.id === set.id;
                const exerciseCount = set.exerciseMappings?.length || 0;
                const firstImage = getMediaUrl(
                  set.exerciseMappings?.[0]?.exercise?.imageUrl || set.exerciseMappings?.[0]?.exercise?.images?.[0]
                );

                return (
                  <button
                    key={set.id}
                    type="button"
                    aria-pressed={isSelectedForAssign || isSelectedForUnassign}
                    className={cn(
                      'flex w-full min-w-0 items-center gap-3 rounded-sm border p-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelectedForUnassign
                        ? 'bg-destructive/10 border-destructive'
                        : isSelectedForAssign
                          ? 'bg-primary-muted border-primary'
                          : isPreview
                            ? 'bg-surface-light border-border'
                            : isAssigned
                              ? 'text-muted-foreground hover:bg-surface-light border-border'
                              : 'hover:bg-surface-light border-border'
                    )}
                    onClick={() => handleSetClick(set)}
                    data-testid={`assign-set-item-${set.id}`}
                  >
                    {/* Preview image */}
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm">
                      {firstImage ? (
                        <Image
                          src={firstImage}
                          alt=""
                          fill
                          className={cn('object-cover', isAssigned && !isSelectedForUnassign && 'grayscale')}
                          sizes="56px"
                        />
                      ) : (
                        <span className="h-full w-full bg-surface-light flex items-center justify-center">
                          <FolderKanban className="h-6 w-6 text-muted-foreground/50" />
                        </span>
                      )}
                    </span>

                    {/* Info */}
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'min-w-0 flex-1 wrap-anywhere text-sm font-semibold',
                            isAssigned && !isSelectedForUnassign && 'text-muted-foreground'
                          )}
                        >
                          {set.name}
                        </span>
                        {isAssigned && (
                          <span className={cn(badgeVariants({ variant: isSelectedForUnassign ? 'destructive' : 'secondary' }), 'shrink-0')}>
                            Przypisany
                          </span>
                        )}
                        <span className={cn(badgeVariants({ variant: 'secondary' }), 'shrink-0')}>
                          {exerciseCount} ćw.
                        </span>
                      </span>
                      {set.description && (
                        <span className="mt-1 block text-sm text-muted-foreground line-clamp-1">{set.description}</span>
                      )}
                    </span>

                    {/* Selection indicator */}
                    <span className="shrink-0">
                      {isSelectedForUnassign ? (
                        <span className="h-6 w-6 rounded-full bg-destructive flex items-center justify-center">
                          <X className="h-4 w-4 text-destructive-foreground" />
                        </span>
                      ) : isSelectedForAssign ? (
                        <span className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </span>
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right column - Set Preview (read-only) */}
      <div
        className={cn(
          'min-w-0 flex-1 flex-col border-border lg:border-l lg:pl-6',
          previewSet ? 'flex min-h-72 lg:min-h-0' : 'hidden min-h-0 lg:flex'
        )}
      >
        {previewSet ? (
          <>
            <div className="border-b border-border pb-3 wrap-anywhere">
              <h3 className="font-semibold text-base">{previewSet.name}</h3>
              {previewSet.description && <p className="text-sm text-muted-foreground mt-1">{previewSet.description}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{previewSet.exerciseMappings?.length || 0} ćwiczeń</Badge>
                {selectedToUnassign === previewSet.id && <Badge variant="destructive">Wybrany do odpisania</Badge>}
              </div>
              {selectedToUnassign === previewSet.id && onUnassign && (
                <Button
                  data-testid="assignment-select-set-step-btn-295"
                  variant="destructive"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={handleUnassign}
                >
                  <X className="h-4 w-4 mr-2" />
                  Odpisz ten zestaw od pacjenta
                </Button>
              )}
            </div>

            <div className="pt-3 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Ćwiczenia w zestawie</p>
            </div>

            <ScrollArea className="min-h-0 flex-1 pb-4 pr-3">
              <div className="space-y-2">
                {previewSet.exerciseMappings?.map((mapping) => {
                  const cardData = fromExerciseMapping(mapping);
                  return (
                    <div
                      key={mapping.id}
                      className="rounded-sm cursor-pointer"
                      onClick={(event) => handleExerciseCardClick(mapping, event)}
                      data-testid={`assign-set-preview-exercise-row-${mapping.id}`}
                    >
                      <ExerciseExecutionCard
                        mode="view"
                        exercise={cardData}
                        viewVariant="readable"
                        hideTimerBadge
                        testIdPrefix="assign-set-preview-exercise"
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <EmptyState density="compact" icon={Dumbbell} title="Podgląd zestawu" description="Nie wybrano zestawu." />
        )}
      </div>

      <ExerciseDetailsDialog
        open={Boolean(selectedMappingForDetails)}
        mapping={selectedMappingForDetails}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMappingForDetails(null);
          }
        }}
      />
    </div>
  );
}
