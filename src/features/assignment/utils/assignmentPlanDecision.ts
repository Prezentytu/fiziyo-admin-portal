import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { ExerciseOverride, ExerciseSet } from '../types';

export type AssignmentExecutionMode = 'PERSONALIZED_PLAN';

export interface AssignmentPlanDecisionInput {
  sourceSet: ExerciseSet | null;
  isCreatingNewSet: boolean;
  planName: string;
  saveAsTemplate: boolean;
  builderInstances: ExerciseInstance[];
  builderParams: Map<string, ExerciseParams>;
}

export interface AssignmentPlanDecisionResult {
  mode: AssignmentExecutionMode;
  overridesByMappingId: Record<string, Omit<ExerciseOverride, 'exerciseMappingId'>>;
}

export function decideAssignmentPlanMode({
  sourceSet: _sourceSet,
  isCreatingNewSet: _isCreatingNewSet,
  planName: _planName,
  saveAsTemplate: _saveAsTemplate,
  builderInstances: _builderInstances,
  builderParams: _builderParams,
}: AssignmentPlanDecisionInput): AssignmentPlanDecisionResult {
  return { mode: 'PERSONALIZED_PLAN', overridesByMappingId: {} };
}
