import { describe, expect, it } from 'vitest';

import { exerciseNeedsChanges } from '../exerciseNeedsChanges';

describe('exerciseNeedsChanges', () => {
  it('matches exercises returned from global verification', () => {
    expect(exerciseNeedsChanges({ status: 'CHANGES_REQUESTED' })).toBe(true);
    expect(exerciseNeedsChanges({ status: 'REJECTED' })).toBe(true);
  });

  it('matches exercises returned from organization verification', () => {
    expect(
      exerciseNeedsChanges({ status: 'DRAFT', organizationVerificationStatus: 'ORG_CHANGES_REQUESTED' })
    ).toBe(true);
  });

  it('ignores exercises that are not returned for changes', () => {
    expect(exerciseNeedsChanges({ status: 'PUBLISHED' })).toBe(false);
    expect(exerciseNeedsChanges({ status: 'PENDING_REVIEW', organizationVerificationStatus: 'ORG_VERIFIED' })).toBe(
      false
    );
    expect(exerciseNeedsChanges({})).toBe(false);
  });
});
