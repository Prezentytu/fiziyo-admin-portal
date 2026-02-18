'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Loader2,
  Dumbbell,
  Plus,
  X,
  GripVertical,
  Eye,
  Sliders,
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { LabeledStepper } from '@/components/shared/LabeledStepper';
import { getMediaUrl } from '@/utils/mediaUrl';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { cn } from '@/lib/utils';
import { translateExerciseTypeShort } from '@/components/pdf/polishUtils';

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

  // Preview exercise callback
  onPreviewExercise?: (exercise: BuilderExercise) => void;

  // Test IDs prefix
  testIdPrefix?: string;
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
  const imageUrl = getMediaUrl(exercise.imageUrl || exercise.images?.[0]);

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 border overflow-hidden',
        instanceCount > 0
          ? 'bg-zinc-900/60 border-zinc-800/80 opacity-80'
          : 'bg-zinc-900/30 hover:bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700'
      )}
    >
      <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 relative group bg-zinc-800">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
        )}
        <button
          type="button"
          onClick={onPreview}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <Eye className="h-3 w-3 text-white" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{exercise.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-zinc-500">{translateExerciseTypeShort(exercise.type)}</span>
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
          className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-primary hover:text-primary-foreground border-zinc-700 transition-all"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// SORTABLE EXERCISE CARD - INLINE PARAMS EDITING
// ============================================================

const EXERCISE_SIDE_OPTIONS = [
  { value: 'both', label: 'Obie strony' },
  { value: 'left', label: 'Lewa' },
  { value: 'right', label: 'Prawa' },
  { value: 'alternating', label: 'Naprzemiennie' },
  { value: 'none', label: 'Nie dotyczy' },
];

const LOAD_TYPE_OPTIONS = [
  { value: '', label: 'Brak' },
  { value: 'weight', label: 'Ciężar' },
  { value: 'band', label: 'Guma' },
  { value: 'bodyweight', label: 'Masa ciała' },
  { value: 'percentage', label: 'Procent' },
  { value: 'rpe', label: 'RPE' },
  { value: 'other', label: 'Inne' },
];

const LOAD_UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'lbs', label: 'lbs' },
  { value: '%', label: '%' },
  { value: 'rpe', label: 'RPE' },
];

