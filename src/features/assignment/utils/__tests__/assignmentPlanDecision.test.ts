import { describe, expect, it } from 'vitest';
import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { ExerciseSet } from '../../types';
import { decideAssignmentPlanMode } from '../assignmentPlanDecision';

function buildSourceSet(): ExerciseSet {
  return {
    id: 'set-1',
    name: 'Szablon kregoslup',
    kind: 'TEMPLATE',
    isTemplate: true,
    exerciseMappings: [
      {
        id: 'm1',
        exerciseId: 'e1',
        order: 1,
        sets: 3,
        reps: 10,
        exercise: {
          id: 'e1',
          name: 'Cwiczenie 1',
          defaultSets: 3,
          defaultReps: 10,
          defaultRestBetweenSets: 60,
        },
      },
      {
        id: 'm2',
        exerciseId: 'e2',
        order: 2,
        sets: 4,
        reps: 12,
        exercise: {
          id: 'e2',
          name: 'Cwiczenie 2',
          defaultSets: 4,
          defaultReps: 12,
          defaultRestBetweenSets: 60,
        },
      },
    ],
  };
}

function buildInstances(): ExerciseInstance[] {
  return [
    { instanceId: 'existing-m1', exerciseId: 'e1' },
    { instanceId: 'existing-m2', exerciseId: 'e2' },
  ];
}

function buildParams(overrides: Record<string, ExerciseParams> = {}): Map<string, ExerciseParams> {
  const params = new Map<string, ExerciseParams>();
  params.set('existing-m1', { sets: 3, reps: 10 });
  params.set('existing-m2', { sets: 4, reps: 12 });

  Object.entries(overrides).forEach(([instanceId, patch]) => {
    params.set(instanceId, { ...(params.get(instanceId) || {}), ...patch });
  });

  return params;
}

describe('decideAssignmentPlanMode', () => {
  it('returns UNCHANGED_TEMPLATE when only schedule-level context changes and exercises are unchanged', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: buildInstances(),
      builderParams: buildParams(),
    });

    expect(result.mode).toBe('UNCHANGED_TEMPLATE');
    expect(result.overridesByMappingId).toEqual({});
  });

  it('returns TEMPLATE_WITH_PARAM_OVERRIDES when only execution parameters are changed', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: buildInstances(),
      builderParams: buildParams({ 'existing-m1': { sets: 5, restSets: 90 } }),
    });

    expect(result.mode).toBe('TEMPLATE_WITH_PARAM_OVERRIDES');
    expect(result.overridesByMappingId.m1?.sets).toBe(5);
    expect(result.overridesByMappingId.m1?.restSets).toBe(90);
  });

  it('returns PERSONALIZED_PLAN when order is changed', () => {
    const swappedInstances: ExerciseInstance[] = [
      { instanceId: 'existing-m2', exerciseId: 'e2' },
      { instanceId: 'existing-m1', exerciseId: 'e1' },
    ];

    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: swappedInstances,
      builderParams: buildParams(),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
  });

  it('returns PERSONALIZED_PLAN when plan name is changed', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Plan dla pacjenta Jan',
      saveAsTemplate: false,
      builderInstances: buildInstances(),
      builderParams: buildParams(),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
  });

  it('returns PERSONALIZED_PLAN when exercise custom name is changed', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: buildInstances(),
      builderParams: buildParams({ 'existing-m1': { customName: 'Nowa nazwa cwiczenia' } }),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
  });
});
