import { describe, expect, it } from 'vitest';

import type { PatientAssignmentListItem } from '@/graphql/types/operation-responses';
import { buildPatientAccessPlans } from './patientAccessPlans';

const now = new Date('2026-11-05T12:00:00Z');

function assignment(overrides: Partial<PatientAssignmentListItem> & { id: string }): PatientAssignmentListItem {
  return {
    status: 'assigned',
    startDate: '2026-11-01T00:00:00Z',
    endDate: '2026-12-31T00:00:00Z',
    exerciseSet: { id: 'set-1', name: 'Plan kolano', exerciseMappings: [] },
    ...overrides,
  };
}

describe('buildPatientAccessPlans', () => {
  it('marks completed, cancelled, paused and expired assignments as inactive', () => {
    const plans = buildPatientAccessPlans(
      [
        assignment({ id: 'a-done', status: 'completed' }),
        assignment({ id: 'a-cancel', status: 'cancelled' }),
        assignment({ id: 'a-paused', status: 'paused' }),
        assignment({ id: 'a-expired', endDate: '2026-10-01T00:00:00Z' }),
        assignment({ id: 'a-live', status: 'assigned' }),
      ],
      now
    );

    expect(plans.filter((plan) => plan.isActive).map((plan) => plan.id)).toEqual(['a-live']);
  });

  it('keys plans by assignment, so the same set assigned twice stays two plans', () => {
    const plans = buildPatientAccessPlans(
      [
        assignment({ id: 'a-old', status: 'completed', assignedAt: '2026-09-01T00:00:00Z' }),
        assignment({ id: 'a-new', status: 'active', assignedAt: '2026-11-01T00:00:00Z' }),
      ],
      now
    );

    expect(plans.map((plan) => plan.id)).toEqual(['a-new', 'a-old']);
    expect(plans.every((plan) => plan.exerciseSetId === 'set-1')).toBe(true);
  });

  it('puts active plans first, newest first within a group', () => {
    const plans = buildPatientAccessPlans(
      [
        assignment({ id: 'a-done-new', status: 'completed', assignedAt: '2026-11-04T00:00:00Z' }),
        assignment({ id: 'a-live-old', assignedAt: '2026-10-01T00:00:00Z' }),
        assignment({ id: 'a-live-new', assignedAt: '2026-11-03T00:00:00Z' }),
      ],
      now
    );

    expect(plans.map((plan) => plan.id)).toEqual(['a-live-new', 'a-live-old', 'a-done-new']);
  });

  it('carries the assignment exerciseOverrides for the PDF', () => {
    const [plan] = buildPatientAccessPlans(
      [assignment({ id: 'a-1', exerciseOverrides: '{"m-1":{"sets":5}}' })],
      now
    );

    expect(plan.exerciseOverrides).toBe('{"m-1":{"sets":5}}');
  });

  it('skips single-exercise assignments without a set', () => {
    expect(buildPatientAccessPlans([assignment({ id: 'a-x', exerciseSet: null })], now)).toEqual([]);
  });
});
