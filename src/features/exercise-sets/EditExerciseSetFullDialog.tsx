'use client';

import * as React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  ExerciseSetBuilder,
  type ExerciseInstance,
  type ExerciseParams,
  type BuilderExercise,
  type ExerciseTag,
} from '@/components/shared/ExerciseSetBuilder';
import {
  ExercisePreviewDialog,
  fromBuilderExercise,
  type ExerciseExecutionCardData,
} from '@/components/shared/exercise';

import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import {
  GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
  GET_ORGANIZATION_EXERCISE_SETS_QUERY,
} from '@/graphql/queries/exerciseSets.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import {
  UPDATE_EXERCISE_SET_MUTATION,
  UPDATE_EXERCISE_IN_SET_MUTATION,
  REMOVE_EXERCISE_FROM_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import type {
  ExerciseTagsResponse,
  TagCategoriesResponse,
  OrganizationExerciseSetsResponse,
} from '@/types/apollo';
import {
  computeExerciseSetDiff,
  hasExerciseSetChanges,
  type InitialMapping,
} from '@/features/exercise-sets/utils/exerciseSetDiff';

interface SetSnapshot {
  id: string;
  name: string;
  description?: string | null;
  exerciseMappings?: Array<{
    id: string;
    exerciseId: string;
    order?: number;
    sets?: number;
    reps?: number;
    duration?: number;
    restSets?: number;
    restReps?: number;
    preparationTime?: number;
    executionTime?: number;
    notes?: string;
    customName?: string;
    customDescription?: string;
    tempo?: string;
    loadType?: string;
    loadValue?: number;
    loadUnit?: string;
    loadText?: string;
  }>;
}

interface EditExerciseSetFullDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseSetId: string;
  organizationId: string;
  set: SetSnapshot | null;
  onSuccess?: () => void;
}

