'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Search,
  Loader2,
  Dumbbell,
  Check,
  FolderPlus,
  Plus,
  X,
  GripVertical,
  ChevronDown,
  Eye,
  Sliders,
  TrendingUp,
  Sparkles,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { cn } from '@/lib/utils';
import { AISetGenerator } from './AISetGenerator';

import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
  ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import { GET_PATIENT_CLINICAL_NOTES_QUERY } from '@/graphql/queries/clinicalNotes.queries';
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import { translateExerciseTypeShort } from '@/components/pdf/polishUtils';
import type { ExerciseTagsResponse, TagCategoriesResponse, OrganizationExerciseSetsResponse } from '@/types/apollo';

// ============================================================
// TYPES
// ============================================================

interface ExerciseInstance {
  instanceId: string;
  exerciseId: string;
}

interface ExerciseTag {
  id: string;
  name: string;
  color?: string;
}

interface Exercise {
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

interface ExerciseParams {
  sets: number;
  reps: number;
  duration: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
  executionTime: number;
  notes: string;
  exerciseSide: string;
  customName: string;
  customDescription: string;
  tempo: string;
  loadType: string;
  loadValue: number;
  loadUnit: string;
  loadText: string;
}

interface CreateSetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: (setId: string) => void;
  patientId?: string;
  patientName?: string;
  autoAssign?: boolean;
}

interface PatientContext {
  patientId: string;
  patientName?: string;
  diagnosis?: string[];
  painLocation?: string;
}

// ============================================================
// INLINE NUMBER INPUT - Clean, compact style
// ============================================================

interface InlineNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
}

function InlineNumberInput({ value, onChange, min = 0, className }: InlineNumberInputProps) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      value={value}
      onChange={(e) => {
        const val = Number.parseInt(e.target.value) || min;
        onChange(Math.max(min, val));
      }}
      className={cn(
        'w-10 h-7 text-center text-sm font-semibold',
        'bg-zinc-800/50 border border-zinc-700',
        'hover:border-zinc-600 focus:border-primary/50 focus:bg-zinc-800',
        'rounded-lg outline-none transition-all',
        '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        className
      )}
    />
  );
}

// ============================================================
// BULK ACTION BAR
// ============================================================

