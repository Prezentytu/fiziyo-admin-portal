'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Search,
  Loader2,
  Dumbbell,
  Check,
  ArrowRight,
  ArrowLeft,
  FolderPlus,
  Plus,
  Minus,
  Clock,
  X,
  GripVertical,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  Zap,
  Sliders,
  Tag,
  TrendingUp,
  History,
  Sparkles,
  Filter,
  Copy,
  Users,
  AlignLeft,
  Timer,
  MessageSquare,
  ArrowLeftRight,
  Pencil,
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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
import type { ExerciseTagsResponse, TagCategoriesResponse, OrganizationExerciseSetsResponse } from '@/types/apollo';

interface ExerciseTag {
  id: string;
  name: string;
  color?: string;
}

interface Exercise {
  id: string;
  name: string;
  type?: string;
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
}

interface CreateSetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: (setId: string) => void;
  // Patient context - when creating a set for a specific patient
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

type WizardStep = 'basics' | 'exercises' | 'ai';
type CreationMode = 'manual' | 'ai';

// Dynamic quick start category derived from tags
interface QuickStartCategory {
  id: string;
  label: string;
  color: string;
  exerciseCount: number;
}

const translateType = (type?: string) => {
  const types: Record<string, string> = {
    time: 'czasowe',
    reps: 'powtórzenia',
  };
  return type ? types[type] || type : '';
};

// Estimate workout time in minutes
function estimateWorkoutTime(
  exercises: Exercise[],
  paramsMap: Map<string, ExerciseParams>,
  getDefaultParams: (ex: Exercise) => ExerciseParams
): number {
  let totalSeconds = 0;

  for (const exercise of exercises) {
    const params = paramsMap.get(exercise.id) || getDefaultParams(exercise);
    const isTimeType = exercise.type === 'time';

    if (isTimeType) {
      totalSeconds += params.sets * params.duration;
      totalSeconds += (params.sets - 1) * params.restSets;
    } else {
      const repTime = params.reps * 3;
      totalSeconds += params.sets * repTime;
      totalSeconds += (params.sets - 1) * params.restSets;
    }
    totalSeconds += 15;
  }

  return Math.round(totalSeconds / 60);
}

// Exercise picker item component (reusable for smart/all views)
function ExercisePickerItem({
  exercise,
  isSelected,
  onToggle,
  onPreview,
  getExerciseTags,
  badge,
}: {
  exercise: Exercise;
  isSelected: boolean;
  onToggle: () => void;
  onPreview: () => void;
  getExerciseTags: (ex: Exercise) => ExerciseTag[];
  badge?: string;
}) {
  const imageUrl = getMediaUrl(exercise.imageUrl || exercise.images?.[0]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 cursor-pointer',
        isSelected ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-surface hover:bg-surface-light'
      )}
    >
      <div
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </div>

      <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 relative group">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <Eye className="h-3 w-3 text-white" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{exercise.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{translateType(exercise.type)}</span>
          {getExerciseTags(exercise)
            .slice(0, 2)
            .map((tag) => (
              <ColorBadge key={tag.id} color={tag.color} size="sm">
                {tag.name}
              </ColorBadge>
            ))}
        </div>
      </div>

      {badge && (
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {badge}
        </Badge>
      )}
    </div>
  );
}

