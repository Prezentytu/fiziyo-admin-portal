import { describe, expect, it } from 'vitest';

import { exerciseStatusBadgeVariant, type ExerciseStatusFlags } from '../exerciseStatusBadgeVariant';

const NONE: ExerciseStatusFlags = {
  isSubmittedToGlobal: false,
  isPendingReview: false,
  isChangesRequested: false,
  isPendingOrganizationReview: false,
  isOrganizationChangesRequested: false,
  isOrganizationVerified: false,
};

describe('exerciseStatusBadgeVariant', () => {
  it('returns null without any status', () => {
    expect(exerciseStatusBadgeVariant(NONE)).toBeNull();
  });

  it('maps each status to its tone', () => {
    expect(exerciseStatusBadgeVariant({ ...NONE, isSubmittedToGlobal: true })).toBe('overlay-info');
    expect(exerciseStatusBadgeVariant({ ...NONE, isPendingReview: true })).toBe('overlay-warning');
    expect(exerciseStatusBadgeVariant({ ...NONE, isChangesRequested: true })).toBe('overlay-danger');
    expect(exerciseStatusBadgeVariant({ ...NONE, isPendingOrganizationReview: true })).toBe('overlay-warning');
    expect(exerciseStatusBadgeVariant({ ...NONE, isOrganizationChangesRequested: true })).toBe('overlay-danger');
    expect(exerciseStatusBadgeVariant({ ...NONE, isOrganizationVerified: true })).toBe('overlay-success');
  });

  it('lets the organization track win over a pending global review', () => {
    expect(
      exerciseStatusBadgeVariant({
        ...NONE,
        isSubmittedToGlobal: true,
        isPendingReview: true,
        isOrganizationVerified: true,
      })
    ).toBe('overlay-success');
  });
});
