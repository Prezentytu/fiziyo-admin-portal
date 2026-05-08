import { describe, expect, it } from 'vitest';

import { fromGqlStatus, getStatusColorClass, toGqlStatus, translateAssignmentStatus, type AssignmentStatus } from '../statusUtils';

describe('statusUtils GraphQL mappings', () => {
  const statuses: AssignmentStatus[] = ['assigned', 'active', 'paused', 'completed', 'cancelled', 'in_progress'];

  it('maps lowercase statuses to GraphQL enum values', () => {
    expect(toGqlStatus('assigned')).toBe('ASSIGNED');
    expect(toGqlStatus('active')).toBe('ACTIVE');
    expect(toGqlStatus('paused')).toBe('PAUSED');
    expect(toGqlStatus('completed')).toBe('COMPLETED');
    expect(toGqlStatus('cancelled')).toBe('CANCELLED');
    expect(toGqlStatus('in_progress')).toBe('IN_PROGRESS');
  });

  it('maps GraphQL enum values back to lowercase statuses', () => {
    expect(fromGqlStatus('ASSIGNED')).toBe('assigned');
    expect(fromGqlStatus('ACTIVE')).toBe('active');
    expect(fromGqlStatus('PAUSED')).toBe('paused');
    expect(fromGqlStatus('COMPLETED')).toBe('completed');
    expect(fromGqlStatus('CANCELLED')).toBe('cancelled');
    expect(fromGqlStatus('IN_PROGRESS')).toBe('in_progress');
  });

  it('keeps mapping reversible for all supported statuses', () => {
    for (const status of statuses) {
      expect(fromGqlStatus(toGqlStatus(status))).toBe(status);
    }
  });
});

describe('statusUtils translations and badge classes', () => {
  it('translates in_progress status', () => {
    expect(translateAssignmentStatus('in_progress')).toBe('W trakcie');
  });

  it('returns dedicated color class for in_progress status', () => {
    expect(getStatusColorClass('in_progress')).toContain('bg-indigo-500/20');
  });
});
