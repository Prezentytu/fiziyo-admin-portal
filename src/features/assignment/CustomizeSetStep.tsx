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
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import type { ExerciseTagsResponse, TagCategoriesResponse } from '@/types/apollo';
import type { ExercisePickerLibraryView } from '@/hooks/useExercisePickerLibrary';
import type { Exercise } from './types';
import {
  ExercisePreviewDialog,
  fromBuilderExercise,
  type ExerciseExecutionCardData,
} from '@/components/shared/exercise';

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
  library: ExercisePickerLibraryView;

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
  onPreviewExercise?: (exercise: BuilderExercise, params?: ExerciseParams) => void;
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
  library,
  organizationId,
  patientName,
  showAI = true,
  onAIClick,
  hideNameSection = false,
  onPreviewExercise,
  onCreateExercise,
  isCreatingExercise = false,
}: CustomizeSetStepProps) {
  const [previewExercise, setPreviewExercise] = useState<ExerciseExecutionCardData | null>(null);
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
  // Process tags
  const tags = useMemo(() => (tagsData as ExerciseTagsResponse)?.exerciseTags || [], [tagsData]);
  const categories = useMemo(
    () => (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [],
    [categoriesData]
  );
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
  // Podgląd z parametrami tej pozycji planu (jak w kreatorach zestawu): to zobaczy pacjent.
  const handlePreviewExercise = useCallback(
    (exercise: BuilderExercise, params?: ExerciseParams) => {
      if (onPreviewExercise) {
        onPreviewExercise(exercise, params);
        return;
      }
      setPreviewExercise(fromBuilderExercise(exercise, params ?? {}));
    },
    [onPreviewExercise]
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
        library={library}
        tags={builderTags}
        showAI={showAI}
        onAIClick={onAIClick}
        aiButtonLabel="Dobierz za mnie"
        hideNameSection={hideNameSection}
        onPreviewExercise={handlePreviewExercise}
        onCreateExercise={onCreateExercise}
        isCreatingExercise={isCreatingExercise}
        createExerciseTestId="assignment-create-exercise-tile-btn"
        testIdPrefix={testIdPrefix}
        cardSurface="patientPlan"
      />
      {!onPreviewExercise && (
        <ExercisePreviewDialog
          open={Boolean(previewExercise)}
          exercise={previewExercise}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewExercise(null);
            }
          }}
          testIdPrefix="assign-set-preview-exercise-details"
        />
      )}
    </div>
  );
}
