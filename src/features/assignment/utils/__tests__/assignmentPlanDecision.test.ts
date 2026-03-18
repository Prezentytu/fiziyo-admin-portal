import { describe, expect, it } from 'vitest';
import { decideAssignmentPlanMode } from '../assignmentPlanDecision';

describe('decideAssignmentPlanMode', () => {
  it('always returns personalized plan mode', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: null,
      isCreatingNewSet: false,
      planName: '',
      saveAsTemplate: false,
      builderInstances: [],
      builderParams: new Map(),
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
    expect(result.overridesByMappingId).toEqual({});
  });

  it('never returns assignment-level exercise overrides', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: null,
      isCreatingNewSet: true,
      planName: 'Plan',
      saveAsTemplate: true,
      builderInstances: [{ instanceId: 'x', exerciseId: 'e1' }],
      builderParams: new Map([['x', { sets: 7 }]]),
    });

    expect(result.overridesByMappingId).toEqual({});
  });
});
