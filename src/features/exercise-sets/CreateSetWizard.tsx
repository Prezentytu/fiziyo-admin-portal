'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Search,
  Loader2,
  Dumbbell,
  Check,
  Plus,
  GripVertical,
  ChevronDown,
  Eye,
  TrendingUp,
  Sparkles,
  Timer,
  Pencil,
  X,
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
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';
import { countBySource, filterExercisesBySource, type ExerciseSourceFilter } from '@/utils/exerciseSourceFilter';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { ExerciseExecutionCard, fromBuilderExercise, buildExerciseImageUrls } from '@/components/shared/exercise';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { aiService } from '@/services/aiService';

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
  scope?: string;
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
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ExerciseSourceFilter>('all');
  const [selectedInstances, setSelectedInstances] = useState<ExerciseInstance[]>([]);
  const [exerciseParams, setExerciseParams] = useState<Map<string, ExerciseParams>>(new Map());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [instanceToRemove, setInstanceToRemove] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);

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
      setSourceFilter('all');
      setSelectedInstances([]);
      setExerciseParams(new Map());
      setShowCloseConfirm(false);
      setShowClearConfirm(false);
      setInstanceToRemove(null);
      setPreviewExercise(null);
      setIsGeneratingName(false);
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

  const filteredExercises = useMemo(() => {
    let result = filterExercisesBySource(exercises, sourceFilter);

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
  }, [exercises, searchQuery, sourceFilter, getExerciseTags]);

  const { totalCount, organizationCount, fiziyoCount } = useMemo(() => {
    const counts = countBySource(exercises);
    return {
      totalCount: counts.total,
      organizationCount: counts.organization,
      fiziyoCount: counts.fiziyo,
    };
  }, [exercises]);

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

  const handleConfirmClear = useCallback(() => {
    setSelectedInstances([]);
    setExerciseParams(new Map());
    setShowClearConfirm(false);
  }, []);

  const handleConfirmRemoveInstance = useCallback(() => {
    if (!instanceToRemove) return;
    removeInstance(instanceToRemove);
    setInstanceToRemove(null);
  }, [instanceToRemove, removeInstance]);

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

  // AI name suggestion (without opening assistant panel)
  const handleGenerateAIName = useCallback(async () => {
    if (selectedInstances.length === 0) {
      toast.error('Dodaj przynajmniej jedno ćwiczenie, aby AI mogło zasugerować nazwę');
      return;
    }

    try {
      setIsGeneratingName(true);

      const exerciseNames = selectedInstances
        .map((instance) => exercises.find((exercise) => exercise.id === instance.exerciseId)?.name)
        .filter((exerciseName): exerciseName is string => Boolean(exerciseName));

      const response = await aiService.suggestSetName(name, exerciseNames);
      if (response?.suggestedName) {
        setName(response.suggestedName);
        toast.success('Nazwa została wygenerowana');
        return;
      }

      toast.error('AI nie zwróciło poprawnej nazwy');
    } catch (error) {
      console.error('Błąd generowania nazwy zestawu:', error);
      toast.error('Nie udało się wygenerować nazwy');
    } finally {
      setIsGeneratingName(false);
    }
  }, [exercises, name, selectedInstances]);

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
    } catch (error) {
      console.error('Błąd tworzenia zestawu:', error);
      toast.error('Nie udało się utworzyć zestawu');
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-7xl w-[98vw] max-h-[95vh] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface border-border"
        hideCloseButton
        data-testid="set-composer"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Nowy zestaw ćwiczeń</DialogTitle>
        </VisuallyHidden.Root>
        {/* Nagłówek: ta sama geometria co AssignmentWizard (eyebrow + input row + dolny spacer) */}
        <div className="shrink-0 bg-surface/95 backdrop-blur-sm border-b border-border">
          <div className="px-6">
            <div className="h-7 flex items-end pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 leading-none">
                Nazwa zestawu
              </span>
            </div>
            <div className="h-11 flex items-center gap-0 -mx-1">
              <div className="w-full lg:w-[40%] min-w-0 pr-3 flex items-center gap-1">
                <label className="flex-1 flex h-9 items-center min-w-0 rounded-md border border-transparent px-1.5 focus-within:bg-surface focus-within:border-border focus-within:ring-1 focus-within:ring-primary/20 transition-colors cursor-text hover:bg-surface-light/50">
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="np. Rehabilitacja kolana - tydzień 1"
                    autoFocus
                    autoComplete="off"
                    data-testid="set-composer-name-input"
                    className="peer flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 border-none p-0 cursor-text"
                  />
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 ml-2 peer-focus:hidden transition-opacity pointer-events-none" aria-hidden />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleGenerateAIName(); }}
                    title="Wygeneruj nazwę AI"
                    className={cn(
                      'p-1.5 rounded-md shrink-0 transition-colors ml-1 relative z-10',
                      isGeneratingName
                        ? 'text-muted-foreground cursor-not-allowed opacity-50'
                        : 'text-muted-foreground hover:text-secondary hover:bg-secondary/10'
                    )}
                    data-testid="set-composer-ai-btn"
                    aria-label="Wygeneruj nazwę AI"
                    disabled={isGeneratingName}
                  >
                    {isGeneratingName ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </button>
                </label>
              </div>
              <div className="flex-1 flex items-center justify-end gap-3 min-w-0 pl-3">
                {patientContext && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                    <span>Dla:</span>
                    <span className="font-medium text-foreground">{patientContext.patientName}</span>
                    {autoAssign && (
                      <Badge variant="secondary" className="text-[9px] bg-surface-light border-border text-muted-foreground">
                        Auto-przypisanie
                      </Badge>
                    )}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseAttempt}
                  className="h-9 w-9 min-w-9 shrink-0 text-muted-foreground hover:text-foreground rounded-md"
                  aria-label="Zamknij"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Row 3: Bottom spacer + Collapsible trigger (idealne wykorzystanie przestrzeni h-7 i wyrównanie) */}
            <Collapsible open={showDescription} onOpenChange={setShowDescription}>
              <div className="h-7 flex items-start -mx-1">
                <div className="w-full lg:w-[40%] pr-3 px-1.5 flex items-start">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary pt-0.5"
                    >
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDescription && 'rotate-180')} />
                      {description ? 'Edytuj opis' : 'Dodaj opis'}
                    </button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent>
                <div className="pb-5 pt-1 -mx-1">
                  <div className="w-full lg:w-[40%] pr-3 px-1.5">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Opisz cel zestawu (np. wzmocnienie mięśnia czworogłowego)..."
                      className="h-[68px] min-h-[68px] text-sm resize-none bg-surface border-border placeholder:text-muted-foreground/50 w-full focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                      data-testid="set-composer-description-input"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN CONTENT - Split view */}
        {/* ============================================================ */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN - Library (40%) */}
          <div className="w-full lg:w-[40%] flex flex-col border-r border-border min-w-0">
            {/* Search header */}
            <div className="h-[72px] px-6 py-4 border-b border-border flex items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Szukaj ćwiczeń..."
                  className="h-10 pl-10 bg-surface border-border placeholder:text-muted-foreground/50"
                  data-testid="set-composer-search-input"
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
                  data-testid="set-composer-filter-all"
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
                  data-testid="set-composer-filter-organization"
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
                  data-testid="set-composer-filter-fiziyo"
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
                      {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak ćwiczeń'}
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
                      {!searchQuery && sourceFilter === 'all' && popularExercises.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-semibold">Wszystkie ćwiczenia</h4>
                        </div>
                      )}
                      <div className="grid gap-2">
                        {(() => {
                          // Exclude popular exercises when showing popular section
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
                          onPreview={() => setPreviewExercise(data.exercise)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

        </div>

        {/* ============================================================ */}
        {/* FOOTER */}
        {/* ============================================================ */}
        <div className="px-6 py-4 border-t border-border bg-surface shrink-0 flex items-center justify-between gap-3">
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
