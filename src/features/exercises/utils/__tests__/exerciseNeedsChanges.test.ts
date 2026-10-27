import { describe, expect, it } from 'vitest';

import { exerciseNeedsChanges } from '../exerciseNeedsChanges';

describe('exerciseNeedsChanges', () => {
  it('matches an original whose global submission copy was returned for changes', () => {
    expect(
      exerciseNeedsChanges({
        status: 'DRAFT',
        globalSubmissionStatus: 'CHANGES_REQUESTED',
        organizationVerificationStatus: 'NOT_SUBMITTED',
      })
    ).toBe(true);
  });

  it('matches exercises returned from organization verification', () => {
    expect(
      exerciseNeedsChanges({ status: 'DRAFT', organizationVerificationStatus: 'ORG_CHANGES_REQUESTED' })
    ).toBe(true);
  });

  it('matches exercises whose own status is changes requested', () => {
    expect(exerciseNeedsChanges({ status: 'CHANGES_REQUESTED' })).toBe(true);
  });

  it('ignores exercises that are not returned for changes', () => {
    expect(exerciseNeedsChanges({ status: 'DRAFT', globalSubmissionStatus: 'PENDING_REVIEW' })).toBe(false);
    expect(exerciseNeedsChanges({ status: 'DRAFT', globalSubmissionStatus: 'PUBLISHED' })).toBe(false);
    expect(exerciseNeedsChanges({ status: 'PUBLISHED' })).toBe(false);
    expect(exerciseNeedsChanges({ status: 'PENDING_REVIEW', organizationVerificationStatus: 'ORG_VERIFIED' })).toBe(
      false
    );
    expect(exerciseNeedsChanges({})).toBe(false);
  });
});
