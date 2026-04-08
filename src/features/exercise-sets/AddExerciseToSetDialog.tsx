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
import { ADD_EXERCISE_TO_EXERCISE_SET_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import { pluralize } from '@/utils/textUtils';
import type {
  ExerciseTagsResponse,
  TagCategoriesResponse,
  OrganizationExerciseSetsResponse,
} from '@/types/apollo';

interface AddExerciseToSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseSetId: string;
  organizationId: string;
  onSuccess?: () => void;
}

export function AddExerciseToSetDialog({
  open,
  onOpenChange,
  exerciseSetId,
  organizationId,
  onSuccess,
}: Readonly<AddExerciseToSetDialogProps>) {
  const [selectedInstances, setSelectedInstances] = useState<ExerciseInstance[]>([]);
  const [exerciseParams, setExerciseParams] = useState<Map<string, ExerciseParams>>(new Map());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<ExerciseExecutionCardData | null>(null);
  const initialInstanceIdsRef = React.useRef<Set<string>>(new Set());
  const initializedFromExistingRef = React.useRef(false);

  const hasChanges = selectedInstances.some((instance) => !initialInstanceIdsRef.current.has(instance.instanceId));

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
      setSelectedInstances([]);
      setExerciseParams(new Map());
      setShowCloseConfirm(false);
      setPreviewExercise(null);
      initialInstanceIdsRef.current = new Set();
      initializedFromExistingRef.current = false;
    }
  }, [open]);

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
  const { data: setDetailsData } = useQuery(GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY, {
    variables: { exerciseSetId },
    skip: !exerciseSetId || !open,
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
    for (const set of exerciseSets) {
      for (const mapping of set.exerciseMappings || []) {
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

  useEffect(() => {
    if (!open || initializedFromExistingRef.current) {
      return;
    }

    const mappings =
      (
        setDetailsData as {
          exerciseSetById?: {
            exerciseMappings?: Array<{
              id: string;
              exerciseId: string;
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
          };
        }
      )?.exerciseSetById?.exerciseMappings || [];

    const initialInstances = mappings.map((mapping, index) => ({
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
        loadValue: mapping.loadValue ?? 0,
        loadUnit: mapping.loadUnit ?? 'kg',
        loadText: mapping.loadText ?? '',
      });
    });

    initialInstanceIdsRef.current = new Set(initialInstances.map((instance) => instance.instanceId));
    setSelectedInstances(initialInstances);
    setExerciseParams(initialParams);
    initializedFromExistingRef.current = true;
  }, [open, setDetailsData]);

  const [addExerciseToSet, { loading: adding }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);

  const handleSave = useCallback(async () => {
    const newInstances = selectedInstances.filter((instance) => !initialInstanceIdsRef.current.has(instance.instanceId));
    if (newInstances.length === 0) {
      toast.error('Dodaj przynajmniej jedno ćwiczenie');
      return;
    }

    const exerciseLookup = new Map(availableExercises.map((e) => [e.id, e]));
    const existingCount = initialInstanceIdsRef.current.size;

    try {
      for (let i = 0; i < newInstances.length; i++) {
        const instance = newInstances[i];
        const params = exerciseParams.get(instance.instanceId);
        const exercise = exerciseLookup.get(instance.exerciseId);

        await addExerciseToSet({
          variables: {
            exerciseId: instance.exerciseId,
            exerciseSetId,
            order: existingCount + i + 1,
            sets: params?.sets ?? exercise?.defaultSets ?? 3,
            reps: params?.reps ?? exercise?.defaultReps ?? 10,
            duration: params?.duration ?? exercise?.defaultDuration ?? null,
            restSets: params?.restSets ?? exercise?.defaultRestBetweenSets ?? null,
            restReps: params?.restReps ?? null,
            preparationTime: params?.preparationTime ?? null,
            executionTime: params?.executionTime ?? null,
            notes: params?.notes ?? null,
            customName: params?.customName ?? null,
            customDescription: params?.customDescription ?? null,
            tempo: params?.tempo ?? null,
            loadType: params?.loadType ?? null,
            loadValue: params?.loadValue ?? null,
            loadUnit: params?.loadUnit ?? null,
            loadText: params?.loadText ?? null,
          },
          refetchQueries: [
            {
              query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
              variables: { exerciseSetId },
            },
          ],
        });
      }

      const count = newInstances.length;
      toast.success(
        count === 1 ? 'Dodano 1 ćwiczenie do zestawu' : `Dodano ${count} ćwiczeń do zestawu`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas dodawania ćwiczeń:', error);
      toast.error('Nie udało się dodać ćwiczeń do zestawu');
    }
  }, [
    selectedInstances,
    exerciseParams,
    availableExercises,
    exerciseSetId,
    addExerciseToSet,
    onOpenChange,
    onSuccess,
  ]);

  const handlePreviewExercise = useCallback((exercise: BuilderExercise, params?: ExerciseParams) => {
    setPreviewExercise(fromBuilderExercise(exercise, params ?? {}));
  }, []);

  const newInstancesCount = selectedInstances.filter(
    (instance) => !initialInstanceIdsRef.current.has(instance.instanceId)
  ).length;

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
          data-testid="set-add-exercise-dialog"
        >
          <VisuallyHidden.Root>
            <DialogTitle>Dodaj ćwiczenia do zestawu</DialogTitle>
            <DialogDescription>
              Wybierz ćwiczenia z biblioteki i ustaw parametry. Możesz dodać to samo ćwiczenie wielokrotnie.
            </DialogDescription>
          </VisuallyHidden.Root>
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-lg font-semibold text-foreground">Dodaj ćwiczenia do zestawu</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Wybierz ćwiczenia z biblioteki i ustaw parametry. Możesz dodać to samo ćwiczenie wielokrotnie.
            </p>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ExerciseSetBuilder
              name=""
              onNameChange={() => {}}
              selectedInstances={selectedInstances}
              onSelectedInstancesChange={setSelectedInstances}
              exerciseParams={exerciseParams}
              onExerciseParamsChange={setExerciseParams}
              availableExercises={availableExercises}
              loadingExercises={loadingExercises}
              tags={builderTags}
              exercisePopularity={exercisePopularity}
              showAI={false}
              hideNameSection
              onPreviewExercise={handlePreviewExercise}
              testIdPrefix="set-add-exercise"
              readonlyInstanceIds={initialInstanceIdsRef.current}
            />
          </div>

          <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleCloseAttempt}
              className="text-muted-foreground hover:text-foreground"
              data-testid="set-add-exercise-cancel-btn"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={adding || newInstancesCount === 0}
              className="min-w-[160px]"
              data-testid="set-add-exercise-submit-btn"
            >
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {newInstancesCount === 0
                ? 'Brak nowych ćwiczeń'
                : `Dodaj ${pluralize(newInstancesCount, 'ćwiczenie', true)}`}
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
        testIdPrefix="set-add-exercise-preview"
      />
    </>
  );
}