function BulkActionBar({
  onApply
}: {
  onApply: (field: keyof ExerciseParams, value: number) => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mr-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ustaw wszystkim:</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-medium">Serie</span>
          <InlineNumberInput
            value={0}
            onChange={(v) => onApply('sets', v)}
            className="h-8 w-11 bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-medium">Powt/Czas</span>
          <InlineNumberInput
            value={0}
            onChange={(v) => {
              onApply('reps', v);
              onApply('duration', v);
            }}
            className="h-8 w-11 bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">Prz. serii</span>
          <InlineNumberInput
            value={0}
            onChange={(v) => onApply('restSets', v)}
            className="h-8 w-11 bg-zinc-800 border-zinc-700"
          />
          <span className="text-[10px] text-zinc-600">s</span>
        </div>
      </div>
    </div>
  );
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
  badge,
}: {
  exercise: Exercise;
  instanceCount: number;
  onAdd: () => void;
  onPreview: () => void;
  getExerciseTags: (ex: Exercise) => ExerciseTag[];
  badge?: string;
}) {
  const imageUrl = getMediaUrl(exercise.imageUrl || exercise.images?.[0]);

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 border',
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
}: {
  instanceId: string;
  exercise: Exercise;
  index: number;
  params: ExerciseParams;
  onUpdateParams: (field: keyof ExerciseParams, value: number | string) => void;
  onRemove: () => void;
  onPreview: () => void;
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

  // Check if there are any custom settings (side is custom only if not default values)
  const hasSideSet = params.exerciseSide !== 'both' && params.exerciseSide !== 'none';
  const hasCustomSettings = params.customName || params.notes || hasSideSet || params.loadType;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-all',
        isDragging && 'shadow-xl shadow-primary/20 opacity-90 z-50 border-primary/50'
      )}
    >
      {/* Main Row - Clean Line */}
      <div className="p-3 flex items-center gap-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-zinc-800 cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical className="h-4 w-4 text-zinc-600" />
        </button>

        {/* Index */}
        <span className="text-sm font-bold text-zinc-500 w-5 shrink-0">{index + 1}.</span>

        {/* Thumbnail */}
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

        {/* Name */}
        <div className="flex-1 min-w-0 mr-2">
          <p className="font-medium text-sm truncate" title={exercise.name}>
            {params.customName || exercise.name}
          </p>
          {hasCustomSettings && (
            <div className="flex items-center gap-1 mt-0.5">
              {hasSideSet && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
                  {EXERCISE_SIDE_OPTIONS.find(o => o.value === params.exerciseSide)?.label}
                </span>
              )}
              {params.loadType && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
                  {params.loadValue ? `${params.loadValue}${params.loadUnit || ''}` : LOAD_TYPE_OPTIONS.find(o => o.value === params.loadType)?.label}
                </span>
              )}
              {params.notes && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
                  Notatka
                </span>
              )}
            </div>
          )}
        </div>

        {/* Serie × Reps/Time */}
        <div className="flex items-center gap-1 shrink-0">
          <InlineNumberInput
            value={params.sets}
            onChange={(v) => onUpdateParams('sets', v)}
            min={1}
          />
          <span className="text-zinc-600 text-sm font-medium px-0.5">×</span>
          <InlineNumberInput
            value={isTimeType ? params.duration : params.reps}
            onChange={(v) => onUpdateParams(isTimeType ? 'duration' : 'reps', v)}
            min={1}
            className={isTimeType ? 'w-12' : 'w-10'}
          />
          {isTimeType && <span className="text-[10px] text-zinc-600">s</span>}
        </div>

        {/* Tune Button */}
        <button
          type="button"
          onClick={() => setShowTuning(!showTuning)}
          className={cn(
            'p-1.5 rounded-lg transition-colors shrink-0 ml-1',
            showTuning
              ? 'bg-primary/20 text-primary'
              : hasCustomSettings
                ? 'bg-zinc-800 text-zinc-400'
                : 'hover:bg-zinc-800 text-zinc-600'
          )}
          title="Dostrojenie"
        >
          <Sliders className="h-4 w-4" />
        </button>

        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-destructive/20 text-zinc-600 hover:text-destructive transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tuning Panel - Expandable */}
      <Collapsible open={showTuning} onOpenChange={setShowTuning}>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 bg-zinc-950/50 border-t border-zinc-800/50 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Side Selector - Dropdown */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Strona ciała
                </label>
                <select
                  value={params.exerciseSide}
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
                  value={params.customName}
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
                  value={params.restSets}
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
                  value={params.restReps}
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
                  value={params.executionTime}
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
                  value={params.tempo}
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
                  value={params.loadType}
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
                  value={params.loadValue || ''}
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
                  value={params.loadUnit}
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

            {/* Load Text (for custom descriptions) */}
            {params.loadType === 'other' && (
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                  Opis obciążenia
                </label>
                <Input
                  value={params.loadText}
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
                value={params.notes}
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
// MAIN COMPONENT - SINGLE PAGE COMPOSER
// ============================================================

export function CreateSetWizard({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
  patientId,
  patientName,
  autoAssign = false,
}: CreateSetWizardProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedInstances, setSelectedInstances] = useState<ExerciseInstance[]>([]);
  const [exerciseParams, setExerciseParams] = useState<Map<string, ExerciseParams>>(new Map());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hasChanges = name.trim().length > 0 || description.trim().length > 0 || selectedInstances.length > 0;

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName(patientName ? `Zestaw dla ${patientName}` : '');
      setDescription('');
      setShowDescription(false);
      setSearchQuery('');
      setCategoryFilter('all');
      setSelectedInstances([]);
      setExerciseParams(new Map());
      setShowCloseConfirm(false);
      setPreviewExercise(null);
      setShowAIPanel(false);
    }
  }, [open, patientName]);

  // GraphQL queries
  const { data: exercisesData, loading: loadingExercises } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const { data: exerciseSetsData } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const { data: clinicalNotesData } = useQuery(GET_PATIENT_CLINICAL_NOTES_QUERY, {
    variables: { patientId: patientId || '', organizationId },
    skip: !patientId || !organizationId || !open,
  });

  // Build patient context
  const patientContext: PatientContext | undefined = useMemo(() => {
    if (!patientId) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = (clinicalNotesData as any)?.patientClinicalNotes || [];
    const latestNote = notes[0];

    let diagnosis: string[] = [];
    let painLocation: string | undefined;

    if (latestNote?.sections?.diagnosis?.icd10Codes) {
      diagnosis = latestNote.sections.diagnosis.icd10Codes.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (code: any) => `${code.code}: ${code.description}`
      );
    }

    if (latestNote?.sections?.interview?.painLocation) {
      painLocation = latestNote.sections.interview.painLocation;
    }

    return {
      patientId,
      patientName,
      diagnosis: diagnosis.length > 0 ? diagnosis : undefined,
      painLocation,
    };
  }, [patientId, patientName, clinicalNotesData]);

  // Mutations
  const [createSet, { loading: creatingSet }] = useMutation(CREATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
  });

  const [addExercise, { loading: addingExercises }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const [assignSetToPatient, { loading: assigning }] = useMutation(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION);

  // Process data
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];
  const tagsMap = useMemo(() => createTagsMap(tags, categories), [tags, categories]);
  const exerciseSets = (exerciseSetsData as OrganizationExerciseSetsResponse)?.exerciseSets || [];

  const exercises: Exercise[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawExercises = (exercisesData as { organizationExercises?: any[] })?.organizationExercises || [];
    return mapExercisesWithTags(rawExercises, tagsMap);
  }, [exercisesData, tagsMap]);

  const getExerciseTags = useCallback((ex: Exercise) => {
    return [...(ex.mainTags || []), ...(ex.additionalTags || [])].filter((tag) => tag && tag.name);
  }, []);

  // Exercise popularity
  const exercisePopularity = useMemo(() => {
    const popularity: Record<string, number> = {};
    for (const set of exerciseSets) {
      for (const mapping of set.exerciseMappings || []) {
        if (mapping.exerciseId) {
          popularity[mapping.exerciseId] = (popularity[mapping.exerciseId] || 0) + 1;
        }
      }
    }
    return popularity;
  }, [exerciseSets]);

  const popularExercises = useMemo(() => {
    return [...exercises]
      .filter((ex) => exercisePopularity[ex.id] > 0)
      .sort((a, b) => (exercisePopularity[b.id] || 0) - (exercisePopularity[a.id] || 0))
      .slice(0, 10);
  }, [exercises, exercisePopularity]);

  // Category filters
  const quickStartCategories = useMemo(() => {
    const tagExerciseCounts: Record<string, number> = {};

    for (const exercise of exercises) {
      const exerciseTags = getExerciseTags(exercise);
      for (const tag of exerciseTags) {
        if (tag.id) {
          tagExerciseCounts[tag.id] = (tagExerciseCounts[tag.id] || 0) + 1;
        }
      }
    }

    const mainTags = tags.filter((tag) => tag.isMain);
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
  }, [exercises, tags, getExerciseTags]);

  const categoryFilters = useMemo(() => {
    return [
      { id: 'all', label: 'Wszystkie' },
      ...quickStartCategories.map((cat) => ({ id: cat.id, label: cat.label })),
    ];
  }, [quickStartCategories]);

  const filteredExercises = useMemo(() => {
    let result = exercises;

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
  }, [exercises, searchQuery, categoryFilter, getExerciseTags]);

  // Params helpers
  const getDefaultParams = useCallback(
    (exercise: Exercise): ExerciseParams => ({
      sets: exercise.defaultSets ?? exercise.sets ?? 3,
      reps: exercise.defaultReps ?? exercise.reps ?? 10,
      duration: exercise.defaultDuration ?? exercise.duration ?? 30,
      restSets: exercise.defaultRestBetweenSets ?? exercise.restSets ?? 60,
      restReps: exercise.defaultRestBetweenReps ?? exercise.restReps ?? 0,
      preparationTime: 0,
      executionTime: exercise.defaultExecutionTime ?? 0,
      notes: '',
      exerciseSide: (exercise.side?.toLowerCase() || exercise.exerciseSide) || 'both',
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

  const getExerciseParams = useCallback(
    (exercise: Exercise): ExerciseParams => {
      const saved = exerciseParams.get(exercise.id);
      if (saved) return saved;
      return getDefaultParams(exercise);
    },
    [exerciseParams, getDefaultParams]
  );

  const updateExerciseParams = useCallback(
    (instanceId: string, field: keyof ExerciseParams, value: number | string) => {
      setExerciseParams((prev) => {
        const next = new Map(prev);
        const instance = selectedInstances.find(i => i.instanceId === instanceId);
        const exercise = exercises.find((e) => e.id === instance?.exerciseId);

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
        return next;
      });
    },
    [exercises, getDefaultParams, selectedInstances]
  );

  const applyParamsToAll = useCallback(
    (field: keyof ExerciseParams, value: number) => {
      setExerciseParams((prev) => {
        const next = new Map(prev);
        for (const { instanceId, exerciseId } of selectedInstances) {
          const exercise = exercises.find((e) => e.id === exerciseId);
          if (exercise) {
            const current = next.get(instanceId) || getExerciseParams(exercise);
            next.set(instanceId, { ...current, [field]: value });
          }
        }
        return next;
      });
      toast.success(`Zastosowano do ${selectedInstances.length} ćwiczeń`);
    },
    [selectedInstances, exercises, getExerciseParams]
  );

  const addExerciseToSet = useCallback(
    (exercise: Exercise) => {
      const instanceId = `${exercise.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      setSelectedInstances((prev) => [...prev, { instanceId, exerciseId: exercise.id }]);

      setExerciseParams((prev) => {
        const next = new Map(prev);
        next.set(instanceId, getDefaultParams(exercise));
        return next;
      });

      toast.success(`Dodano: ${exercise.name}`, { duration: 1500 });
    },
    [getDefaultParams]
  );

  const removeInstance = useCallback(
    (instanceId: string) => {
      setSelectedInstances((prev) => prev.filter((i) => i.instanceId !== instanceId));
      setExerciseParams((prev) => {
        const next = new Map(prev);
        next.delete(instanceId);
        return next;
      });
    },
    []
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedInstances((items) => {
        const oldIndex = items.findIndex(i => i.instanceId === active.id);
        const newIndex = items.findIndex(i => i.instanceId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // AI integration
  const handleAISelectExercises = useCallback(
    (exerciseIds: string[]) => {
      for (const id of exerciseIds) {
        const exercise = exercises.find(e => e.id === id);
        if (exercise) {
          addExerciseToSet(exercise);
        }
      }
      setShowAIPanel(false);
    },
    [exercises, addExerciseToSet]
  );

  // Create set
  const canCreate = name.trim().length >= 2;
  const isLoading = creatingSet || addingExercises || assigning;

  const selectedInstancesData = useMemo(() => {
    return selectedInstances
      .map((si) => {
        const exercise = exercises.find((ex) => ex.id === si.exerciseId);
        return exercise ? { ...si, exercise } : null;
      })
      .filter((item): item is { instanceId: string, exerciseId: string, exercise: Exercise } => item !== null);
  }, [exercises, selectedInstances]);

  const estimatedTime = useMemo(() => {
    let totalSeconds = 0;

    for (const { instanceId, exercise } of selectedInstancesData) {
      const params = exerciseParams.get(instanceId) || getDefaultParams(exercise);
      const isTimeType = exercise.type === 'time';

      if (isTimeType) {
        totalSeconds += params.sets * params.duration;
        totalSeconds += (params.sets - 1) * params.restSets;
      } else {
        // Use executionTime if provided, otherwise default to 2 seconds per rep
        const secondsPerRep = params.executionTime > 0 ? params.executionTime : 2;
        const repTime = params.reps * secondsPerRep;
        totalSeconds += params.sets * repTime;
        totalSeconds += (params.sets - 1) * params.restSets;
      }
    }

    return Math.round(totalSeconds / 60);
  }, [selectedInstancesData, exerciseParams, getDefaultParams]);

  const handleCreateSet = async () => {
    if (!canCreate) return;

    try {
      const result = await createSet({
        variables: {
          organizationId,
          name: name.trim(),
          description: description.trim() || null,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSetId = (result.data as any)?.createExerciseSet?.id;
      if (!newSetId) throw new Error('Nie udało się utworzyć zestawu');

      if (selectedInstances.length > 0) {
        let order = 0;
        for (const { instanceId, exerciseId } of selectedInstances) {
          const exercise = exercises.find((e) => e.id === exerciseId);
          if (!exercise) continue;
          const params = exerciseParams.get(instanceId) || getDefaultParams(exercise);
          await addExercise({
            variables: {
              exerciseId,
              exerciseSetId: newSetId,
              order: order++,
              sets: params.sets || null,
              reps: params.reps || null,
              duration: params.duration || null,
              restSets: params.restSets || null,
              restReps: params.restReps || null,
              preparationTime: params.preparationTime || null,
              executionTime: params.executionTime || null,
              notes: params.notes || null,
              customName: params.customName || null,
              customDescription: params.customDescription || null,
              tempo: params.tempo || null,
              loadType: params.loadType || null,
              loadValue: params.loadValue || null,
              loadUnit: params.loadUnit || null,
              loadText: params.loadText || null,
            },
          });
        }
      }

      if (autoAssign && patientId) {
        await assignSetToPatient({
          variables: {
            exerciseSetId: newSetId,
            patientId,
          },
        });
        toast.success(`Zestaw "${name}" utworzony i przypisany do pacjenta`);
      } else {
        toast.success(`Zestaw "${name}" utworzony`);
      }
      onOpenChange(false);
      onSuccess?.(newSetId);
      router.push(`/exercise-sets/${newSetId}`);
    } catch (error) {
      console.error('Błąd tworzenia zestawu:', error);
      toast.error('Nie udało się utworzyć zestawu');
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-7xl w-[98vw] max-h-[95vh] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface border-border"
        data-testid="set-composer"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Nowy zestaw ćwiczeń
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* ============================================================ */}
        {/* NAME + DESCRIPTION SECTION */}
        {/* ============================================================ */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Nazwa zestawu
            </label>
            {/* AI Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={cn(
                'h-7 px-2.5 text-[10px] gap-1.5',
                'text-secondary hover:text-secondary hover:bg-secondary/10',
                showAIPanel && 'bg-secondary/10'
              )}
              data-testid="set-composer-ai-btn"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Dobierz za mnie
            </Button>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Rehabilitacja kolana - tydzień 1"
            autoFocus
            autoComplete="off"
            data-testid="set-composer-name-input"
            className="h-12 text-lg font-semibold bg-surface border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
          />

          {/* Collapsible description */}
          <Collapsible open={showDescription} onOpenChange={setShowDescription}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', showDescription && 'rotate-180')} />
                {description ? 'Edytuj opis' : 'Dodaj opis'}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opisz cel zestawu..."
                className="mt-2 min-h-[60px] text-sm resize-none bg-surface border-border placeholder:text-muted-foreground/50"
                data-testid="set-composer-description-input"
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Patient context */}
          {patientContext && (
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Dla:</span>
              <span className="font-medium text-foreground">{patientContext.patientName}</span>
              {autoAssign && (
                <Badge variant="secondary" className="text-[10px] bg-surface-light border-border text-muted-foreground">
                  Auto-przypisanie
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* MAIN CONTENT - Split view */}
        {/* ============================================================ */}
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
                    data-testid="set-composer-search-input"
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
                              instanceCount={selectedInstances.filter(si => si.exerciseId === exercise.id).length}
                              onAdd={() => addExerciseToSet(exercise)}
                              onPreview={() => setPreviewExercise(exercise)}
                              getExerciseTags={getExerciseTags}
                              badge={`${exercisePopularity[exercise.id]}x`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All exercises (excluding popular when shown) */}
                    <div>
                      {!searchQuery && categoryFilter === 'all' && popularExercises.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-semibold">Wszystkie ćwiczenia</h4>
                        </div>
                      )}
                      <div className="grid gap-2">
                        {(() => {
                          // Exclude popular exercises when showing popular section
                          const showPopular = !searchQuery && categoryFilter === 'all' && popularExercises.length > 0;
                          const popularIds = new Set(popularExercises.map(e => e.id));
                          const exercisesToShow = showPopular
                            ? filteredExercises.filter(e => !popularIds.has(e.id))
                            : filteredExercises;

                          return exercisesToShow.map((exercise) => (
                            <ExercisePickerItem
                              key={exercise.id}
                              exercise={exercise}
                              instanceCount={selectedInstances.filter(si => si.exerciseId === exercise.id).length}
                              onAdd={() => addExerciseToSet(exercise)}
                              onPreview={() => setPreviewExercise(exercise)}
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
                  onClick={() => setSelectedInstances([])}
                  disabled={selectedInstances.length === 0}
                >
                  Wyczyść
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedInstances.length > 0 && (
              <BulkActionBar onApply={applyParamsToAll} />
            )}

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
                  <SortableContext items={selectedInstances.map(i => i.instanceId)} strategy={verticalListSortingStrategy}>
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
                          onPreview={() => setPreviewExercise(data.exercise)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* AI PANEL - Slides in from right */}
          <div className={cn(
            "absolute inset-y-0 right-0 w-full sm:w-[400px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out",
            showAIPanel ? "translate-x-0" : "translate-x-full"
          )}>
            <AISetGenerator
              exercises={exercises}
              onSelectExercises={handleAISelectExercises}
              onCancel={() => setShowAIPanel(false)}
              setName={name}
              onSetNameChange={setName}
              patientContext={
                patientContext
                  ? {
                      patientName: patientContext.patientName,
                      diagnosis: patientContext.diagnosis,
                      painLocation: patientContext.painLocation,
                    }
                  : undefined
              }
              className="h-full"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* FOOTER */}
        {/* ============================================================ */}
        <div className="px-6 py-4 border-t border-border bg-surface shrink-0 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCloseAttempt}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            Anuluj
          </Button>

          <Button
            type="button"
            onClick={handleCreateSet}
            disabled={!canCreate || isLoading}
            className={cn(
              "px-8 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            data-testid="set-composer-create-btn"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Utwórz zestaw
          </Button>
        </div>
      </DialogContent>

      {/* Confirm close dialog */}
      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />

      {/* Exercise preview dialog */}
      <Dialog open={!!previewExercise} onOpenChange={() => setPreviewExercise(null)}>
        <DialogContent className="max-w-lg bg-surface border-border">
          <DialogHeader>
            <DialogTitle>{previewExercise?.name}</DialogTitle>
            <DialogDescription>{translateExerciseTypeShort(previewExercise?.type)}</DialogDescription>
          </DialogHeader>
          {previewExercise && (
            <div className="space-y-4">
              {getMediaUrl(previewExercise.imageUrl || previewExercise.images?.[0]) && (
                <div className="rounded-xl overflow-hidden aspect-video bg-zinc-800">
                  <img
                    src={getMediaUrl(previewExercise.imageUrl || previewExercise.images?.[0]) || ''}
                    alt={previewExercise.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              {previewExercise.description && (
                <p className="text-sm text-zinc-400">{previewExercise.description}</p>
              )}
              <div className="grid grid-cols-3 gap-3">
                {previewExercise.sets && (
                  <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
                    <p className="text-lg font-bold">{previewExercise.sets}</p>
                    <p className="text-xs text-zinc-500">Serie</p>
                  </div>
                )}
                {previewExercise.reps && (
                  <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
                    <p className="text-lg font-bold">{previewExercise.reps}</p>
                    <p className="text-xs text-zinc-500">Powtórzenia</p>
                  </div>
                )}
                {previewExercise.duration && (
                  <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
                    <p className="text-lg font-bold">{previewExercise.duration}s</p>
                    <p className="text-xs text-zinc-500">Czas serii</p>
                  </div>
                )}
              </div>
              {getExerciseTags(previewExercise).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {getExerciseTags(previewExercise).map((tag) => (
                    <ColorBadge key={tag.id} color={tag.color}>
                      {tag.name}
                    </ColorBadge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
