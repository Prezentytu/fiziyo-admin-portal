import { describe, expect, it } from 'vitest';

import { resolveExerciseReportRoutingTarget } from '../exerciseReportRouting';

describe('resolveExerciseReportRoutingTarget', () => {
  it('returns UPDATE_PENDING for published exercises', () => {
    const target = resolveExerciseReportRoutingTarget({
      status: 'PUBLISHED',
      scope: 'GLOBAL',
    });

    expect(target).toBe('UPDATE_PENDING');
  });

  it('returns PENDING_REVIEW for non-published statuses', () => {
    expect(resolveExerciseReportRoutingTarget({ status: 'DRAFT', scope: 'ORGANIZATION' })).toBe('PENDING_REVIEW');
    expect(resolveExerciseReportRoutingTarget({ status: 'CHANGES_REQUESTED', scope: 'ORGANIZATION' })).toBe(
      'PENDING_REVIEW'
    );
    expect(resolveExerciseReportRoutingTarget({ status: undefined, scope: 'GLOBAL' })).toBe('PENDING_REVIEW');
  });
});