export function EditExerciseSetFullDialog({
  open,
  onOpenChange,
  exerciseSetId,
  organizationId,
  set,
  onSuccess,
}: Readonly<EditExerciseSetFullDialogProps>) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedInstances, setSelectedInstances] = useState<ExerciseInstance[]>([]);
  const [exerciseParams, setExerciseParams] = useState<Map<string, ExerciseParams>>(new Map());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<ExerciseExecutionCardData | null>(null);
  const initialMappingsRef = React.useRef<InitialMapping[]>([]);
  const initialNameRef = React.useRef('');
  const initialDescriptionRef = React.useRef('');
  const initializedRef = React.useRef(false);

  const diff = useMemo(
    () =>
      computeExerciseSetDiff({
        initialMappings: initialMappingsRef.current,
        selectedInstances,
        exerciseParams,
      }),
    [selectedInstances, exerciseParams]
  );

  const hasChanges = hasExerciseSetChanges({
    name,
    description,
    initialName: initialNameRef.current,
    initialDescription: initialDescriptionRef.current,
    diff,
  });

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
    if (!open) {
      initializedRef.current = false;
      return;
    }
    setShowCloseConfirm(false);
    setPreviewExercise(null);
    if (!set) return;

    const mappings = set.exerciseMappings ?? [];
    initialMappingsRef.current = mappings.map((m) => ({
      id: m.id,
      exerciseId: m.exerciseId,
      order: m.order,
      sets: m.sets,
      reps: m.reps,
      duration: m.duration,
      restSets: m.restSets,
      restReps: m.restReps,
      preparationTime: m.preparationTime,
      executionTime: m.executionTime,
      notes: m.notes,
      customName: m.customName,
      customDescription: m.customDescription,
      tempo: m.tempo,
      loadType: m.loadType,
      loadValue: m.loadValue,
      loadUnit: m.loadUnit,
      loadText: m.loadText,
    }));
    initialNameRef.current = set.name ?? '';
    initialDescriptionRef.current = set.description ?? '';

    setName(set.name ?? '');
    setDescription(set.description ?? '');
    const initialInstances: ExerciseInstance[] = mappings.map((mapping, index) => ({
      instanceId: `existing-${mapping.id}-${index}`,
      exerciseId: mapping.exerciseId,
    }));
    const initialParams = new Map<string, ExerciseParams>();
    initialInstances.forEach((instance, index) => {
      const mapping = mappings[index];
      initialParams.set(instance.instanceId, {
        sets: mapping.sets,
        reps: mapping.reps,
        duration: mapping.duration,
        restSets: mapping.restSets,
        restReps: mapping.restReps,
        preparationTime: mapping.preparationTime,
        executionTime: mapping.executionTime,
        notes: mapping.notes ?? '',
        customName: mapping.customName ?? '',
        customDescription: mapping.customDescription ?? '',
        tempo: mapping.tempo ?? '',
        loadType: mapping.loadType ?? '',
        loadValue: mapping.loadValue ?? undefined,
        loadUnit: mapping.loadUnit ?? 'kg',
        loadText: mapping.loadText ?? '',
      });
    });
    setSelectedInstances(initialInstances);
    setExerciseParams(initialParams);
    initializedRef.current = true;
  }, [open, set]);

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

  const { data: exerciseSetsData } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const tags = useMemo(() => (tagsData as ExerciseTagsResponse)?.exerciseTags || [], [tagsData]);
  const categories = useMemo(
    () => (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [],
    [categoriesData]
  );
  const tagsMap = useMemo(() => createTagsMap(tags, categories), [tags, categories]);

  const rawAvailableExercises = useMemo(() => {
    const data = exercisesData as { availableExercises?: Record<string, unknown>[] } | undefined;
    return (data?.availableExercises || []).filter((ex) => (ex as { isActive?: boolean }).isActive !== false);
  }, [exercisesData]);

  const availableExercises: BuilderExercise[] = useMemo(() => {
    return mapExercisesWithTags(
      rawAvailableExercises.map((raw) => ({
        id: raw.id as string,
        name: raw.name as string,
        type: raw.type as string | undefined,
        patientDescription: (raw.patientDescription ?? raw.description) as string | undefined,
        side: raw.side as string | undefined,
        thumbnailUrl: raw.thumbnailUrl as string | undefined,
        imageUrl: raw.imageUrl as string | undefined,
        images: raw.images as string[] | undefined,
        videoUrl: raw.videoUrl as string | undefined,
        defaultSets: raw.defaultSets as number | undefined,
        defaultReps: raw.defaultReps as number | undefined,
        defaultDuration: raw.defaultDuration as number | undefined,
        defaultRestBetweenSets: raw.defaultRestBetweenSets as number | undefined,
        defaultRestBetweenReps: raw.defaultRestBetweenReps as number | undefined,
        defaultExecutionTime: raw.defaultExecutionTime as number | undefined,
        description: (raw.patientDescription ?? raw.description) as string | undefined,
        sets: raw.sets as number | undefined,
        reps: raw.reps as number | undefined,
        duration: raw.duration as number | undefined,
        restSets: raw.restSets as number | undefined,
        restReps: raw.restReps as number | undefined,
        exerciseSide: (raw.side as string)?.toLowerCase() ?? (raw.exerciseSide as string) ?? undefined,
        mainTags: raw.mainTags as (string | ExerciseTag)[] | undefined,
        additionalTags: raw.additionalTags as (string | ExerciseTag)[] | undefined,
        scope: raw.scope as string | undefined,
      })),
      tagsMap
    ) as BuilderExercise[];
  }, [rawAvailableExercises, tagsMap]);

  const exerciseSets = useMemo(
    () => (exerciseSetsData as OrganizationExerciseSetsResponse)?.exerciseSets || [],
    [exerciseSetsData]
  );
  const exercisePopularity = useMemo(() => {
    const popularity: Record<string, number> = {};
    for (const s of exerciseSets) {
      for (const mapping of s.exerciseMappings || []) {
        if (mapping.exerciseId) {
          popularity[mapping.exerciseId] = (popularity[mapping.exerciseId] || 0) + 1;
        }
      }
    }
    return popularity;
  }, [exerciseSets]);

  const builderTags: ExerciseTag[] = useMemo(
    () => tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    [tags]
  );

  const [updateSet, { loading: updatingSet }] = useMutation(UPDATE_EXERCISE_SET_MUTATION);
  const [updateExerciseInSet, { loading: updatingExercise }] = useMutation(UPDATE_EXERCISE_IN_SET_MUTATION);
  const [removeExerciseFromSet] = useMutation(REMOVE_EXERCISE_FROM_SET_MUTATION);
  const [addExerciseToSet] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const saving = updatingSet || updatingExercise;

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Podaj nazwę zestawu');
      return;
    }

    const saveDiff = computeExerciseSetDiff({
      initialMappings: initialMappingsRef.current,
      selectedInstances,
      exerciseParams,
    });

    const exerciseLookup = new Map(availableExercises.map((e) => [e.id, e]));

    try {
      const descriptionChanged = (description ?? '') !== initialDescriptionRef.current;
      if (trimmedName !== initialNameRef.current || descriptionChanged) {
        await updateSet({
          variables: {
            exerciseSetId,
            name: trimmedName,
            description: (description ?? '').trim() || null,
          },
          refetchQueries: [
            { query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY, variables: { exerciseSetId } },
          ],
        });
      }

      for (const item of saveDiff.toRemove) {
        await removeExerciseFromSet({
          variables: { exerciseId: item.exerciseId, exerciseSetId },
          refetchQueries: [
            { query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY, variables: { exerciseSetId } },
          ],
        });
      }

      for (const item of saveDiff.toUpdate) {
        const params = item.params;
        const exercise = exerciseLookup.get(item.exerciseId);
        await updateExerciseInSet({
          variables: {
            exerciseId: item.exerciseId,
            exerciseSetId,
            order: item.order,
            sets: params.sets ?? exercise?.defaultSets ?? 3,
            reps: params.reps ?? exercise?.defaultReps ?? 10,
            duration: params.duration ?? exercise?.defaultDuration ?? null,
            restSets: params.restSets ?? exercise?.defaultRestBetweenSets ?? null,
            restReps: params.restReps ?? null,
            preparationTime: params.preparationTime ?? null,
            executionTime: params.executionTime ?? null,
            notes: params.notes ?? null,
            customName: params.customName ?? null,
            customDescription: params.customDescription ?? null,
            tempo: params.tempo ?? null,
            loadType: params.loadType ?? null,
            loadValue: params.loadValue ?? null,
            loadUnit: params.loadUnit ?? null,
            loadText: params.loadText ?? null,
          },
          refetchQueries: [
            { query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY, variables: { exerciseSetId } },
          ],
        });
      }

      for (const item of saveDiff.toAdd) {
        const params = item.params;
        const exercise = exerciseLookup.get(item.exerciseId);
        await addExerciseToSet({
          variables: {
            exerciseId: item.exerciseId,
            exerciseSetId,
            order: item.order,
            sets: params.sets ?? exercise?.defaultSets ?? 3,
            reps: params.reps ?? exercise?.defaultReps ?? 10,
            duration: params.duration ?? exercise?.defaultDuration ?? null,
            restSets: params.restSets ?? exercise?.defaultRestBetweenSets ?? null,
            restReps: params.restReps ?? null,
            preparationTime: params.preparationTime ?? null,
            executionTime: params.executionTime ?? null,
            notes: params.notes ?? null,
            customName: params.customName ?? null,
            customDescription: params.customDescription ?? null,
            tempo: params.tempo ?? null,
            loadType: params.loadType ?? null,
            loadValue: params.loadValue ?? null,
            loadUnit: params.loadUnit ?? null,
            loadText: params.loadText ?? null,
          },
          refetchQueries: [
            { query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY, variables: { exerciseSetId } },
          ],
        });
      }

      toast.success('Zestaw został zapisany');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas zapisywania zestawu:', error);
      toast.error('Nie udało się zapisać zestawu');
    }
  }, [
    name,
    description,
    selectedInstances,
    exerciseParams,
    availableExercises,
    exerciseSetId,
    updateSet,
    updateExerciseInSet,
    removeExerciseFromSet,
    addExerciseToSet,
    onOpenChange,
    onSuccess,
  ]);

  const handlePreviewExercise = useCallback((exercise: BuilderExercise, params?: ExerciseParams) => {
    setPreviewExercise(fromBuilderExercise(exercise, params ?? {}));
  }, []);

  const canSave = name.trim().length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
        <DialogContent
          className="max-w-7xl w-[98vw] max-h-[95vh] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleCloseAttempt();
          }}
          data-testid="set-edit-full-dialog"
        >
          <VisuallyHidden.Root>
            <DialogTitle>Edytuj zestaw</DialogTitle>
            <DialogDescription>
              Zmień nazwę zestawu oraz listę i parametry ćwiczeń. Możesz dodawać, usuwać i zmieniać kolejność.
            </DialogDescription>
          </VisuallyHidden.Root>
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-lg font-semibold text-foreground">Edytuj zestaw</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Zmień nazwę zestawu oraz listę i parametry ćwiczeń. Możesz dodawać, usuwać i zmieniać kolejność.
            </p>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ExerciseSetBuilder
              name={name}
              onNameChange={setName}
              namePlaceholder="Nazwa zestawu"
              description={description}
              onDescriptionChange={setDescription}
              descriptionPlaceholder="Opis zestawu (opcjonalnie)"
              selectedInstances={selectedInstances}
              onSelectedInstancesChange={setSelectedInstances}
              exerciseParams={exerciseParams}
              onExerciseParamsChange={setExerciseParams}
              availableExercises={availableExercises}
              loadingExercises={loadingExercises}
              tags={builderTags}
              exercisePopularity={exercisePopularity}
              showAI={false}
              onPreviewExercise={handlePreviewExercise}
              testIdPrefix="set-edit-full"
            />
          </div>

          <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleCloseAttempt}
              className="text-muted-foreground hover:text-foreground"
              data-testid="set-edit-full-cancel-btn"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="min-w-[160px]"
              data-testid="set-edit-full-submit-btn"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Zapisz zmiany
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      <ExercisePreviewDialog
        open={previewExercise !== null}
        exercise={previewExercise}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPreviewExercise(null);
        }}
        testIdPrefix="set-edit-full-preview"
      />
    </>
  );
}
