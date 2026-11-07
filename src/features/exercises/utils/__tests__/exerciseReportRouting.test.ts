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
  it('pozwala fizjoterapeucie zgłosić błąd w ćwiczeniu z bazy FiziYo', () => {
    expect(canReportExerciseIssue({ scope: 'GLOBAL', canReviewExercises: false })).toBe(true);
  });

  it('nie pokazuje zgłoszenia przy własnym ćwiczeniu gabinetu: poprawia się je edycją albo w weryfikacji organizacji', () => {
    expect(canReportExerciseIssue({ scope: 'ORGANIZATION', canReviewExercises: false })).toBe(false);
    expect(canReportExerciseIssue({ scope: 'PERSONAL', canReviewExercises: false })).toBe(false);
    expect(canReportExerciseIssue({ scope: undefined, canReviewExercises: false })).toBe(false);
  });

  it('nie pokazuje zgłoszenia weryfikatorowi FiziYo: ma „Popraw w weryfikacji” zamiast zgłoszenia do samego siebie', () => {
    expect(canReportExerciseIssue({ scope: 'GLOBAL', canReviewExercises: true })).toBe(false);
  });

  it('nie pokazuje zgłoszenia, dopóki rola systemowa się ładuje (bez mignięcia u weryfikatora)', () => {
    expect(canReportExerciseIssue({ scope: 'GLOBAL', canReviewExercises: false, isRoleLoading: true })).toBe(false);
  });
});
