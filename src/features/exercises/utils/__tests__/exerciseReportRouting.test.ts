import { describe, expect, it } from 'vitest';

import { canReportExerciseIssue, resolveExerciseReportRoutingTarget } from '../exerciseReportRouting';

describe('resolveExerciseReportRoutingTarget', () => {
  it('returns UPDATE_PENDING for published exercises', () => {
    const target = resolveExerciseReportRoutingTarget({
      status: 'PUBLISHED',
      scope: 'GLOBAL',
    });

    expect(target).toBe('UPDATE_PENDING');
  });

  it('returns PENDING_REVIEW for non-published statuses', () => {
    expect(resolveExerciseReportRoutingTarget({ status: 'DRAFT', scope: 'GLOBAL' })).toBe('PENDING_REVIEW');
    expect(resolveExerciseReportRoutingTarget({ status: 'CHANGES_REQUESTED', scope: 'ORGANIZATION' })).toBe(
      'PENDING_ORG_REVIEW'
    );
    expect(resolveExerciseReportRoutingTarget({ status: undefined, scope: 'GLOBAL' })).toBe('PENDING_REVIEW');
  });

  it('routes organization scope reports to organization queue', () => {
    expect(resolveExerciseReportRoutingTarget({ status: 'DRAFT', scope: 'ORGANIZATION' })).toBe('PENDING_ORG_REVIEW');
  });
});

describe('canReportExerciseIssue', () => {
  it('pozwala każdemu, także weryfikatorowi FiziYo, zgłosić błąd w ćwiczeniu z bazy FiziYo', () => {
    expect(canReportExerciseIssue({ scope: 'GLOBAL' })).toBe(true);
  });

  it('nie pokazuje zgłoszenia przy własnym ćwiczeniu gabinetu: poprawia się je edycją albo w weryfikacji organizacji', () => {
    expect(canReportExerciseIssue({ scope: 'ORGANIZATION' })).toBe(false);
    expect(canReportExerciseIssue({ scope: 'PERSONAL' })).toBe(false);
    expect(canReportExerciseIssue({ scope: undefined })).toBe(false);
  });
});
