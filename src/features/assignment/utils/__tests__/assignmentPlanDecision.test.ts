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
    expect(result.customizedCount).toBe(0);
  });

  it('returns clinical override deltas when builder params differ from template', () => {
    const result = decideAssignmentPlanMode({
      sourceSet: null,
      isCreatingNewSet: true,
      planName: 'Plan',
      saveAsTemplate: true,
      builderInstances: [{ instanceId: 'x', exerciseId: 'e1' }],
      builderParams: new Map([
        [
          'x',
          {
            sets: 7,
            exerciseSide: 'left',
            rangeOfMotion: '90°',
            difficultyLevel: 'HARD',
          },
        ],
      ]),
      availableExercises: [
        {
          id: 'e1',
          name: 'Test',
          side: 'both',
          rangeOfMotion: '',
          difficultyLevel: 'MEDIUM',
        },
      ],
    });

    expect(result.mode).toBe('PERSONALIZED_PLAN');
    expect(result.customizedCount).toBe(1);
    expect(result.overridesByMappingId.x).toEqual({
      exerciseSide: 'left',
      rangeOfMotion: '90°',
      difficultyLevel: 'HARD',
    });
    expect(result.overridesByMappingId.x).not.toHaveProperty('sets');
  });
});
