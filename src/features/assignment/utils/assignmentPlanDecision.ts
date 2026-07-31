import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { ExerciseOverride, ExerciseSet } from '../types';
import {
  buildAssignmentOverrideDeltasFromBuilder,
  type OverrideBaselineExercise,
} from './buildAssignmentOverrideDeltas';

export type AssignmentExecutionMode = 'PERSONALIZED_PLAN';

export interface AssignmentPlanDecisionInput {
  sourceSet: ExerciseSet | null;
  isCreatingNewSet: boolean;
  planName: string;
  saveAsTemplate: boolean;
  builderInstances: ExerciseInstance[];
  builderParams: Map<string, ExerciseParams>;
  availableExercises?: OverrideBaselineExercise[];
}

export interface AssignmentPlanDecisionResult {
  mode: AssignmentExecutionMode;
  /** Keyed by builder instanceId until remapped to mapping.id after create. */
  overridesByMappingId: Record<string, Omit<ExerciseOverride, 'exerciseMappingId'>>;
  customizedCount: number;
}

export function decideAssignmentPlanMode({
  sourceSet: _sourceSet,
  isCreatingNewSet: _isCreatingNewSet,
  planName: _planName,
  saveAsTemplate: _saveAsTemplate,
  builderInstances,
  builderParams,
  availableExercises = [],
}: AssignmentPlanDecisionInput): AssignmentPlanDecisionResult {
  const overridesByMappingId = buildAssignmentOverrideDeltasFromBuilder(
    builderInstances,
    builderParams,
    availableExercises
  );

  return {
    mode: 'PERSONALIZED_PLAN',
    overridesByMappingId,
    customizedCount: Object.keys(overridesByMappingId).length,
  };
}
