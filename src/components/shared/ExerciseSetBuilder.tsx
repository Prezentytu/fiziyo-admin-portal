'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Search,
  Loader2,
  Dumbbell,
  Plus,
  GripVertical,
  Eye,
  TrendingUp,
  Sparkles,
  Timer,
  Pencil,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getMediaUrl } from '@/utils/mediaUrl';
import { ExerciseExecutionCard, fromBuilderExercise } from '@/components/shared/exercise';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { filterExercisesBySource, countBySource } from '@/utils/exerciseSourceFilter';
import type { ExerciseSourceFilter } from '@/utils/exerciseSourceFilter';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface ExerciseInstance {
  instanceId: string;
  exerciseId: string;
}

export interface ExerciseTag {
  id: string;
  name: string;
  color?: string;
}

export interface BuilderExercise {
  id: string;
  name: string;
  type?: string;
  patientDescription?: string;
  side?: string;
  thumbnailUrl?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  defaultExecutionTime?: number;
  description?: string;
  imageUrl?: string;
  images?: string[];
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  exerciseSide?: string;
  mainTags?: ExerciseTag[];
  additionalTags?: ExerciseTag[];
  /** GLOBAL | ORGANIZATION | PERSONAL - for source filter (Moje / Wszystkie / FiziYo) */
  scope?: string;
}

export interface ExerciseParams {
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  executionTime?: number;
  notes?: string;
  exerciseSide?: string;
  customName?: string;
  customDescription?: string;
  tempo?: string;
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
  // Structured load (alternative to individual load fields)
  load?: {
    type: 'weight' | 'band' | 'bodyweight' | 'other';
    value?: number;
    unit?: 'kg' | 'lbs' | 'level';
    text: string;
  };
}

export interface ExerciseSetBuilderProps {
  // Set name
  name: string;
  onNameChange: (name: string) => void;
  namePlaceholder?: string;
  nameLabel?: string;

  /** Optional set description; when provided with onDescriptionChange, shows description field under name. */
  description?: string;
  onDescriptionChange?: (description: string) => void;
  descriptionPlaceholder?: string;

  // Exercises state (instances + params)
  selectedInstances: ExerciseInstance[];
  onSelectedInstancesChange: (instances: ExerciseInstance[]) => void;
  exerciseParams: Map<string, ExerciseParams>;
  onExerciseParamsChange: (params: Map<string, ExerciseParams>) => void;

  // Available exercises
  availableExercises: BuilderExercise[];
  loadingExercises?: boolean;

  // Tags for filtering
  tags?: ExerciseTag[];

  // Exercise popularity for "Popular" section
  exercisePopularity?: Record<string, number>;

  // AI integration
  showAI?: boolean;
  onAIClick?: () => void;
  aiButtonLabel?: string;

  // When true, name is rendered by parent (e.g. in wizard toolbar); no Name Section block.
  hideNameSection?: boolean;

  // Preview exercise callback
  onPreviewExercise?: (exercise: BuilderExercise) => void;

  // Test IDs prefix
  testIdPrefix?: string;

  /** When set, instances with these IDs are shown read-only (e.g. already in set). */
  readonlyInstanceIds?: Set<string>;
}

// ============================================================
// EXERCISE PICKER ITEM
// ============================================================

