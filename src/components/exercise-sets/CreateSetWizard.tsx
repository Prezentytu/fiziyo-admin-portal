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
  GripVertical,
  ChevronDown,
  Eye,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { ExerciseExecutionCard, fromBuilderExercise, buildExerciseImageUrls } from '@/components/shared/exercise';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { AISetGenerator } from './AISetGenerator';

import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
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
// EXERCISE PICKER ITEM
// ============================================================

function ExercisePickerItem({
  exercise,
  instanceCount,
  onAdd,
  onPreview,
  getExerciseTags,
  badge: _badge,
}: {
  exercise: Exercise;
  instanceCount: number;
  onAdd: () => void;
  onPreview: () => void;
  getExerciseTags: (ex: Exercise) => ExerciseTag[];
  badge?: string;
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
      <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 relative group bg-surface-light border border-border/60">
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
// SORTABLE EXERCISE CARD - INLINE PARAMS EDITING
// ============================================================

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instanceId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardData = useMemo(
    () => fromBuilderExercise(exercise, params),
    [exercise, params]
  );

  const handleChange = useCallback(
    (patch: Partial<ExerciseExecutionCardData>) => {
      if (patch.sets !== undefined) onUpdateParams('sets', patch.sets);
      if (patch.reps !== undefined) onUpdateParams('reps', patch.reps);
      if (patch.duration !== undefined) onUpdateParams('duration', patch.duration);
      if (patch.executionTime !== undefined) onUpdateParams('executionTime', patch.executionTime);
      if (patch.restSets !== undefined) onUpdateParams('restSets', patch.restSets);
      if (patch.restReps !== undefined) onUpdateParams('restReps', patch.restReps ?? 0);
      if (patch.tempo !== undefined) onUpdateParams('tempo', patch.tempo);
      if (patch.notes !== undefined) onUpdateParams('notes', patch.notes);
      if (patch.customName !== undefined) onUpdateParams('customName', patch.customName);
      if (patch.customDescription !== undefined) onUpdateParams('customDescription', patch.customDescription);
      if (patch.side !== undefined) onUpdateParams('exerciseSide', patch.side);
      if (patch.loadKg !== undefined) {
        onUpdateParams('loadValue', patch.loadKg ?? 0);
        onUpdateParams('loadUnit', 'kg');
      }
    },
    [onUpdateParams]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'min-w-0 transition-all',
        isDragging && 'shadow-lg opacity-70 z-50'
      )}
    >
      <ExerciseExecutionCard
        mode="edit"
        exercise={cardData}
        onChange={handleChange}
        onRemove={onRemove}
        onPreview={onPreview}
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-surface-light cursor-grab active:cursor-grabbing touch-none shrink-0"
            type="button"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          </button>
        }
        index={index + 1}
        testIdPrefix="set-create-wizard"
      />
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

  // Clear preview when exercise has no images (avoid leaving lightbox closed but state set)
  useEffect(() => {
    if (previewExercise && buildExerciseImageUrls(previewExercise).length === 0) {
      setPreviewExercise(null);
    }
  }, [previewExercise]);

  // GraphQL queries
  const { data: exercisesData, loading: loadingExercises } = useQuery(GET_AVAILABLE_EXERCISES_QUERY, {
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

  const { data: exerciseSetsData, refetch: refetchExerciseSets } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
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
  const [createSet, { loading: creatingSet }] = useMutation(CREATE_EXERCISE_SET_MUTATION);

  const [addExercise, { loading: addingExercises }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const [assignSetToPatient, { loading: assigning }] = useMutation(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION);

  // Process data
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];
  const tagsMap = useMemo(() => createTagsMap(tags, categories), [tags, categories]);
  const exerciseSets = (exerciseSetsData as OrganizationExerciseSetsResponse)?.exerciseSets || [];

  const exercises: Exercise[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawExercises = (exercisesData as { availableExercises?: any[] })?.availableExercises || [];
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
      setExerciseParams((prev) => {
        const next = new Map(prev);
        const instance = selectedInstances.find((i) => i.instanceId === instanceId);
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

  const addExerciseToSet = useCallback(
    (exercise: Exercise) => {
      const instanceId = `${exercise.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      setSelectedInstances((prev) => [...prev, { instanceId, exerciseId: exercise.id }]);

      setExerciseParams((prev) => {
        const next = new Map(prev);
        next.set(instanceId, getDefaultParams(exercise));
        return next;
      });
    },
    [getDefaultParams]
  );

  const removeInstance = useCallback((instanceId: string) => {
    setSelectedInstances((prev) => prev.filter((i) => i.instanceId !== instanceId));
    setExerciseParams((prev) => {
      const next = new Map(prev);
      next.delete(instanceId);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedInstances((items) => {
        const oldIndex = items.findIndex((i) => i.instanceId === active.id);
        const newIndex = items.findIndex((i) => i.instanceId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // AI integration
  const handleAISelectExercises = useCallback(
    (exerciseIds: string[]) => {
      for (const id of exerciseIds) {
        const exercise = exercises.find((e) => e.id === id);
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
      .filter((item): item is { instanceId: string; exerciseId: string; exercise: Exercise } => item !== null);
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

      // Refresh exercise sets cache after all exercises are added
      await refetchExerciseSets();

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
              <DialogTitle className="text-lg font-semibold text-foreground">Nowy zestaw ćwiczeń</DialogTitle>
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
                              instanceCount={selectedInstances.filter((si) => si.exerciseId === exercise.id).length}
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
          <div className="hidden lg:flex lg:flex-1 flex-col bg-surface/30 overflow-hidden min-w-0">
            {/* Header with Hero Duration */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
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
                  onClick={() => setSelectedInstances([])}
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
          <div
            className={cn(
              'absolute inset-y-0 right-0 w-full sm:w-[400px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out',
              showAIPanel ? 'translate-x-0' : 'translate-x-full'
            )}
          >
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
              'px-8 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            data-testid="set-composer-create-btn"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
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

      {/* Exercise image gallery lightbox */}
      {previewExercise && (() => {
        const gallery = buildExerciseImageUrls(previewExercise);
        if (gallery.length === 0) return null;
        return (
          <ImageLightbox
            src={gallery[0]}
            alt={previewExercise.name}
            open={true}
            onOpenChange={(open) => !open && setPreviewExercise(null)}
            images={gallery}
          />
        );
      })()}
    </Dialog>
  );
}
