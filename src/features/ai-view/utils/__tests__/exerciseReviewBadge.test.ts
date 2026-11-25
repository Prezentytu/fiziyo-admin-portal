import { describe, expect, it } from 'vitest';

import { exerciseReviewBadge } from '../exerciseReviewBadge';

describe('exerciseReviewBadge', () => {
  it('marks own exercises sent to verification', () => {
    expect(exerciseReviewBadge({ scope: 'ORGANIZATION', status: 'PENDING_REVIEW' })?.label).toBe('W weryfikacji');
    expect(
      exerciseReviewBadge({
        scope: 'ORGANIZATION',
        status: 'DRAFT',
        organizationVerificationStatus: 'PENDING_ORG_REVIEW',
      })?.label
    ).toBe('W weryfikacji');
  });

  it('marks exercises sent back with notes', () => {
    expect(exerciseReviewBadge({ scope: 'ORGANIZATION', status: 'CHANGES_REQUESTED' })?.label).toBe('Do poprawy');
    expect(
      exerciseReviewBadge({
        scope: 'ORGANIZATION',
        status: 'DRAFT',
        organizationVerificationStatus: 'ORG_CHANGES_REQUESTED',
      })?.label
    ).toBe('Do poprawy');
  });

  it('shows nothing for accepted catalog and plain own exercises', () => {
    expect(exerciseReviewBadge({ scope: 'GLOBAL', status: 'PUBLISHED' })).toBeNull();
    expect(exerciseReviewBadge({ scope: 'ORGANIZATION', status: 'DRAFT' })).toBeNull();
    expect(
      exerciseReviewBadge({ scope: 'ORGANIZATION', status: 'DRAFT', organizationVerificationStatus: 'ORG_VERIFIED' })
    ).toBeNull();
    expect(exerciseReviewBadge(undefined)).toBeNull();
  });
});
