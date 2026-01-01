'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Search,
  Loader2,
  Dumbbell,
  Check,
  ArrowRight,
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
  Activity,
  Target,
  Footprints,
  CircleDot,
  Sliders,
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';

import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';

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
}

interface CreateSetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: (setId: string) => void;
}

type WizardStep = 'basics' | 'exercises';

// Quick start categories with icons
const QUICK_START_CATEGORIES = [
  { id: 'kolano', label: 'Kolano', icon: Target, color: 'from-blue-500 to-cyan-500' },
  { id: 'kręgosłup', label: 'Kręgosłup', icon: Activity, color: 'from-purple-500 to-violet-500' },
  { id: 'bark', label: 'Barki', icon: Zap, color: 'from-amber-500 to-orange-500' },
  { id: 'biodro', label: 'Biodro', icon: CircleDot, color: 'from-pink-500 to-rose-500' },
  { id: 'core', label: 'Core', icon: Target, color: 'from-emerald-500 to-green-500' },
  { id: 'stopa', label: 'Stopa', icon: Footprints, color: 'from-indigo-500 to-blue-500' },
];

// Category filters for exercise list
const CATEGORY_FILTERS = [
  { id: 'all', label: 'Wszystkie' },
  ...QUICK_START_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

const translateType = (type?: string) => {
  const types: Record<string, string> = {
    time: 'czasowe',
    reps: 'powtórzenia',
    hold: 'utrzymanie',
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
    const isTimeType = exercise.type === 'time' || exercise.type === 'hold';

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

// Sortable exercise card component
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
  onUpdateParams: (field: keyof ExerciseParams, value: number) => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rawImageUrl = exercise.imageUrl || exercise.images?.[0];
  const imageUrl = getMediaUrl(rawImageUrl);
  const isTimeType = exercise.type === 'time' || exercise.type === 'hold';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border border-border bg-background p-3 transition-all',
        isDragging && 'shadow-xl shadow-primary/20 opacity-90 scale-[1.02] z-50'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-surface-light cursor-grab active:cursor-grabbing touch-none"
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
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{exercise.name}</p>
          <p className="text-xs text-muted-foreground">{translateType(exercise.type)}</p>
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

      {/* Main params - compact grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Sets */}
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">Serie</label>
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-r-none"
              onClick={() => onUpdateParams('sets', params.sets - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={params.sets}
              onChange={(e) => onUpdateParams('sets', parseInt(e.target.value) || 0)}
              className="h-7 w-10 text-center text-xs font-semibold rounded-none border-x-0 px-0"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-l-none"
              onClick={() => onUpdateParams('sets', params.sets + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Reps or Duration */}
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-0.5">
            {isTimeType ? (
              <>
                <Clock className="h-2.5 w-2.5" /> Czas (s)
              </>
            ) : (
              'Powt.'
            )}
          </label>
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-r-none"
              onClick={() =>
                onUpdateParams(isTimeType ? 'duration' : 'reps', isTimeType ? params.duration - 5 : params.reps - 1)
              }
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={isTimeType ? params.duration : params.reps}
              onChange={(e) => onUpdateParams(isTimeType ? 'duration' : 'reps', parseInt(e.target.value) || 0)}
              className="h-7 w-10 text-center text-xs font-semibold rounded-none border-x-0 px-0"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-l-none"
              onClick={() =>
                onUpdateParams(isTimeType ? 'duration' : 'reps', isTimeType ? params.duration + 5 : params.reps + 1)
              }
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Rest between sets */}
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">Przerwa (s)</label>
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-r-none"
              onClick={() => onUpdateParams('restSets', params.restSets - 10)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={params.restSets}
              onChange={(e) => onUpdateParams('restSets', parseInt(e.target.value) || 0)}
              className="h-7 w-10 text-center text-xs font-semibold rounded-none border-x-0 px-0"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-l-none"
              onClick={() => onUpdateParams('restSets', params.restSets + 10)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* More options collapsible */}
      <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1 mt-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMoreOptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showMoreOptions ? 'Mniej opcji' : 'Więcej opcji'}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-2 border-t border-border/50 mt-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Rest between reps */}
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Przerwa między powt. (s)</label>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-r-none"
                    onClick={() => onUpdateParams('restReps', params.restReps - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={params.restReps}
                    onChange={(e) => onUpdateParams('restReps', parseInt(e.target.value) || 0)}
                    className="h-7 flex-1 text-center text-xs font-semibold rounded-none border-x-0 px-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-l-none"
                    onClick={() => onUpdateParams('restReps', params.restReps + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function CreateSetWizard({ open, onOpenChange, organizationId, onSuccess }: CreateSetWizardProps) {
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
      setName('');
      setDescription('');
      setSearchQuery('');
      setCategoryFilter('all');
      setSelectedExerciseIds([]);
      setExerciseParams(new Map());
      setShowCloseConfirm(false);
      setPreviewExercise(null);
    }
  }, [open]);

  const { data: exercisesData, loading: loadingExercises } = useQuery(GET_ORGANIZATION_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const [createSet, { loading: creatingSet }] = useMutation(CREATE_EXERCISE_SET_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_EXERCISE_SETS_QUERY, variables: { organizationId } }],
  });

  const [addExercise, { loading: addingExercises }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const exercises: Exercise[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (exercisesData as { organizationExercises?: any[] })?.organizationExercises || [];
  }, [exercisesData]);

  const getExerciseTags = useCallback((ex: Exercise) => {
    return [...(ex.mainTags || []), ...(ex.additionalTags || [])].filter((tag) => tag && tag.name);
  }, []);

  // Count exercises per category
  const categoryExerciseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of QUICK_START_CATEGORIES) {
      counts[cat.id] = exercises.filter((ex) => {
        const allTags = getExerciseTags(ex);
        return allTags.some((tag) => tag.name?.toLowerCase().includes(cat.id.toLowerCase()));
      }).length;
    }
    return counts;
  }, [exercises, getExerciseTags]);

  const filteredExercises = useMemo(() => {
    let result = exercises;

    if (categoryFilter !== 'all') {
      result = result.filter((ex) => {
        const allTags = getExerciseTags(ex);
        return allTags.some((tag) => tag.name?.toLowerCase().includes(categoryFilter.toLowerCase()));
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

  const getExerciseParams = useCallback(
    (exercise: Exercise): ExerciseParams => {
      const saved = exerciseParams.get(exercise.id);
      if (saved) return saved;
      return {
        sets: exercise.sets || 3,
        reps: exercise.reps || 10,
        duration: exercise.duration || 30,
        restSets: exercise.restSets || 60,
        restReps: exercise.restReps || 0,
      };
    },
    [exerciseParams]
  );

  const updateExerciseParams = useCallback((exerciseId: string, field: keyof ExerciseParams, value: number) => {
    setExerciseParams((prev) => {
      const next = new Map(prev);
      const current = next.get(exerciseId) || { sets: 3, reps: 10, duration: 30, restSets: 60, restReps: 0 };
      next.set(exerciseId, { ...current, [field]: Math.max(0, value) });
      return next;
    });
  }, []);

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
              np.set(exercise.id, {
                sets: exercise.sets || 3,
                reps: exercise.reps || 10,
                duration: exercise.duration || 30,
                restSets: exercise.restSets || 60,
                restReps: exercise.restReps || 0,
              });
              return np;
            });
          }
          return [...prev, exercise.id];
        }
      });
    },
    [exerciseParams]
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
  const handleQuickStart = (categoryId: string) => {
    if (!name.trim()) {
      const cat = QUICK_START_CATEGORIES.find((c) => c.id === categoryId);
      setName(cat ? `Zestaw - ${cat.label}` : '');
    }
    setCategoryFilter(categoryId);
    setCurrentStep('exercises');
  };

  const canProceedFromBasics = name.trim().length >= 2;
  const isLoading = creatingSet || addingExercises;

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

      toast.success(`Zestaw "${name}" utworzony`);
      onOpenChange(false);
      onSuccess?.(newSetId);
      router.push(`/exercise-sets/${newSetId}`);
    } catch (error) {
      console.error('Błąd tworzenia zestawu:', error);
      toast.error('Nie udało się utworzyć zestawu');
    }
  };

  const goToExercises = () => {
    if (canProceedFromBasics) setCurrentStep('exercises');
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-6xl w-[95vw] max-h-[90vh] h-[85vh] flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
                <FolderPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Nowy zestaw ćwiczeń</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {currentStep === 'basics'
                    ? 'Podaj nazwę lub wybierz szybki start'
                    : `${selectedExerciseIds.length} ćwiczeń • ~${estimatedTime} min`}
                </DialogDescription>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('basics')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                    currentStep === 'basics'
                      ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/20'
                      : 'bg-primary/20 text-primary hover:bg-primary/30'
                  )}
                >
                  {currentStep !== 'basics' && <Check className="h-4 w-4" />}
                  <FileText className="h-4 w-4" />
                  <span>Podstawy</span>
                </button>
                <div
                  className={cn(
                    'w-10 h-1 rounded-full transition-all',
                    currentStep === 'exercises' ? 'bg-primary' : 'bg-border'
                  )}
                />
                <button
                  type="button"
                  onClick={goToExercises}
                  disabled={!canProceedFromBasics}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                    currentStep === 'exercises'
                      ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/20'
                      : canProceedFromBasics
                      ? 'bg-surface-light text-muted-foreground hover:bg-surface hover:text-foreground'
                      : 'bg-surface-light text-muted-foreground/50 cursor-not-allowed'
                  )}
                >
                  <Dumbbell className="h-4 w-4" />
                  <span>Ćwiczenia</span>
                  {selectedExerciseIds.length > 0 && (
                    <Badge className="bg-primary/20 text-primary text-xs h-5 px-1.5">
                      {selectedExerciseIds.length}
                    </Badge>
                  )}
                </button>
              </div>
            </div>

            <div className="w-11" />
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'basics' ? (
            <div className="h-full p-6 flex gap-6">
              {/* Left: Form */}
              <div className="flex-1 flex flex-col max-w-xl">
                <div className="rounded-2xl border border-border/60 bg-surface overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-primary to-emerald-500" />
                  <div className="p-6 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Nazwa zestawu *
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="np. Rehabilitacja kolana - faza 1"
                        className="h-12 text-base bg-background"
                        autoFocus
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">Minimum 2 znaki</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">
                        Opis <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ćwiczenia wzmacniające po rekonstrukcji ACL..."
                        className="min-h-[100px] resize-none text-base bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Quick Start */}
              <div className="flex-1">
                <div className="rounded-2xl border border-border/60 bg-surface-light/30 p-5 h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Szybki start</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Kliknij kategorię aby szybko przejść do ćwiczeń</p>

                  <div className="grid grid-cols-2 gap-3">
                    {QUICK_START_CATEGORIES.map((cat) => {
                      const IconComponent = cat.icon;
                      const count = categoryExerciseCounts[cat.id] || 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleQuickStart(cat.id)}
                          disabled={count === 0}
                          className={cn(
                            'group relative rounded-xl p-4 text-left transition-all duration-200',
                            'border border-border/60 bg-background',
                            'hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white mb-2',
                              cat.color
                            )}
                          >
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <p className="font-semibold text-sm">{cat.label}</p>
                          <p className="text-xs text-muted-foreground">{count} ćwiczeń</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex">
              {/* Left: Exercise picker */}
              <div className="flex-1 flex flex-col border-r border-border min-w-0">
                <div className="p-4 border-b border-border space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj ćwiczeń..."
                      className="h-11 pl-10"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_FILTERS.map((cat) => (
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

                  <p className="text-sm text-muted-foreground">{filteredExercises.length} ćwiczeń</p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {loadingExercises ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredExercises.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Dumbbell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak ćwiczeń w tej kategorii'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {filteredExercises.map((exercise) => {
                          const isSelected = selectedExerciseIds.includes(exercise.id);
                          const rawImgUrl = exercise.imageUrl || exercise.images?.[0];
                          const imageUrl = getMediaUrl(rawImgUrl);

                          return (
                            <button
                              key={exercise.id}
                              type="button"
                              onClick={() => toggleExercise(exercise)}
                              className={cn(
                                'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200',
                                isSelected
                                  ? 'bg-primary/10 ring-2 ring-primary/30'
                                  : 'bg-surface hover:bg-surface-light'
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
                                    setPreviewExercise(exercise);
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
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Selected exercises */}
              <div className="w-[400px] flex flex-col bg-surface-light/30 shrink-0">
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Wybrane ({selectedExerciseIds.length})</h3>
                    {selectedExerciseIds.length > 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Sliders className="h-3 w-3" />
                            Ustaw dla wszystkich
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
                          <DropdownMenuLabel className="text-xs">Przerwa</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => applyParamsToAll('restSets', 30)}>30s</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => applyParamsToAll('restSets', 60)}>60s</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => applyParamsToAll('restSets', 90)}>90s</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
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
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          {currentStep === 'basics' ? (
            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" onClick={handleCloseAttempt} disabled={isLoading}>
                Anuluj
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => handleCreateSet(false)}
                  disabled={!canProceedFromBasics || isLoading}
                  className="text-muted-foreground"
                >
                  {creatingSet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Utwórz pusty zestaw
                </Button>

                <Button
                  onClick={goToExercises}
                  disabled={!canProceedFromBasics}
                  className="gap-2 bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20"
                >
                  Dalej: Dodaj ćwiczenia
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" onClick={() => setCurrentStep('basics')} disabled={isLoading}>
                Wstecz
              </Button>

              <Button
                onClick={() => handleCreateSet(true)}
                disabled={isLoading}
                className="gap-2 bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Utwórz zestaw
              </Button>
            </div>
          )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewExercise?.name}</DialogTitle>
            <DialogDescription>{translateType(previewExercise?.type)}</DialogDescription>
          </DialogHeader>
          {previewExercise && (
            <div className="space-y-4">
              {(() => {
                const previewUrl = getMediaUrl(previewExercise.imageUrl || previewExercise.images?.[0]);
                return previewUrl && (
                  <div className="rounded-xl overflow-hidden aspect-video bg-surface-light">
                    <img
                      src={previewUrl}
                      alt={previewExercise.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })()}
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
                    <p className="text-xs text-muted-foreground">Czas</p>
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
