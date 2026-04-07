'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  ExerciseSetBuilder,
  type ExerciseInstance,
  type ExerciseParams,
  type BuilderExercise,
  type ExerciseTag,
} from '@/components/shared/ExerciseSetBuilder';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import type { ExerciseTagsResponse, TagCategoriesResponse, OrganizationExerciseSetsResponse } from '@/types/apollo';
import type { Exercise, ExerciseMapping } from './types';
import { ExerciseDetailsDialog } from './ExerciseDetailsDialog';

type RawExerciseTag = string | { id: string; name: string; color?: string | null };
type TaggableExercise = Exercise & { mainTags?: RawExerciseTag[]; additionalTags?: RawExerciseTag[] };

function normalizeExerciseTags(tags?: RawExerciseTag[]): ExerciseTag[] | undefined {
  if (!tags || tags.length === 0) {
    return undefined;
  }

  return tags.map((tag) =>
    typeof tag === 'string'
      ? { id: tag, name: tag }
      : {
          id: tag.id,
          name: tag.name,
          color: tag.color ?? undefined,
        }
  );
}

interface CustomizeSetStepProps {
  // Set name
  planName: string;
  onPlanNameChange: (name: string) => void;

  // Mode: creating new set vs customizing existing
  isCreatingNew: boolean;
  sourceSetName?: string;

  // Exercises state
  selectedInstances: ExerciseInstance[];
  onSelectedInstancesChange: (instances: ExerciseInstance[]) => void;
  exerciseParams: Map<string, ExerciseParams>;
  onExerciseParamsChange: (params: Map<string, ExerciseParams>) => void;

  // Available exercises from parent
  availableExercises: Exercise[];
  loadingExercises?: boolean;

  // Organization context
  organizationId: string;

  // Patient context (for AI)
  patientName?: string;

  // AI panel control
  showAI?: boolean;
  onAIClick?: () => void;

  // When true, name is rendered in parent (e.g. wizard toolbar); builder omits Name Section.
  hideNameSection?: boolean;

  // Preview exercise callback
  onPreviewExercise?: (exercise: BuilderExercise) => void;
  // Quick action - create exercise without leaving wizard
  onCreateExercise?: () => void;
  isCreatingExercise?: boolean;
}

export function CustomizeSetStep({
  planName,
  onPlanNameChange,
  isCreatingNew,
  sourceSetName,
  selectedInstances,
  onSelectedInstancesChange,
  exerciseParams,
  onExerciseParamsChange,
  availableExercises,
  loadingExercises = false,
  organizationId,
  patientName,
  showAI = true,
  onAIClick,
  hideNameSection = false,
  onPreviewExercise,
  onCreateExercise,
  isCreatingExercise = false,
}: CustomizeSetStepProps) {
  const [detailsMapping, setDetailsMapping] = useState<ExerciseMapping | null>(null);
  // Load tags for filtering
  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Load existing sets for popularity calculation
  const { data: exerciseSetsData } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Process tags
  const tags = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];
  const tagsMap = useMemo(() => createTagsMap(tags, categories), [tags, categories]);

  // Map exercises with tags for filtering
  const exercisesWithTags: BuilderExercise[] = useMemo(() => {
    const exercisesWithResolvedTags = mapExercisesWithTags(availableExercises as TaggableExercise[], tagsMap);

    return exercisesWithResolvedTags.map((exercise) => ({
      ...exercise,
      mainTags: normalizeExerciseTags(exercise.mainTags),
      additionalTags: normalizeExerciseTags(exercise.additionalTags),
    }));
  }, [availableExercises, tagsMap]);

  // Calculate exercise popularity from existing sets
  const exerciseSets = (exerciseSetsData as OrganizationExerciseSetsResponse)?.exerciseSets || [];
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

  // Convert tags to ExerciseTag format
  const builderTags: ExerciseTag[] = useMemo(() => {
    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    }));
  }, [tags]);

  // Dynamic labels based on mode
  const nameLabel = 'Nazwa planu pacjenta';
  const namePlaceholder = isCreatingNew
    ? 'np. Rehabilitacja kolana - tydzień 1'
    : patientName
      ? `Plan dla ${patientName}`
      : sourceSetName
        ? `${sourceSetName} (kopia)`
        : 'np. Rehabilitacja kolana - tydzień 1';

  const testIdPrefix = isCreatingNew ? 'create-set' : 'customize-set';
  const buildMappingForDetails = useCallback((exercise: BuilderExercise): ExerciseMapping => {
    return {
      id: `preview-${exercise.id}`,
      exerciseId: exercise.id,
      sets: exercise.defaultSets ?? exercise.sets ?? 3,
      reps: exercise.defaultReps ?? exercise.reps ?? 10,
      duration: exercise.defaultDuration ?? exercise.duration,
      restSets: exercise.defaultRestBetweenSets ?? exercise.restSets ?? 60,
      restReps: exercise.defaultRestBetweenReps ?? exercise.restReps,
      executionTime: exercise.defaultExecutionTime,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        patientDescription: exercise.patientDescription ?? exercise.description,
        side: exercise.side,
        exerciseSide: exercise.exerciseSide,
        imageUrl: exercise.imageUrl,
        thumbnailUrl: exercise.thumbnailUrl,
        images: exercise.images,
        defaultSets: exercise.defaultSets,
        defaultReps: exercise.defaultReps,
        defaultDuration: exercise.defaultDuration,
        defaultExecutionTime: exercise.defaultExecutionTime,
        defaultRestBetweenSets: exercise.defaultRestBetweenSets,
        defaultRestBetweenReps: exercise.defaultRestBetweenReps,
        mainTags: exercise.mainTags?.map((tag) => tag.name),
        additionalTags: exercise.additionalTags?.map((tag) => tag.name),
        scope: exercise.scope,
      },
    };
  }, []);

  const handlePreviewExercise = useCallback(
    (exercise: BuilderExercise) => {
      if (onPreviewExercise) {
        onPreviewExercise(exercise);
        return;
      }
      setDetailsMapping(buildMappingForDetails(exercise));
    },
    [buildMappingForDetails, onPreviewExercise]
  );

  return (
    <div className="h-full flex flex-col" data-testid={`${testIdPrefix}-step`}>
      <ExerciseSetBuilder
        name={planName}
        onNameChange={onPlanNameChange}
        namePlaceholder={namePlaceholder}
        nameLabel={nameLabel}
        selectedInstances={selectedInstances}
        onSelectedInstancesChange={onSelectedInstancesChange}
        exerciseParams={exerciseParams}
        onExerciseParamsChange={onExerciseParamsChange}
        availableExercises={exercisesWithTags}
        loadingExercises={loadingExercises}
        tags={builderTags}
        exercisePopularity={exercisePopularity}
        showAI={showAI}
        onAIClick={onAIClick}
        aiButtonLabel="Dobierz za mnie"
        hideNameSection={hideNameSection}
        onPreviewExercise={handlePreviewExercise}
        onCreateExercise={onCreateExercise}
        isCreatingExercise={isCreatingExercise}
        createExerciseTestId="assignment-create-exercise-tile-btn"
        testIdPrefix={testIdPrefix}
      />
      {!onPreviewExercise && (
        <ExerciseDetailsDialog
          open={Boolean(detailsMapping)}
          mapping={detailsMapping}
          onOpenChange={(open) => {
            if (!open) {
              setDetailsMapping(null);
            }
          }}
        />
      )}
    </div>
  );
}
