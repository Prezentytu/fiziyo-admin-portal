import { describe, expect, it } from 'vitest';

import { getVerificationStatusBadge } from '../statusBadge';

describe('getVerificationStatusBadge', () => {
  it('reads the organization track in organization queues', () => {
    const badge = getVerificationStatusBadge(
      { status: 'DRAFT', organizationVerificationStatus: 'PENDING_ORG_REVIEW' },
      'organization'
    );

    expect(badge.label).toBe('Oczekuje');
  });

  it.each([
    ['ORG_CHANGES_REQUESTED', 'Do poprawy'],
    ['ORG_VERIFIED', 'Zweryfikowane'],
    ['ORG_ARCHIVED', 'Zarchiwizowane'],
  ] as const)('maps %s to „%s”', (organizationVerificationStatus, label) => {
    expect(getVerificationStatusBadge({ status: 'DRAFT', organizationVerificationStatus }, 'organization').label).toBe(
      label
    );
  });

  it('falls back to the global status when the organization status is missing', () => {
    expect(getVerificationStatusBadge({ status: 'PENDING_REVIEW' }, 'organization').label).toBe('Oczekuje');
  });

  it('ignores the organization status in the global queue', () => {
    const badge = getVerificationStatusBadge(
      { status: 'PUBLISHED', organizationVerificationStatus: 'PENDING_ORG_REVIEW' },
      'global'
    );

    expect(badge.label).toBe('Opublikowany');
  });

  it('shows a draft for global statuses without a badge', () => {
    expect(getVerificationStatusBadge({ status: 'DRAFT' }, 'global').label).toBe('Szkic');
  });
});
