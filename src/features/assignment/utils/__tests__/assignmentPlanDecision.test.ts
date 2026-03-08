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
    const existingParams = params.get(instanceId);
    params.set(instanceId, existingParams ? { ...existingParams, ...patch } : { ...patch });
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

  it('returns TEMPLATE_WITH_PARAM_OVERRIDES and maps text/load fields for assignment overrides', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: buildInstances(),
      builderParams: buildParams({
        'existing-m2': {
          notes: '  Delikatnie  ',
          tempo: '2-1-2-1',
          load: { type: 'weight', value: 5, unit: 'kg', text: '5 kg' },
        },
      }),
    });

    expect(result.mode).toBe('TEMPLATE_WITH_PARAM_OVERRIDES');
    expect(result.overridesByMappingId.m2?.notes).toBe('Delikatnie');
    expect(result.overridesByMappingId.m2?.tempo).toBe('2-1-2-1');
    expect(result.overridesByMappingId.m2?.load).toEqual({
      type: 'weight',
      value: 5,
      unit: 'kg',
      text: '5 kg',
    });
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

  it('returns PERSONALIZED_PLAN when custom description is changed', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: buildInstances(),
      builderParams: buildParams({ 'existing-m1': { customDescription: 'Nowy opis cwiczenia' } }),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
  });

  it('returns PERSONALIZED_PLAN when user chooses saveAsTemplate', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: true,
      builderInstances: buildInstances(),
      builderParams: buildParams(),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
  });

  it('returns PERSONALIZED_PLAN when source is not a template', () => {
    const sourceSet: ExerciseSet = {
      ...buildSourceSet(),
      kind: 'PATIENT_PLAN',
      isTemplate: false,
    };

    const result = decideAssignmentPlanMode({
      sourceSet,
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: buildInstances(),
      builderParams: buildParams(),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
  });

  it('returns PERSONALIZED_PLAN when builder has added/removed exercise', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: [{ instanceId: 'existing-m1', exerciseId: 'e1' }],
      builderParams: buildParams(),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
  });

  it('returns PERSONALIZED_PLAN for unsupported override fields (exerciseSide/preparationTime)', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: buildSourceSet(),
      isCreatingNewSet: false,
      planName: 'Szablon kregoslup',
      saveAsTemplate: false,
      builderInstances: buildInstances(),
      builderParams: buildParams({ 'existing-m1': { exerciseSide: 'left', preparationTime: 10 } }),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
  });
});