function SortableExerciseCard({
  instanceId,
  exercise,
  index,
  params,
  onUpdateParams,
  onRemove,
  onPreview,
  testIdPrefix,
}: {
  instanceId: string;
  exercise: BuilderExercise;
  index: number;
  params: ExerciseParams;
  onUpdateParams: (field: keyof ExerciseParams, value: number | string) => void;
  onRemove: () => void;
  onPreview: () => void;
  testIdPrefix?: string;
}) {
  const [showTuning, setShowTuning] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instanceId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const imageUrl = getMediaUrl(exercise.imageUrl || exercise.images?.[0]);
  const isTimeType = exercise.type === 'time';

  // Check if there are any custom settings
  const hasSideSet = params.exerciseSide !== 'both' && params.exerciseSide !== 'none';
  const hasCustomSettings = params.customName || params.notes || hasSideSet || params.loadType;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg bg-surface-light/50 overflow-hidden transition-all',
        isDragging && 'shadow-xl shadow-primary/20 opacity-90 z-50 ring-2 ring-primary/50'
      )}
      data-testid={testIdPrefix ? `${testIdPrefix}-exercise-${exercise.id}` : undefined}
    >
      {/* Main Row */}
      <div className="p-3 flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-surface-light cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </button>

        {/* Index */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold shrink-0 bg-surface text-muted-foreground">
          {index + 1}
        </div>

        {/* Thumbnail */}
        <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 relative group">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
          )}
          <button
            type="button"
            onClick={onPreview}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Eye className="h-3 w-3 text-white" />
          </button>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm line-clamp-2" title={exercise.name}>
            {params.customName || exercise.name}
          </p>
          {hasCustomSettings && (
            <div className="flex items-center gap-1 mt-0.5">
              {hasSideSet && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">
                  {EXERCISE_SIDE_OPTIONS.find((o) => o.value === params.exerciseSide)?.label}
                </span>
              )}
              {params.loadType && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">
                  {params.loadValue
                    ? `${params.loadValue}${params.loadUnit || ''}`
                    : LOAD_TYPE_OPTIONS.find((o) => o.value === params.loadType)?.label}
                </span>
              )}
              {params.notes && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">Notatka</span>
              )}
            </div>
          )}
        </div>

        {/* Serie × Reps/Time - Stepper Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <LabeledStepper value={params.sets ?? 3} onChange={(v) => onUpdateParams('sets', v)} min={1} label="Serie" />
          <LabeledStepper
            value={isTimeType ? (params.duration ?? 30) : (params.reps ?? 10)}
            onChange={(v) => onUpdateParams(isTimeType ? 'duration' : 'reps', v)}
            min={1}
            label={isTimeType ? 'Czas serii' : 'Powt.'}
            suffix={isTimeType ? 's' : undefined}
          />
          {(params.executionTime ?? 0) > 0 && (
            <LabeledStepper
              value={params.executionTime ?? 0}
              onChange={(v) => onUpdateParams('executionTime', v)}
              min={0}
              label="Czas powt."
              suffix="s"
            />
          )}
        </div>

        {/* Tune Button */}
        <button
          type="button"
          onClick={() => setShowTuning(!showTuning)}
          className={cn(
            'p-1.5 rounded-lg transition-colors shrink-0',
            showTuning
              ? 'bg-primary/20 text-primary'
              : hasCustomSettings
                ? 'bg-surface text-muted-foreground'
                : 'hover:bg-surface-light text-muted-foreground/50'
          )}
          title="Dostrojenie"
        >
          <Sliders className="h-4 w-4" />
        </button>

        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tuning Panel - Expandable */}
      <Collapsible open={showTuning} onOpenChange={setShowTuning}>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-3 bg-surface/50 border-t border-border/30 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Side Selector */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Strona ciała
                </label>
                <select
                  value={params.exerciseSide ?? 'both'}
                  onChange={(e) => onUpdateParams('exerciseSide', e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm focus:border-primary/50 outline-none transition-colors"
                >
                  {EXERCISE_SIDE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Name */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Własna nazwa
                </label>
                <Input
                  value={params.customName ?? ''}
                  onChange={(e) => onUpdateParams('customName', e.target.value)}
                  placeholder={exercise.name}
                  className="h-9 text-sm bg-zinc-800/50 border-zinc-700 focus:border-primary/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Rest between sets */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Przerwa między seriami (s)
                </label>
                <Input
                  type="number"
                  value={params.restSets ?? ''}
                  onChange={(e) => onUpdateParams('restSets', Number.parseInt(e.target.value) || 0)}
                  className="h-9 text-sm bg-zinc-800/50 border-zinc-700"
                />
              </div>

              {/* Rest between reps */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Przerwa między powtórzeniami (s)
                </label>
                <Input
                  type="number"
                  value={params.restReps ?? ''}
                  onChange={(e) => onUpdateParams('restReps', Number.parseInt(e.target.value) || 0)}
                  className="h-9 text-sm bg-zinc-800/50 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Execution time */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Czas wykonania powtórzenia (s)
                </label>
                <Input
                  type="number"
                  value={params.executionTime ?? ''}
                  onChange={(e) => onUpdateParams('executionTime', Number.parseInt(e.target.value) || 0)}
                  className="h-9 text-sm bg-zinc-800/50 border-zinc-700"
                />
              </div>

              {/* Tempo */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Tempo
                </label>
                <Input
                  value={params.tempo ?? ''}
                  onChange={(e) => onUpdateParams('tempo', e.target.value)}
                  placeholder="np. 2-1-2-0 (ekscentryka-pauza-koncentryka-pauza)"
                  className="h-9 text-sm bg-zinc-800/50 border-zinc-700 focus:border-primary/50"
                />
              </div>
            </div>

            {/* Load settings */}
            <div className="grid grid-cols-3 gap-4">
              {/* Load Type */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Typ obciążenia
                </label>
                <select
                  value={params.loadType ?? ''}
                  onChange={(e) => onUpdateParams('loadType', e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm focus:border-primary/50 outline-none transition-colors"
                >
                  {LOAD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Load Value */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Wartość
                </label>
                <Input
                  type="number"
                  value={params.loadValue ?? ''}
                  onChange={(e) => onUpdateParams('loadValue', Number.parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-9 text-sm bg-zinc-800/50 border-zinc-700"
                />
              </div>

              {/* Load Unit */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Jednostka
                </label>
                <select
                  value={params.loadUnit ?? 'kg'}
                  onChange={(e) => onUpdateParams('loadUnit', e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm focus:border-primary/50 outline-none transition-colors"
                >
                  {LOAD_UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Load Text */}
            {params.loadType === 'other' && (
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Opis obciążenia
                </label>
                <Input
                  value={params.loadText ?? ''}
                  onChange={(e) => onUpdateParams('loadText', e.target.value)}
                  placeholder="np. lekka guma, średni opór..."
                  className="h-9 text-sm bg-zinc-800/50 border-zinc-700 focus:border-primary/50"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                Notatka dla pacjenta
              </label>
              <Textarea
                value={params.notes ?? ''}
                onChange={(e) => onUpdateParams('notes', e.target.value)}
                placeholder="Wskazówki techniczne, uwagi do wykonania..."
                className="min-h-[70px] text-sm resize-none bg-zinc-800/50 border-zinc-700 focus:border-primary/50"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
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
  nameLabel = 'Nazwa zestawu',
  selectedInstances,
  onSelectedInstancesChange,
  exerciseParams,
  onExerciseParamsChange,
  availableExercises,
  loadingExercises = false,
  tags = [],
  exercisePopularity = {},
  showAI = false,
  onAIClick,
  aiButtonLabel = 'Dobierz za mnie',
  onPreviewExercise,
  testIdPrefix = 'set-builder',
}: ExerciseSetBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  // Category filters from tags
  const quickStartCategories = useMemo(() => {
    const tagExerciseCounts: Record<string, number> = {};

    for (const exercise of availableExercises) {
      const exerciseTags = getExerciseTags(exercise);
      for (const tag of exerciseTags) {
        if (tag.id) {
          tagExerciseCounts[tag.id] = (tagExerciseCounts[tag.id] || 0) + 1;
        }
      }
    }

    const mainTags = tags.filter((tag) => (tag as ExerciseTag & { isMain?: boolean }).isMain);
    const tagsToShow =
      mainTags.length > 0
        ? mainTags
        : tags.sort((a, b) => (tagExerciseCounts[b.id] || 0) - (tagExerciseCounts[a.id] || 0)).slice(0, 8);

    return tagsToShow
      .map((tag) => ({
        id: tag.id,
        label: tag.name,
        color: tag.color || '#22c55e',
        exerciseCount: tagExerciseCounts[tag.id] || 0,
      }))
      .filter((cat) => cat.exerciseCount > 0)
      .sort((a, b) => b.exerciseCount - a.exerciseCount)
      .slice(0, 8);
  }, [availableExercises, tags, getExerciseTags]);

  const categoryFilters = useMemo(() => {
    return [
      { id: 'all', label: 'Wszystkie' },
      ...quickStartCategories.map((cat) => ({ id: cat.id, label: cat.label })),
    ];
  }, [quickStartCategories]);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    let result = availableExercises;

    if (categoryFilter !== 'all') {
      result = result.filter((ex) => {
        const allTags = getExerciseTags(ex);
        return allTags.some((tag) => tag.id === categoryFilter);
      });
    }

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
  }, [availableExercises, searchQuery, categoryFilter, getExerciseTags]);

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
      {/* Name Section */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            {nameLabel}
          </label>
          {showAI && onAIClick && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAIClick}
              className="h-7 px-2.5 text-[10px] gap-1.5 text-secondary hover:text-secondary hover:bg-secondary/10"
              data-testid={`${testIdPrefix}-ai-btn`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiButtonLabel}
            </Button>
          )}
        </div>
        <div className="group relative flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-lg hover:bg-surface-light/50 transition-colors cursor-text">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={namePlaceholder}
            autoComplete="off"
            data-testid={`${testIdPrefix}-name-input`}
            className="flex-1 bg-transparent text-lg font-semibold text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-0 border-none p-0 cursor-text"
          />
          <Pencil className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity shrink-0" />
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN - Library (40%) */}
        <div className="w-full lg:w-[40%] flex flex-col border-r border-border min-w-0">
          {/* Search and filters */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
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

            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5">
              {categoryFilters.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    categoryFilter === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-light text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  )}
                  data-testid={`${testIdPrefix}-category-${cat.id}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">{filteredExercises.length} ćwiczeń</p>
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
                  {!searchQuery && categoryFilter === 'all' && popularExercises.length > 0 && (
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
                    {!searchQuery && categoryFilter === 'all' && popularExercises.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">Wszystkie ćwiczenia</h4>
                      </div>
                    )}
                    <div className="grid gap-2">
                      {(() => {
                        const showPopular = !searchQuery && categoryFilter === 'all' && popularExercises.length > 0;
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
        <div className="hidden lg:flex lg:flex-1 flex-col bg-zinc-900/30 overflow-hidden min-w-0">
          {/* Header with Hero Duration */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-sm">W zestawie</h3>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-zinc-800 text-zinc-400 border-none">
                {selectedInstances.length}
              </Badge>

              {/* Hero Duration Badge */}
              {estimatedTime > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-900/50">
                  <Timer className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">~{estimatedTime} min</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-zinc-500 hover:text-destructive"
                onClick={() => {
                  onSelectedInstancesChange([]);
                  onExerciseParamsChange(new Map());
                }}
                disabled={selectedInstances.length === 0}
              >
                Wyczyść
              </Button>
            </div>
          </div>

          {/* Exercise list with inline editing */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-950/20">
            {selectedInstancesData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                  <Plus className="h-6 w-6 text-zinc-700" />
                </div>
                <p className="text-sm font-medium text-zinc-500">Twój zestaw jest pusty</p>
                <p className="text-xs text-zinc-600 mt-2 max-w-[200px]">
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
                        onRemove={() => removeInstance(data.instanceId)}
                        onPreview={() => onPreviewExercise?.(data.exercise)}
                        testIdPrefix={testIdPrefix}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
