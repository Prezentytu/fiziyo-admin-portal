import { describe, expect, it } from 'vitest';
import { getPremiumQueue, hasActivePremium } from './premiumQueue';

const NOW = new Date('2026-10-15T12:00:00Z');

describe('hasActivePremium', () => {
  it('trusts the expiry date over the stored status', () => {
    expect(hasActivePremium({ premiumStatus: 'ACTIVE', premiumValidUntil: '2026-10-01T00:00:00Z' }, NOW)).toBe(false);
    expect(hasActivePremium({ premiumStatus: 'EXPIRED', premiumValidUntil: '2026-11-01T00:00:00Z' }, NOW)).toBe(true);
    expect(hasActivePremium({ premiumStatus: 'ACTIVE' }, NOW)).toBe(true);
    expect(hasActivePremium({ premiumStatus: 'FREE' }, NOW)).toBe(false);
  });
});

describe('getPremiumQueue', () => {
  it('lists patients with an account and no active Premium, latest expiry first', () => {
    const patients = [
      { id: 'active', premiumValidUntil: '2026-11-01T00:00:00Z' },
      { id: 'free', premiumStatus: 'FREE' as const },
      { id: 'expired-old', premiumValidUntil: '2026-09-01T00:00:00Z' },
      { id: 'shadow', premiumStatus: 'FREE' as const, patient: { isShadowUser: true } },
      { id: 'expired-recent', premiumValidUntil: '2026-10-02T00:00:00Z' },
    ];
    expect(getPremiumQueue(patients, NOW).map((patient) => patient.id)).toEqual(['expired-recent', 'expired-old', 'free']);
  });
});