function ExercisePickerItem({
  exercise,
  instanceCount,
  onAdd,
  onPreview,
  getExerciseTags,
}: {
  exercise: BuilderExercise;
  instanceCount: number;
  onAdd: () => void;
  onPreview: () => void;
  getExerciseTags: (ex: BuilderExercise) => ExerciseTag[];
}) {
  const imageUrl = getMediaUrl(exercise.thumbnailUrl ?? exercise.imageUrl ?? exercise.images?.[0]);

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 border overflow-hidden min-w-0',
        instanceCount > 0
          ? 'bg-surface-light border-border/80 opacity-80'
          : 'bg-surface/50 hover:bg-surface-light border-border/50 hover:border-border'
      )}
    >
      <button
        type="button"
        onClick={onPreview}
        className="h-9 w-9 rounded-lg overflow-hidden shrink-0 relative group bg-surface-light border border-border/60 cursor-pointer"
        aria-label={`Podgląd galerii ćwiczenia: ${exercise.name}`}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill className="object-cover" sizes="36px" />
        ) : (
          <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <Eye className="h-3 w-3 text-white" />
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{exercise.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {getExerciseTags(exercise)
            .slice(0, 1)
            .map((tag) => (
              <ColorBadge key={tag.id} color={tag.color} size="sm">
                {tag.name}
              </ColorBadge>
            ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {instanceCount > 0 && (
          <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
            {instanceCount}x
          </span>
        )}
        <Button
          size="icon"
          variant="secondary"
          onClick={onAdd}
          className="h-8 w-8 rounded-lg bg-surface-light hover:bg-primary hover:text-primary-foreground border-border transition-all"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// SORTABLE EXERCISE CARD - uses shared ExerciseExecutionCard
// ============================================================

function applyCardPatchToParams(
  patch: Partial<ExerciseExecutionCardData>,
  onUpdateParams: (field: keyof ExerciseParams, value: number | string) => void
): void {
  if (patch.sets !== undefined) onUpdateParams('sets', patch.sets);
  if (patch.reps !== undefined) onUpdateParams('reps', patch.reps);
  if (patch.duration !== undefined) onUpdateParams('duration', patch.duration);
  if (patch.executionTime !== undefined) onUpdateParams('executionTime', patch.executionTime);
  if (patch.restSets !== undefined) onUpdateParams('restSets', patch.restSets);
  if (patch.restReps !== undefined) onUpdateParams('restReps', patch.restReps ?? 0);
  if (patch.preparationTime !== undefined) onUpdateParams('preparationTime', patch.preparationTime);
  if (patch.tempo !== undefined) onUpdateParams('tempo', patch.tempo);
  if (patch.notes !== undefined) onUpdateParams('notes', patch.notes);
  if (patch.customName !== undefined) onUpdateParams('customName', patch.customName);
  if (patch.customDescription !== undefined) onUpdateParams('customDescription', patch.customDescription);
  if (patch.side !== undefined) onUpdateParams('exerciseSide', patch.side);
  if (patch.loadKg !== undefined) {
    onUpdateParams('loadValue', patch.loadKg ?? 0);
    onUpdateParams('loadUnit', 'kg');
  }
}

function SortableExerciseCard({
  instanceId,
  exercise,
  index,
  params,
  onUpdateParams,
  onRemove,
  onPreview,
  testIdPrefix,
  isReadonly,
}: {
  instanceId: string;
  exercise: BuilderExercise;
  index: number;
  params: ExerciseParams;
  onUpdateParams: (field: keyof ExerciseParams, value: number | string) => void;
  onRemove: () => void;
  onPreview: () => void;
  testIdPrefix?: string;
  isReadonly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instanceId,
    disabled: isReadonly,
  });

  const cardData = useMemo(
    () => fromBuilderExercise(exercise, params),
    [exercise, params]
  );

  const handleChange = useCallback(
    (patch: Partial<ExerciseExecutionCardData>) => {
      applyCardPatchToParams(patch, onUpdateParams);
    },
    [onUpdateParams]
  );

  const dragHandle = isReadonly ? (
    <div className="p-1 shrink-0 cursor-default opacity-50" aria-hidden>
      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
    </div>
  ) : (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="p-1 rounded hover:bg-surface-light cursor-grab active:cursor-grabbing touch-none shrink-0"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'min-w-0 transition-all',
        isDragging && 'shadow-lg opacity-70 z-50',
        isReadonly && 'opacity-90'
      )}
      data-testid={testIdPrefix ? `${testIdPrefix}-exercise-${exercise.id}` : undefined}
    >
      <ExerciseExecutionCard
        mode={isReadonly ? 'view' : 'edit'}
        exercise={cardData}
        onChange={handleChange}
        onRemove={isReadonly ? undefined : onRemove}
        onPreview={onPreview}
        dragHandle={dragHandle}
        index={index + 1}
        testIdPrefix={testIdPrefix ?? 'set-builder'}
        readOnlyReason={isReadonly ? 'W zestawie wcześniej' : undefined}
        className={isReadonly ? 'border-amber-500/20 bg-amber-500/5 ring-1 ring-amber-500/15' : undefined}
      />
    </div>
  );
}

// ============================================================
// MAIN COMPONENT - EXERCISE SET BUILDER
// ============================================================

export function ExerciseSetBuilder({
  name,
  onNameChange,
  namePlaceholder = 'np. Rehabilitacja kolana - tydzień 1',
  selectedInstances,
  onSelectedInstancesChange,
  exerciseParams,
  onExerciseParamsChange,
  availableExercises,
  loadingExercises = false,
  exercisePopularity = {},
  showAI = false,
  onAIClick,
  description,
  onDescriptionChange,
  descriptionPlaceholder = 'Opis zestawu (opcjonalnie)',
  hideNameSection = false,
  onPreviewExercise,
  testIdPrefix = 'set-builder',
  readonlyInstanceIds,
}: Readonly<ExerciseSetBuilderProps>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ExerciseSourceFilter>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [instanceToRemove, setInstanceToRemove] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Tag helpers
  const getExerciseTags = useCallback((ex: BuilderExercise): ExerciseTag[] => {
    return [...(ex.mainTags || []), ...(ex.additionalTags || [])].filter((tag) => tag && tag.name);
  }, []);

  // Popular exercises
  const popularExercises = useMemo(() => {
    return [...availableExercises]
      .filter((ex) => exercisePopularity[ex.id] > 0)
      .sort((a, b) => (exercisePopularity[b.id] || 0) - (exercisePopularity[a.id] || 0))
      .slice(0, 10);
  }, [availableExercises, exercisePopularity]);

  // Source filter: by scope (all / Moje = ORGANIZATION|PERSONAL / FiziYo = GLOBAL)
  const sourceFilteredExercises = useMemo(
    () => filterExercisesBySource(availableExercises, sourceFilter),
    [availableExercises, sourceFilter]
  );

  const { total: totalCount, organization: organizationCount, fiziyo: fiziyoCount } = useMemo(
    () => countBySource(availableExercises),
    [availableExercises]
  );

  // Filtered exercises: source first, then search
  const filteredExercises = useMemo(() => {
    let result = sourceFilteredExercises;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((ex) => {
        const nameMatch = ex.name.toLowerCase().includes(query);
        const descMatch = ex.description?.toLowerCase().includes(query);
        const tagMatch = getExerciseTags(ex).some((tag) => tag.name?.toLowerCase().includes(query));
        return nameMatch || descMatch || tagMatch;
      });
    }

    return result;
  }, [sourceFilteredExercises, searchQuery, getExerciseTags]);

  // Params helpers
  const getDefaultParams = useCallback(
    (exercise: BuilderExercise): ExerciseParams => ({
      sets: exercise.defaultSets ?? exercise.sets ?? 3,
      reps: exercise.defaultReps ?? exercise.reps ?? 10,
      duration: exercise.defaultDuration ?? exercise.duration ?? 30,
      restSets: exercise.defaultRestBetweenSets ?? exercise.restSets ?? 60,
      restReps: exercise.defaultRestBetweenReps ?? exercise.restReps ?? 0,
      preparationTime: 0,
      executionTime: exercise.defaultExecutionTime ?? 0,
      notes: '',
      exerciseSide: exercise.side?.toLowerCase() || exercise.exerciseSide || 'both',
      customName: '',
      customDescription: '',
      tempo: '',
      loadType: '',
      loadValue: 0,
      loadUnit: 'kg',
      loadText: '',
    }),
    []
  );

  const updateExerciseParams = useCallback(
    (instanceId: string, field: keyof ExerciseParams, value: number | string) => {
      const next = new Map(exerciseParams);
      const instance = selectedInstances.find((i) => i.instanceId === instanceId);
      const exercise = availableExercises.find((e) => e.id === instance?.exerciseId);

      const current =
        next.get(instanceId) ||
        (exercise
          ? getDefaultParams(exercise)
          : {
              sets: 3,
              reps: 10,
              duration: 30,
              restSets: 60,
              restReps: 0,
              preparationTime: 0,
              executionTime: 0,
              notes: '',
              exerciseSide: 'both',
              customName: '',
              customDescription: '',
              tempo: '',
              loadType: '',
              loadValue: 0,
              loadUnit: 'kg',
              loadText: '',
            });
      const newValue = typeof value === 'number' ? Math.max(0, value) : value;
      next.set(instanceId, { ...current, [field]: newValue });
      onExerciseParamsChange(next);
    },
    [availableExercises, getDefaultParams, selectedInstances, exerciseParams, onExerciseParamsChange]
  );

  const addExerciseToSet = useCallback(
    (exercise: BuilderExercise) => {
      const instanceId = `${exercise.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      onSelectedInstancesChange([...selectedInstances, { instanceId, exerciseId: exercise.id }]);

      const next = new Map(exerciseParams);
      next.set(instanceId, getDefaultParams(exercise));
      onExerciseParamsChange(next);
    },
    [getDefaultParams, selectedInstances, exerciseParams, onSelectedInstancesChange, onExerciseParamsChange]
  );

  const removeInstance = useCallback(
    (instanceId: string) => {
      onSelectedInstancesChange(selectedInstances.filter((i) => i.instanceId !== instanceId));
      const next = new Map(exerciseParams);
      next.delete(instanceId);
      onExerciseParamsChange(next);
    },
    [selectedInstances, exerciseParams, onSelectedInstancesChange, onExerciseParamsChange]
  );

  const handleConfirmClear = useCallback(() => {
    onSelectedInstancesChange([]);
    onExerciseParamsChange(new Map());
    setShowClearConfirm(false);
  }, [onSelectedInstancesChange, onExerciseParamsChange]);

  const handleConfirmRemoveInstance = useCallback(() => {
    if (!instanceToRemove) return;
    removeInstance(instanceToRemove);
    setInstanceToRemove(null);
  }, [instanceToRemove, removeInstance]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = selectedInstances.findIndex((i) => i.instanceId === active.id);
        const newIndex = selectedInstances.findIndex((i) => i.instanceId === over.id);
        onSelectedInstancesChange(arrayMove(selectedInstances, oldIndex, newIndex));
      }
    },
    [selectedInstances, onSelectedInstancesChange]
  );

  // Resolved instances with exercise data
  const selectedInstancesData = useMemo(() => {
    return selectedInstances
      .map((si) => {
        const exercise = availableExercises.find((ex) => ex.id === si.exerciseId);
        return exercise ? { ...si, exercise } : null;
      })
      .filter((item): item is { instanceId: string; exerciseId: string; exercise: BuilderExercise } => item !== null);
  }, [availableExercises, selectedInstances]);

  // Estimated time calculation
  const estimatedTime = useMemo(() => {
    let totalSeconds = 0;

    for (const { instanceId, exercise } of selectedInstancesData) {
      const params = exerciseParams.get(instanceId) || getDefaultParams(exercise);
      const isTimeType = exercise.type === 'time';

      // Use defaults for undefined values
      const sets = params.sets ?? 3;
      const reps = params.reps ?? 10;
      const duration = params.duration ?? 30;
      const restSets = params.restSets ?? 60;
      const executionTime = params.executionTime ?? 0;

      if (isTimeType) {
        totalSeconds += sets * duration;
        totalSeconds += (sets - 1) * restSets;
      } else {
        const secondsPerRep = executionTime > 0 ? executionTime : 2;
        const repTime = reps * secondsPerRep;
        totalSeconds += sets * repTime;
        totalSeconds += (sets - 1) * restSets;
      }
    }

    return Math.round(totalSeconds / 60);
  }, [selectedInstancesData, exerciseParams, getDefaultParams]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {!hideNameSection && (
        <div className="px-4 py-2 border-b border-border space-y-2 min-h-0">
          <div className="group flex-1 flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 min-h-[36px] hover:bg-surface-light/80 hover:border-border focus-within:bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors cursor-text">
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={namePlaceholder}
              autoComplete="off"
              data-testid={`${testIdPrefix}-name-input`}
              className="flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground placeholder-muted-foreground/50 focus:outline-none border-none p-0 cursor-text"
            />
            <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            {showAI && onAIClick && (
              <button
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAIClick();
                }}
                title="Wygeneruj nazwę AI"
                className="p-1 rounded text-muted-foreground hover:text-secondary hover:bg-secondary/10 shrink-0"
                data-testid={`${testIdPrefix}-ai-btn`}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {onDescriptionChange != null && (
            <Textarea
              value={description ?? ''}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={descriptionPlaceholder}
              className="min-h-[60px] resize-none text-sm bg-transparent border-border/50 focus:border-primary"
              data-testid={`${testIdPrefix}-description-input`}
            />
          )}
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN - Library (40%) */}
        <div className="w-full lg:w-[40%] flex flex-col border-r border-border min-w-0">
          {/* Search header */}
          <div className="h-[72px] px-6 py-4 border-b border-border flex items-center shrink-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj ćwiczeń..."
                className="h-10 pl-10 bg-surface border-border placeholder:text-muted-foreground/50"
                data-testid={`${testIdPrefix}-search-input`}
              />
            </div>
          </div>

          {/* Source filters */}
          <div className="px-6 py-3 border-b border-border bg-surface/30 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5',
                  sourceFilter === 'all'
                    ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20 text-primary'
                    : 'border-border/40 bg-surface/50 text-muted-foreground hover:bg-surface-light hover:text-foreground hover:border-border'
                )}
                data-testid={`${testIdPrefix}-filter-all`}
              >
                <Dumbbell className="h-3.5 w-3.5 shrink-0" />
                <span>Wszystkie</span>
                <span className="font-semibold">{totalCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('organization')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5',
                  sourceFilter === 'organization'
                    ? 'border-secondary/40 bg-secondary/10 ring-1 ring-secondary/20 text-secondary'
                    : 'border-border/40 bg-surface/50 text-muted-foreground hover:bg-surface-light hover:text-foreground hover:border-border'
                )}
                data-testid={`${testIdPrefix}-filter-organization`}
              >
                <Dumbbell className="h-3.5 w-3.5 shrink-0" />
                <span>Moje ćwiczenia</span>
                <span className="font-semibold">{organizationCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('fiziyo')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5',
                  sourceFilter === 'fiziyo'
                    ? 'border-violet-500/40 bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-500'
                    : 'border-border/40 bg-surface/50 text-muted-foreground hover:bg-surface-light hover:text-foreground hover:border-border'
                )}
                data-testid={`${testIdPrefix}-filter-fiziyo`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>FiziYo</span>
                <span className="font-semibold">{fiziyoCount}</span>
              </button>
            </div>
          </div>

          {/* Exercise list */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {loadingExercises ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak ćwiczeń w tej kategorii'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Popular - show at top when no search/filter active */}
                  {!searchQuery && sourceFilter === 'all' && popularExercises.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold">Popularne</h4>
                        <span className="text-xs text-muted-foreground">najczęściej używane</span>
                      </div>
                      <div className="grid gap-2">
                        {popularExercises.map((exercise) => (
                          <ExercisePickerItem
                            key={`popular-${exercise.id}`}
                            exercise={exercise}
                            instanceCount={selectedInstances.filter((si) => si.exerciseId === exercise.id).length}
                            onAdd={() => addExerciseToSet(exercise)}
                            onPreview={() => onPreviewExercise?.(exercise)}
                            getExerciseTags={getExerciseTags}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All exercises */}
                  <div>
                    {!searchQuery && sourceFilter === 'all' && popularExercises.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">Wszystkie ćwiczenia</h4>
                      </div>
                    )}
                    <div className="grid gap-2">
                      {(() => {
                        const showPopular = !searchQuery && sourceFilter === 'all' && popularExercises.length > 0;
                        const popularIds = new Set(popularExercises.map((e) => e.id));
                        const exercisesToShow = showPopular
                          ? filteredExercises.filter((e) => !popularIds.has(e.id))
                          : filteredExercises;

                        return exercisesToShow.map((exercise) => (
                          <ExercisePickerItem
                            key={exercise.id}
                            exercise={exercise}
                            instanceCount={selectedInstances.filter((si) => si.exerciseId === exercise.id).length}
                            onAdd={() => addExerciseToSet(exercise)}
                            onPreview={() => onPreviewExercise?.(exercise)}
                            getExerciseTags={getExerciseTags}
                          />
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT COLUMN - Canvas/Set (60%) */}
        <div className="hidden lg:flex lg:flex-1 flex-col bg-surface/30 overflow-hidden min-w-0">
          {/* Header with Hero Duration */}
          <div className="h-[72px] px-6 py-4 border-b border-border flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="font-semibold text-sm text-foreground">W zestawie</h3>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-surface-light text-muted-foreground border-border shrink-0">
                {selectedInstances.length}
              </Badge>

              {/* Hero Duration Badge */}
              {estimatedTime > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-bold text-primary">~{estimatedTime} min</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-muted-foreground hover:text-destructive"
                onClick={() => setShowClearConfirm(true)}
                disabled={selectedInstances.length === 0}
              >
                Wyczyść
              </Button>
            </div>
          </div>

          {/* Exercise list with inline editing */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-surface/20 min-h-0">
            {selectedInstancesData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center mb-4 border border-border">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Twój zestaw jest pusty</p>
                <p className="text-xs text-muted-foreground/80 mt-2 max-w-[200px]">
                  Wybierz ćwiczenia z biblioteki po lewej, aby dodać je do treningu.
                </p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={selectedInstances.map((i) => i.instanceId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="p-4 space-y-3">
                    {selectedInstancesData.map((data, index) => (
                      <SortableExerciseCard
                        key={data.instanceId}
                        instanceId={data.instanceId}
                        exercise={data.exercise}
                        index={index}
                        params={exerciseParams.get(data.instanceId) || getDefaultParams(data.exercise)}
                        onUpdateParams={(field, value) => updateExerciseParams(data.instanceId, field, value)}
                        onRemove={() => setInstanceToRemove(data.instanceId)}
                        onPreview={() => onPreviewExercise?.(data.exercise)}
                        testIdPrefix={testIdPrefix}
                        isReadonly={readonlyInstanceIds?.has(data.instanceId) ?? false}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Wyczyścić zestaw?"
        description="Ta akcja usunie wszystkie ćwiczenia z listy. Czy chcesz kontynuować?"
        confirmText="Tak, wyczyść"
        cancelText="Anuluj"
        variant="destructive"
        onConfirm={handleConfirmClear}
      />

      <ConfirmDialog
        open={instanceToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setInstanceToRemove(null);
        }}
        title="Usunąć ćwiczenie?"
        description="To ćwiczenie zostanie usunięte z zestawu. Czy chcesz kontynuować?"
        confirmText="Tak, usuń"
        cancelText="Anuluj"
        variant="destructive"
        onConfirm={handleConfirmRemoveInstance}
      />
    </div>
  );
}
