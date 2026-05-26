import { describe, expect, it } from 'vitest';

import {
  canApproveOrganizationExercise,
  canArchiveOrganizationExercise,
  canRequestOrganizationChanges,
  canSubmitForOrganizationReview,
  canWithdrawFromOrganizationReview,
} from '@/features/verification/utils/orgStateMachine';

describe('orgStateMachine', () => {
  it('allows submit only for not submitted and changes requested', () => {
    expect(canSubmitForOrganizationReview('NOT_SUBMITTED')).toBe(true);
    expect(canSubmitForOrganizationReview('ORG_CHANGES_REQUESTED')).toBe(true);
    expect(canSubmitForOrganizationReview('PENDING_ORG_REVIEW')).toBe(false);
  });

  it('allows review decisions only for pending status', () => {
    expect(canApproveOrganizationExercise('PENDING_ORG_REVIEW')).toBe(true);
    expect(canRequestOrganizationChanges('PENDING_ORG_REVIEW')).toBe(true);
    expect(canApproveOrganizationExercise('ORG_VERIFIED')).toBe(false);
  });

  it('allows withdraw only for pending status', () => {
    expect(canWithdrawFromOrganizationReview('PENDING_ORG_REVIEW')).toBe(true);
    expect(canWithdrawFromOrganizationReview('NOT_SUBMITTED')).toBe(false);
  });

  it('allows archive only for verified status', () => {
    expect(canArchiveOrganizationExercise('ORG_VERIFIED')).toBe(true);
    expect(canArchiveOrganizationExercise('ORG_CHANGES_REQUESTED')).toBe(false);
  });
});