// Param control component for expanded view
function ParamControl({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  icon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1.5 font-medium flex items-center gap-1">
        {icon}
        {label}
      </label>
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-r-none shrink-0"
          onClick={() => onChange(Math.max(min, value - step))}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number.parseInt(e.target.value) || 0)}
          className="h-8 flex-1 text-center text-sm font-semibold rounded-none border-x-0 px-0 min-w-0"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-l-none shrink-0"
          onClick={() => onChange(value + step)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// Exercise side options
const EXERCISE_SIDE_OPTIONS = [
  { value: 'both', label: 'Obie strony' },
  { value: 'left', label: 'Lewa' },
  { value: 'right', label: 'Prawa' },
  { value: 'alternating', label: 'Naprzemiennie' },
  { value: 'none', label: 'Nie dotyczy' },
];

// Sortable exercise card component with expandable params
function SortableExerciseCard({
  exercise,
  index,
  params,
  onUpdateParams,
  onRemove,
  onPreview,
}: {
  exercise: Exercise;
  index: number;
  params: ExerciseParams;
  onUpdateParams: (field: keyof ExerciseParams, value: number | string) => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const imageUrl = getMediaUrl(exercise.imageUrl || exercise.images?.[0]);
  const isTimeType = exercise.type === 'time';

  // Format params summary for chips
  const paramsSummary = isTimeType ? `${params.sets}×${params.duration}s` : `${params.sets}×${params.reps}`;
  const sideLabel = EXERCISE_SIDE_OPTIONS.find((o) => o.value === params.exerciseSide)?.label;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-full rounded-xl border border-border bg-background overflow-hidden transition-all',
        isDragging && 'shadow-xl shadow-primary/20 opacity-90 z-50'
      )}
    >
      {/* Header - always visible */}
      <div className="p-3 flex items-center gap-2 overflow-hidden">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-surface-light cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-bold text-primary w-5 shrink-0">{index + 1}.</span>
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
            <Eye className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="font-medium text-sm truncate" title={exercise.name}>{exercise.name}</p>
          <p className="text-xs text-muted-foreground truncate">{translateType(exercise.type)}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Compact view - param chips */}
      {!isExpanded && (
        <div className="px-3 pb-3 overflow-hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Combined sets x reps/duration chip */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors shrink-0"
            >
              <Dumbbell className="h-3 w-3" />
              {paramsSummary}
            </button>

            {/* Rest chip */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-light text-muted-foreground text-xs font-medium hover:bg-surface hover:text-foreground transition-colors shrink-0"
              title="Przerwa między seriami"
            >
              <Clock className="h-3 w-3" />
              {params.restSets}s
            </button>

            {/* Side chip - only if not 'both' */}
            {params.exerciseSide && params.exerciseSide !== 'both' && (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-light text-muted-foreground text-xs font-medium hover:bg-surface hover:text-foreground transition-colors shrink-0 max-w-[100px] truncate"
              >
                <ArrowLeftRight className="h-3 w-3 shrink-0" />
                <span className="truncate">{sideLabel}</span>
              </button>
            )}

            {/* Custom name indicator */}
            {params.customName && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-1 text-xs text-muted-foreground shrink-0"
                title={params.customName}
              >
                <Pencil className="h-3 w-3" />
              </span>
            )}

            {/* Notes indicator */}
            {params.notes && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-1 text-xs text-muted-foreground shrink-0"
                title="Notatki dodane"
              >
                <MessageSquare className="h-3 w-3" />
              </span>
            )}

            {/* Edit button */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-surface-light transition-colors shrink-0"
            >
              <Sliders className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded view - full param controls */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/50">
          <div className="pt-3 space-y-4">
            {/* Custom name and description - Personalization */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-between py-1"
                >
                  <span className="flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    Personalizacja nazwy i opisu
                    {(params.customName || params.customDescription) && <span className="ml-1 text-primary">•</span>}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-2 space-y-3">
                  <div>
                    <label
                      htmlFor={`customName-${exercise.id}`}
                      className="text-xs text-muted-foreground block mb-1.5 font-medium"
                    >
                      Własna nazwa (opcjonalne)
                    </label>
                    <Input
                      id={`customName-${exercise.id}`}
                      value={params.customName}
                      onChange={(e) => onUpdateParams('customName', e.target.value)}
                      placeholder={exercise.name}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`customDesc-${exercise.id}`}
                      className="text-xs text-muted-foreground block mb-1.5 font-medium"
                    >
                      Własny opis (opcjonalne)
                    </label>
                    <Textarea
                      id={`customDesc-${exercise.id}`}
                      value={params.customDescription}
                      onChange={(e) => onUpdateParams('customDescription', e.target.value)}
                      placeholder="Nadpisz opis ćwiczenia dla tego zestawu..."
                      className="min-h-[50px] text-sm resize-none"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Main params - 2 column grid */}
            <div className="grid grid-cols-2 gap-3">
              <ParamControl
                label="Serie"
                value={params.sets}
                onChange={(v) => onUpdateParams('sets', v)}
                step={1}
                min={1}
              />
              <ParamControl
                label={isTimeType ? 'Czas serii (s)' : 'Powtórzenia'}
                value={isTimeType ? params.duration : params.reps}
                onChange={(v) => onUpdateParams(isTimeType ? 'duration' : 'reps', v)}
                step={isTimeType ? 5 : 1}
                min={1}
                icon={isTimeType ? <Clock className="h-3 w-3" /> : undefined}
              />
            </div>

            {/* Rest and side - 2 column grid */}
            <div className="grid grid-cols-2 gap-3">
              <ParamControl
                label="Przerwa między seriami (s)"
                value={params.restSets}
                onChange={(v) => onUpdateParams('restSets', v)}
                step={10}
                min={0}
                icon={<Timer className="h-3 w-3" />}
              />
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3" />
                  Strona
                </label>
                <select
                  value={params.exerciseSide}
                  onChange={(e) => onUpdateParams('exerciseSide', e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {EXERCISE_SIDE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 font-medium flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Notatki
              </label>
              <Textarea
                value={params.notes}
                onChange={(e) => onUpdateParams('notes', e.target.value)}
                placeholder="Uwagi do ćwiczenia..."
                className="min-h-[60px] text-sm resize-none"
              />
            </div>

            {/* More options collapsible */}
            <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showMoreOptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showMoreOptions ? 'Mniej opcji' : 'Więcej opcji'}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-3 mt-2 border-t border-border/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <ParamControl
                      label="Przygotowanie (s)"
                      value={params.preparationTime}
                      onChange={(v) => onUpdateParams('preparationTime', v)}
                      step={5}
                      min={0}
                    />
                    <ParamControl
                      label="Czas powtórzenia (s)"
                      value={params.executionTime}
                      onChange={(v) => onUpdateParams('executionTime', v)}
                      step={5}
                      min={0}
                    />
                  </div>
                  <ParamControl
                    label="Przerwa między powtórzeniami (s)"
                    value={params.restReps}
                    onChange={(v) => onUpdateParams('restReps', v)}
                    step={1}
                    min={0}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Collapse button */}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-surface-light"
            >
              <ChevronUp className="h-3 w-3" />
              Zwiń
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Step indicator component for CreateSetWizard
interface StepConfig {
  id: WizardStep;
  label: string;
  description: string;
}

const WIZARD_STEPS: StepConfig[] = [
  { id: 'basics', label: 'Podstawy', description: 'Nazwa i opis zestawu' },
  { id: 'exercises', label: 'Ćwiczenia', description: 'Wybierz i dostosuj ćwiczenia' },
];

function CreateSetStepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  allowNavigation = false,
}: {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  onStepClick?: (step: WizardStep) => void;
  allowNavigation?: boolean;
}) {
  const steps = WIZARD_STEPS;
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progressPercent = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100;
  const currentStepConfig = steps.find((s) => s.id === currentStep);

  return (
    <div className="w-full space-y-3">
      {/* Progress bar with step dots */}
      <div className="relative px-4 py-3">
        {/* Background track */}
        <div className="h-1.5 w-full rounded-full bg-surface-light overflow-hidden">
          {/* Animated fill */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step dots overlay */}
        <div className="absolute inset-x-4 top-0 bottom-0 flex items-center">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === currentStep;
            const isPast = index < currentIndex;
            const canClick = allowNavigation && (isCompleted || isPast);
            const dotPosition = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 50;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => canClick && onStepClick?.(step.id)}
                disabled={!canClick}
                className={cn(
                  'absolute flex items-center justify-center transition-all duration-300',
                  canClick && 'cursor-pointer'
                )}
                style={{
                  left: `${dotPosition}%`,
                  transform: 'translateX(-50%)',
                }}
                title={step.label}
              >
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-all duration-300',
                    isCurrent &&
                      'h-7 w-7 bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20',
                    isCompleted && !isCurrent && 'h-5 w-5 bg-primary text-primary-foreground',
                    !isCurrent && !isCompleted && 'h-4 w-4 bg-surface-light border-2 border-border',
                    canClick && !isCurrent && 'hover:scale-125 hover:border-primary'
                  )}
                >
                  {isCompleted && !isCurrent && <Check className="h-3 w-3" />}
                  {isCurrent && <span className="text-xs font-bold">{index + 1}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current step info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Krok {currentIndex + 1} z {steps.length}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-sm font-semibold text-foreground">{currentStepConfig?.label}</span>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block max-w-[300px] text-right">
          {currentStepConfig?.description}
        </p>
      </div>
    </div>
  );
}

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

  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [exerciseParams, setExerciseParams] = useState<Map<string, ExerciseParams>>(new Map());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [pickerView, setPickerView] = useState<'smart' | 'all'>('smart');
  const [_creationMode, setCreationMode] = useState<CreationMode>('manual');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const animationKey = useRef(0);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hasChanges = name.trim().length > 0 || description.trim().length > 0 || selectedExerciseIds.length > 0;

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

  useEffect(() => {
    if (open) {
      setCurrentStep('basics');
      // Set default name with patient context
      setName(patientName ? `Zestaw dla ${patientName}` : '');
      setDescription('');
      setSearchQuery('');
      setCategoryFilter('all');
      setSelectedExerciseIds([]);
      setExerciseParams(new Map());
      setShowCloseConfirm(false);
      setPreviewExercise(null);
      setPickerView('smart');
      setCreationMode('manual');
    }
  }, [open, patientName]);

  // Fetch exercises
  const { data: exercisesData, loading: loadingExercises } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  // Fetch tags for dynamic categories
  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  // Fetch tag categories for colors and grouping
  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  // Fetch existing exercise sets for popularity analysis
  const { data: exerciseSetsData } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  // Fetch patient clinical notes if patient context is provided
  const { data: clinicalNotesData } = useQuery(GET_PATIENT_CLINICAL_NOTES_QUERY, {
    variables: { patientId: patientId || '', organizationId },
    skip: !patientId || !organizationId || !open,
  });

  // Build patient context from clinical notes
  const patientContext: PatientContext | undefined = useMemo(() => {
    if (!patientId) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = (clinicalNotesData as any)?.patientClinicalNotes || [];
    const latestNote = notes[0]; // Assuming sorted by date desc

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

  const [createSet, { loading: creatingSet }] = useMutation(CREATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
  });

  const [addExercise, { loading: addingExercises }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const [assignSetToPatient, { loading: assigning }] = useMutation(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION);

  // Process tags and categories
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];
  const tagsMap = useMemo(() => createTagsMap(tags, categories), [tags, categories]);

  // Get exercise sets for popularity analysis
  const exerciseSets = (exerciseSetsData as OrganizationExerciseSetsResponse)?.exerciseSets || [];

  // Map exercises with full tag objects
  const exercises: Exercise[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawExercises = (exercisesData as { organizationExercises?: any[] })?.organizationExercises || [];
    return mapExercisesWithTags(rawExercises, tagsMap);
  }, [exercisesData, tagsMap]);

  const getExerciseTags = useCallback((ex: Exercise) => {
    return [...(ex.mainTags || []), ...(ex.additionalTags || [])].filter((tag) => tag && tag.name);
  }, []);

  // Calculate exercise popularity (how many sets use each exercise)
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

  // Get popular exercises (top 10 most used)
  const popularExercises = useMemo(() => {
    return [...exercises]
      .filter((ex) => exercisePopularity[ex.id] > 0)
      .sort((a, b) => (exercisePopularity[b.id] || 0) - (exercisePopularity[a.id] || 0))
      .slice(0, 10);
  }, [exercises, exercisePopularity]);

  // Get template sets (most used as templates)
  const templateSets = useMemo(() => {
    return exerciseSets
      .filter((set) => (set.exerciseMappings?.length || 0) > 0)
      .sort((a, b) => (b.patientAssignments?.length || 0) - (a.patientAssignments?.length || 0))
      .slice(0, 4);
  }, [exerciseSets]);

  // Get recently used exercises (from last 5 sets)
  const recentExercises = useMemo(() => {
    const recentSets = exerciseSets.slice(0, 5);
    const recentExerciseIds = new Set<string>();

    for (const set of recentSets) {
      for (const mapping of set.exerciseMappings || []) {
        if (mapping.exerciseId) {
          recentExerciseIds.add(mapping.exerciseId);
        }
      }
    }

    return exercises.filter((ex) => recentExerciseIds.has(ex.id)).slice(0, 8);
  }, [exercises, exerciseSets]);

  // Get suggested exercises based on selected ones (similar tags)
  const suggestedExercises = useMemo(() => {
    if (selectedExerciseIds.length === 0) return [];

    // Get all tags from selected exercises
    const selectedTags = new Set<string>();
    for (const id of selectedExerciseIds) {
      const exercise = exercises.find((ex) => ex.id === id);
      if (exercise) {
        const tags = getExerciseTags(exercise);
        tags.forEach((tag) => selectedTags.add(tag.id));
      }
    }

    // Find exercises with similar tags that aren't already selected
    return exercises
      .filter((ex) => !selectedExerciseIds.includes(ex.id))
      .map((ex) => {
        const tags = getExerciseTags(ex);
        const matchingTags = tags.filter((tag) => selectedTags.has(tag.id)).length;
        return { exercise: ex, score: matchingTags };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.exercise);
  }, [exercises, selectedExerciseIds, getExerciseTags]);

  // Build dynamic quick start categories from actual tags
  const quickStartCategories: QuickStartCategory[] = useMemo(() => {
    // Count exercises per tag
    const tagExerciseCounts: Record<string, number> = {};

    for (const exercise of exercises) {
      const exerciseTags = getExerciseTags(exercise);
      for (const tag of exerciseTags) {
        if (tag.id) {
          tagExerciseCounts[tag.id] = (tagExerciseCounts[tag.id] || 0) + 1;
        }
      }
    }

    // Get main tags (isMain=true) or tags with most exercises
    const mainTags = tags.filter((tag) => tag.isMain);
    const tagsToShow =
      mainTags.length > 0
        ? mainTags
        : tags.sort((a, b) => (tagExerciseCounts[b.id] || 0) - (tagExerciseCounts[a.id] || 0)).slice(0, 8);

    // Create quick start categories
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

  // Dynamic category filters for exercise list
  const categoryFilters = useMemo(() => {
    return [
      { id: 'all', label: 'Wszystkie' },
      ...quickStartCategories.map((cat) => ({ id: cat.id, label: cat.label })),
    ];
  }, [quickStartCategories]);

  const filteredExercises = useMemo(() => {
    let result = exercises;

    // Filter by tag ID (not name matching)
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

  const getDefaultParams = useCallback(
    (exercise: Exercise): ExerciseParams => ({
      sets: exercise.sets || 3,
      reps: exercise.reps || 10,
      duration: exercise.duration || 30,
      restSets: exercise.restSets || 60,
      restReps: exercise.restReps || 0,
      preparationTime: 0,
      executionTime: 0,
      notes: '',
      exerciseSide: exercise.exerciseSide || 'both',
      customName: '',
      customDescription: '',
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
    (exerciseId: string, field: keyof ExerciseParams, value: number | string) => {
      setExerciseParams((prev) => {
        const next = new Map(prev);
        const exercise = exercises.find((e) => e.id === exerciseId);
        const current =
          next.get(exerciseId) ||
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
              });
        const newValue = typeof value === 'number' ? Math.max(0, value) : value;
        next.set(exerciseId, { ...current, [field]: newValue });
        return next;
      });
    },
    [exercises, getDefaultParams]
  );

  const applyParamsToAll = useCallback(
    (field: keyof ExerciseParams, value: number) => {
      setExerciseParams((prev) => {
        const next = new Map(prev);
        for (const id of selectedExerciseIds) {
          const exercise = exercises.find((e) => e.id === id);
          if (exercise) {
            const current = next.get(id) || getExerciseParams(exercise);
            next.set(id, { ...current, [field]: value });
          }
        }
        return next;
      });
      toast.success(`Zastosowano do ${selectedExerciseIds.length} ćwiczeń`);
    },
    [selectedExerciseIds, exercises, getExerciseParams]
  );

  const toggleExercise = useCallback(
    (exercise: Exercise) => {
      setSelectedExerciseIds((prev) => {
        if (prev.includes(exercise.id)) {
          return prev.filter((id) => id !== exercise.id);
        } else {
          if (!exerciseParams.has(exercise.id)) {
            setExerciseParams((p) => {
              const np = new Map(p);
              np.set(exercise.id, getDefaultParams(exercise));
              return np;
            });
          }
          return [...prev, exercise.id];
        }
      });
    },
    [exerciseParams, getDefaultParams]
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedExerciseIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Quick start - select category and go to exercises
  const handleQuickStart = useCallback(
    (categoryId: string) => {
      if (!name.trim()) {
        const cat = quickStartCategories.find((c) => c.id === categoryId);
        setName(cat ? `Zestaw - ${cat.label}` : '');
      }
      setCategoryFilter(categoryId);
      setCurrentStep('exercises');
    },
    [name, quickStartCategories]
  );

  // Handle AI generator selecting exercises
  const handleAISelectExercises = useCallback(
    (exerciseIds: string[]) => {
      // Add exercises from AI to selection
      setSelectedExerciseIds((prev) => {
        const combined = new Set([...prev, ...exerciseIds]);
        return Array.from(combined);
      });

      // Initialize params for new exercises
      setExerciseParams((prev) => {
        const next = new Map(prev);
        for (const id of exerciseIds) {
          if (!next.has(id)) {
            const exercise = exercises.find((e) => e.id === id);
            if (exercise) {
              next.set(id, getDefaultParams(exercise));
            }
          }
        }
        return next;
      });

      // Switch to exercises step
      setCurrentStep('exercises');
      setCreationMode('manual');
      toast.success(`Dodano ${exerciseIds.length} ćwiczeń z AI`);
    },
    [exercises, getDefaultParams]
  );

  // Start AI mode
  const handleStartAIMode = useCallback(() => {
    if (!name.trim()) {
      setName('Zestaw AI');
    }
    setCreationMode('ai');
    setCurrentStep('ai');
  }, [name]);

  // Use template - copy exercises from existing set
  const handleUseTemplate = useCallback(
    (templateSet: (typeof exerciseSets)[0]) => {
      const exerciseIds = templateSet.exerciseMappings?.map((m) => m.exerciseId) || [];
      if (exerciseIds.length === 0) {
        toast.error('Ten zestaw nie zawiera ćwiczeń');
        return;
      }

      // Set name based on template
      if (!name.trim()) {
        setName(`${templateSet.name} (kopia)`);
      }

      // Add exercises
      setSelectedExerciseIds(exerciseIds);

      // Copy params from template
      setExerciseParams((prev) => {
        const next = new Map(prev);
        for (const mapping of templateSet.exerciseMappings || []) {
          if (mapping.exerciseId && mapping.exercise) {
            next.set(mapping.exerciseId, {
              sets: mapping.sets ?? mapping.exercise.sets ?? 3,
              reps: mapping.reps ?? mapping.exercise.reps ?? 10,
              duration: mapping.duration ?? mapping.exercise.duration ?? 30,
              restSets: mapping.restSets ?? mapping.exercise.restSets ?? 60,
              restReps: mapping.restReps ?? mapping.exercise.restReps ?? 0,
              preparationTime: 0,
              executionTime: 0,
              notes: mapping.notes ?? '',
              exerciseSide: mapping.exercise.exerciseSide || 'both',
              customName: mapping.customName ?? '',
              customDescription: mapping.customDescription ?? '',
            });
          }
        }
        return next;
      });

      toast.success(`Skopiowano ${exerciseIds.length} ćwiczeń z "${templateSet.name}"`);
      setCurrentStep('exercises');
    },
    [name, exerciseSets]
  );

  const canProceedFromBasics = name.trim().length >= 2;
  const isLoading = creatingSet || addingExercises || assigning;

  const selectedExercisesList = useMemo(() => {
    return selectedExerciseIds
      .map((id) => exercises.find((ex) => ex.id === id))
      .filter((ex): ex is Exercise => ex !== undefined);
  }, [exercises, selectedExerciseIds]);

  const estimatedTime = useMemo(() => {
    return estimateWorkoutTime(selectedExercisesList, exerciseParams, getExerciseParams);
  }, [selectedExercisesList, exerciseParams, getExerciseParams]);

  const handleCreateSet = async (addExercisesAfter: boolean) => {
    if (!canProceedFromBasics) return;

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

      if (addExercisesAfter && selectedExerciseIds.length > 0) {
        let order = 0;
        for (const exerciseId of selectedExerciseIds) {
          const exercise = exercises.find((e) => e.id === exerciseId);
          if (!exercise) continue;
          const params = getExerciseParams(exercise);
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
            },
          });
        }
      }

      // Auto-assign to patient if enabled
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

  const goToExercises = () => {
    if (canProceedFromBasics) {
      setSlideDirection('right');
      animationKey.current += 1;
      setCompletedSteps((prev) => new Set([...prev, 'basics']));
      setCurrentStep('exercises');
    }
  };

  const goBack = () => {
    setSlideDirection('left');
    animationKey.current += 1;
    setCurrentStep('basics');
  };

  const goToStep = (step: WizardStep) => {
    const steps = WIZARD_STEPS;
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    const targetIndex = steps.findIndex((s) => s.id === step);
    setSlideDirection(targetIndex > currentIndex ? 'right' : 'left');
    animationKey.current += 1;
    setCurrentStep(step);
  };

  const isFirstStep = currentStep === 'basics';

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-7xl w-[98vw] max-h-[95vh] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        data-testid="set-wizard"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 flex items-center justify-center shrink-0">
                  <FolderPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Nowy zestaw ćwiczeń</DialogTitle>
                  <DialogDescription className="mt-1">
                    {currentStep === 'basics'
                      ? 'Podaj nazwę lub wybierz szybki start'
                      : currentStep === 'ai'
                      ? 'AI zaproponuje ćwiczenia na podstawie opisu'
                      : 'Wybierz i dostosuj ćwiczenia'}
                  </DialogDescription>
                </div>
              </div>

              {/* Floating Context Summary */}
              {currentStep !== 'basics' && currentStep !== 'ai' && (
                <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-light/50 border border-border/50 text-xs shrink-0 mr-8">
                  {name && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground max-w-[120px] truncate">{name}</span>
                    </div>
                  )}
                  {selectedExerciseIds.length > 0 && (
                    <>
                      {name && <span className="text-border">•</span>}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Dumbbell className="h-3.5 w-3.5" />
                        <span>{selectedExerciseIds.length} ćwiczeń</span>
                      </div>
                    </>
                  )}
                  {estimatedTime > 0 && (
                    <>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>~{estimatedTime} min</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* AI mode indicator */}
              {currentStep === 'ai' && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-xs shrink-0 mr-8">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  <span className="font-medium text-violet-300">AI Generator</span>
                </div>
              )}
            </div>

            {/* Step Indicator - hidden for AI step */}
            {currentStep !== 'ai' && (
              <CreateSetStepIndicator
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={goToStep}
                allowNavigation={completedSteps.size > 0}
              />
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div
            key={animationKey.current}
            className={cn(
              'h-full',
              slideDirection === 'right' ? 'animate-wizard-slide-in-right' : 'animate-wizard-slide-in-left'
            )}
          >
          {currentStep === 'basics' ? (
            <div className="h-full p-4 sm:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-auto">
              {/* Left: Form */}
              <div className="w-full lg:flex-1 flex flex-col gap-4 sm:gap-5">
                {/* Patient context banner */}
                {patientContext && (
                  <div className="rounded-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary shrink-0">
                        <span className="text-sm font-bold">
                          {patientContext.patientName?.charAt(0)?.toUpperCase() || 'P'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          Tworzysz zestaw dla: {patientContext.patientName || 'Pacjenta'}
                        </p>
                        {patientContext.diagnosis && patientContext.diagnosis.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {patientContext.diagnosis.slice(0, 2).join(' • ')}
                          </p>
                        )}
                        {patientContext.painLocation && (
                          <p className="text-xs text-muted-foreground">Lokalizacja: {patientContext.painLocation}</p>
                        )}
                      </div>
                      {autoAssign && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          Auto-przypisanie
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Name field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-primary" />
                    Nazwa zestawu
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Rehabilitacja kolana - faza 1"
                    className="h-12 text-base bg-surface border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    autoFocus
                    autoComplete="off"
                    data-testid="set-wizard-name-input"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 2 znaki</p>
                </div>

                {/* Description field */}
                <div className="space-y-2 flex-1 flex flex-col">
                  <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                    <AlignLeft className="h-4 w-4 text-muted-foreground" />
                    Opis
                    <span className="text-muted-foreground text-xs font-normal">(opcjonalnie)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opisz cel zestawu, dla kogo jest przeznaczony..."
                    className="flex-1 min-h-[120px] resize-none text-base bg-surface border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    data-testid="set-wizard-description-input"
                  />
                </div>

                {/* Quick description chips */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Szybkie dodawanie do opisu:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Wzmocnienie mięśni',
                      'Rozciąganie',
                      'Stabilizacja',
                      'Mobilność stawów',
                      'Rehabilitacja pourazowa',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          const prefix = description.trim() ? `${description.trim()}, ` : '';
                          setDescription(`${prefix}${chip.toLowerCase()}`);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs bg-surface-light hover:bg-surface hover:text-foreground border border-border/40 text-muted-foreground transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Quick Start */}
              <div className="w-full lg:flex-1 flex flex-col gap-4 lg:overflow-y-auto lg:overflow-x-hidden px-1 min-w-0">
                {/* AI Generator Card - Hero Action */}
                <button
                  type="button"
                  onClick={handleStartAIMode}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 shrink-0 cursor-pointer m-1',
                    'bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600',
                    'hover:shadow-xl hover:shadow-violet-500/20 hover:scale-[1.02]',
                    'active:scale-[0.99]'
                  )}
                >
                  {/* Animated background glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

                  <div className="relative flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">AI Generator</h3>
                      <p className="text-sm text-white/80">
                        Opisz potrzeby pacjenta - AI zaproponuje ćwiczenia
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                  </div>
                </button>

                {/* Quick Start Categories */}
                <div className="rounded-2xl border border-border/60 bg-surface-light/30 p-4 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Szybki start</h3>
                  </div>

                  {quickStartCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <Tag className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">Brak tagów z ćwiczeniami</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-stagger">
                      {quickStartCategories.slice(0, 6).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleQuickStart(cat.id)}
                          className={cn(
                            'group relative rounded-xl p-3 text-left transition-all duration-300',
                            'border border-border/60 bg-surface/50',
                            'hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
                            'active:scale-[0.98]'
                          )}
                        >
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white mb-2 transition-transform duration-300 group-hover:scale-110"
                            style={{ backgroundColor: cat.color }}
                          >
                            <Tag className="h-4 w-4" />
                          </div>
                          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{cat.label}</p>
                          <p className="text-xs text-muted-foreground">{cat.exerciseCount} ćwiczeń</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Templates section */}
                {templateSets.length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-surface-light/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Copy className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">Z szablonu</h3>
                    </div>
                    <div className="space-y-2 animate-stagger">
                      {templateSets.map((set) => (
                        <button
                          key={set.id}
                          type="button"
                          onClick={() => handleUseTemplate(set)}
                          className={cn(
                            'group w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-300',
                            'border border-border/60 bg-surface/50',
                            'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
                            'active:scale-[0.99]'
                          )}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-light shrink-0 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-105">
                            <Dumbbell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{set.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {set.exerciseMappings?.length || 0} ćwiczeń
                              {set.patientAssignments && set.patientAssignments.length > 0 && (
                                <span className="ml-1">
                                  • <Users className="inline h-3 w-3" /> {set.patientAssignments.length}
                                </span>
                              )}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : currentStep === 'exercises' ? (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Left: Exercise picker */}
              <div className="flex-1 flex flex-col lg:border-r border-border min-w-0">
                <div className="p-4 border-b border-border space-y-3">
                  {/* Search and view toggle */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (e.target.value.trim()) setPickerView('all');
                        }}
                        placeholder="Szukaj ćwiczeń..."
                        className="h-11 pl-10"
                        data-testid="set-wizard-search-input"
                      />
                    </div>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setPickerView('smart')}
                        className={cn(
                          'px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors',
                          pickerView === 'smart'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface-light text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Smart
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickerView('all')}
                        className={cn(
                          'px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors',
                          pickerView === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface-light text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        Wszystkie
                      </button>
                    </div>
                  </div>

                  {/* Category filters - only in "all" view */}
                  {pickerView === 'all' && (
                    <div className="flex flex-wrap gap-1.5">
                      {categoryFilters.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryFilter(cat.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            categoryFilter === cat.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-surface-light text-muted-foreground hover:bg-surface hover:text-foreground'
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {pickerView === 'all' && (
                    <p className="text-sm text-muted-foreground">{filteredExercises.length} ćwiczeń</p>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {loadingExercises ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : pickerView === 'smart' ? (
                      /* Smart View - sections */
                      <div className="space-y-6">
                        {/* Suggested section - only if there are selected exercises */}
                        {suggestedExercises.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="h-4 w-4 text-amber-500" />
                              <h4 className="text-sm font-semibold">Sugerowane</h4>
                              <span className="text-xs text-muted-foreground">na podstawie wybranych</span>
                            </div>
                            <div className="grid gap-2 animate-stagger">
                              {suggestedExercises.map((exercise) => (
                                <ExercisePickerItem
                                  key={exercise.id}
                                  exercise={exercise}
                                  isSelected={selectedExerciseIds.includes(exercise.id)}
                                  onToggle={() => toggleExercise(exercise)}
                                  onPreview={() => setPreviewExercise(exercise)}
                                  getExerciseTags={getExerciseTags}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Popular section */}
                        {popularExercises.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-semibold">Popularne</h4>
                              <span className="text-xs text-muted-foreground">najczęściej używane</span>
                            </div>
                            <div className="grid gap-2 animate-stagger">
                              {popularExercises.map((exercise) => (
                                <ExercisePickerItem
                                  key={exercise.id}
                                  exercise={exercise}
                                  isSelected={selectedExerciseIds.includes(exercise.id)}
                                  onToggle={() => toggleExercise(exercise)}
                                  onPreview={() => setPreviewExercise(exercise)}
                                  getExerciseTags={getExerciseTags}
                                  badge={`${exercisePopularity[exercise.id]}x`}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recent section */}
                        {recentExercises.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <History className="h-4 w-4 text-muted-foreground" />
                              <h4 className="text-sm font-semibold">Ostatnio używane</h4>
                            </div>
                            <div className="grid gap-2 animate-stagger">
                              {recentExercises.map((exercise) => (
                                <ExercisePickerItem
                                  key={exercise.id}
                                  exercise={exercise}
                                  isSelected={selectedExerciseIds.includes(exercise.id)}
                                  onToggle={() => toggleExercise(exercise)}
                                  onPreview={() => setPreviewExercise(exercise)}
                                  getExerciseTags={getExerciseTags}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Empty state for smart view */}
                        {popularExercises.length === 0 && recentExercises.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Brak danych do sugestii</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Przełącz na &quot;Wszystkie&quot; aby zobaczyć pełną listę
                            </p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setPickerView('all')}>
                              Zobacz wszystkie ćwiczenia
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : filteredExercises.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Dumbbell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak ćwiczeń w tej kategorii'}
                        </p>
                      </div>
                    ) : (
                      /* All View - flat list */
                      <div className="grid gap-2">
                        {filteredExercises.map((exercise) => (
                          <ExercisePickerItem
                            key={exercise.id}
                            exercise={exercise}
                            isSelected={selectedExerciseIds.includes(exercise.id)}
                            onToggle={() => toggleExercise(exercise)}
                            onPreview={() => setPreviewExercise(exercise)}
                            getExerciseTags={getExerciseTags}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Selected exercises */}
              <div className="hidden lg:flex lg:flex-1 flex-col bg-surface-light/30 border-t lg:border-t-0 overflow-hidden min-w-0">
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm shrink-0">Wybrane ({selectedExerciseIds.length})</h3>
                    {selectedExerciseIds.length > 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Sliders className="h-3 w-3" />
                            <span className="hidden xl:inline">Ustaw dla wszystkich</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs">Serie</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => applyParamsToAll('sets', 3)}>3 serie</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => applyParamsToAll('sets', 4)}>4 serie</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Powtórzenia</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => applyParamsToAll('reps', 10)}>10 powt.</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => applyParamsToAll('reps', 15)}>15 powt.</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Przerwa między seriami</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => applyParamsToAll('restSets', 30)}>30s</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => applyParamsToAll('restSets', 60)}>60s</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => applyParamsToAll('restSets', 90)}>90s</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {selectedExercisesList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                      <div className="h-14 w-14 rounded-full bg-surface-light flex items-center justify-center mb-3">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Kliknij ćwiczenie aby dodać</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Przeciągnij aby zmienić kolejność</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={selectedExerciseIds} strategy={verticalListSortingStrategy}>
                        <div className="p-3 space-y-2">
                          {selectedExercisesList.map((exercise, index) => (
                            <SortableExerciseCard
                              key={exercise.id}
                              exercise={exercise}
                              index={index}
                              params={getExerciseParams(exercise)}
                              onUpdateParams={(field, value) => updateExerciseParams(exercise.id, field, value)}
                              onRemove={() => toggleExercise(exercise)}
                              onPreview={() => setPreviewExercise(exercise)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            </div>
          ) : currentStep === 'ai' ? (
            /* AI Generator Step */
            <AISetGenerator
              exercises={exercises}
              onSelectExercises={handleAISelectExercises}
              onCancel={() => {
                setCurrentStep('basics');
                setCreationMode('manual');
              }}
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
          ) : null}
          </div>
        </div>

        {/* Footer - hidden for AI step (has its own footer) */}
        {currentStep !== 'ai' && (
          <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
            <Button variant="ghost" onClick={handleCloseAttempt} disabled={isLoading}>
              Anuluj
            </Button>

            <div className="flex items-center gap-3">
              {/* Mobile: show selected count */}
              {currentStep === 'exercises' && (
                <div className="flex lg:hidden items-center gap-2 text-sm text-muted-foreground">
                  <Dumbbell className="h-4 w-4" />
                  <span className="font-medium text-foreground">{selectedExerciseIds.length}</span>
                </div>
              )}

              {!isFirstStep && (
                <Button variant="ghost" onClick={goBack} disabled={isLoading} data-testid="set-wizard-back-btn">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Wstecz
                </Button>
              )}

              {currentStep === 'basics' ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleCreateSet(false)}
                    disabled={!canProceedFromBasics || isLoading}
                    className="hidden sm:flex"
                    data-testid="set-wizard-create-empty-btn"
                  >
                    {creatingSet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Utwórz pusty
                  </Button>

                  <Button
                    onClick={goToExercises}
                    disabled={!canProceedFromBasics}
                    className="gap-2 bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 min-w-[140px]"
                    data-testid="set-wizard-next-btn"
                  >
                    Dalej: Ćwiczenia
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => handleCreateSet(true)}
                  disabled={isLoading}
                  className="gap-2 bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 min-w-[160px]"
                  data-testid="set-wizard-create-btn"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Check className="h-4 w-4 mr-1" />
                  Utwórz zestaw
                </Button>
              )}
            </div>
          </div>
        )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewExercise?.name}</DialogTitle>
            <DialogDescription>{translateType(previewExercise?.type)}</DialogDescription>
          </DialogHeader>
          {previewExercise && (
            <div className="space-y-4">
              {getMediaUrl(previewExercise.imageUrl || previewExercise.images?.[0]) && (
                <div className="rounded-xl overflow-hidden aspect-video bg-surface-light">
                  <img
                    src={getMediaUrl(previewExercise.imageUrl || previewExercise.images?.[0]) || ''}
                    alt={previewExercise.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              {previewExercise.description && (
                <p className="text-sm text-muted-foreground">{previewExercise.description}</p>
              )}
              <div className="grid grid-cols-3 gap-3">
                {previewExercise.sets && (
                  <div className="rounded-lg bg-surface p-3 text-center">
                    <p className="text-lg font-bold">{previewExercise.sets}</p>
                    <p className="text-xs text-muted-foreground">Serie</p>
                  </div>
                )}
                {previewExercise.reps && (
                  <div className="rounded-lg bg-surface p-3 text-center">
                    <p className="text-lg font-bold">{previewExercise.reps}</p>
                    <p className="text-xs text-muted-foreground">Powtórzenia</p>
                  </div>
                )}
                {previewExercise.duration && (
                  <div className="rounded-lg bg-surface p-3 text-center">
                    <p className="text-lg font-bold">{previewExercise.duration}s</p>
                    <p className="text-xs text-muted-foreground">Czas serii</p>
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
