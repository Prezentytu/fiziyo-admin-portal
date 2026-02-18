'use client';

import { useMemo } from 'react';
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
import type { Exercise } from './types';

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

  // Preview exercise callback
  onPreviewExercise?: (exercise: BuilderExercise) => void;
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
  onPreviewExercise,
}: CustomizeSetStepProps) {
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
    return mapExercisesWithTags(availableExercises, tagsMap);
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
  const nameLabel = isCreatingNew ? 'Nazwa nowego zestawu' : 'Nazwa planu dla pacjenta';
  const namePlaceholder = isCreatingNew
    ? 'np. Rehabilitacja kolana - tydzień 1'
    : patientName
      ? `Plan dla ${patientName}`
      : sourceSetName
        ? `${sourceSetName} (kopia)`
        : 'np. Rehabilitacja kolana - tydzień 1';

  const testIdPrefix = isCreatingNew ? 'create-set' : 'customize-set';

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
        onPreviewExercise={onPreviewExercise}
        testIdPrefix={testIdPrefix}
      />
    </div>
  );
}
