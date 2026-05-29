import { describe, expect, it } from 'vitest';

import { calculateTherapyStatus } from '@/lib/therapyStatus';

import { evaluateTherapyAdherence } from './therapyAdherence';

describe('evaluateTherapyAdherence', () => {
  it.each([
    { daysSinceLastActivity: 0, expectedTone: 'positive', expectedReason: 'on_track' },
    { daysSinceLastActivity: 3, expectedTone: 'informative', expectedReason: 'inactivity' },
    { daysSinceLastActivity: 5, expectedTone: 'caution', expectedReason: 'inactivity' },
    { daysSinceLastActivity: 7, expectedTone: 'caution', expectedReason: 'inactivity' },
  ])('applies gentle inactivity ladder for $daysSinceLastActivity days', ({ daysSinceLastActivity, expectedTone, expectedReason }) => {
    const result = evaluateTherapyAdherence({
      daysSinceStart: 7,
      daysSinceLastActivity,
      missedTrainings: 0,
      hardCount: 0,
      hasDiscomfort: false,
      requiredSoFar: 7,
      activeDays: 7 - Math.min(daysSinceLastActivity, 6),
      lastActivityAt: '2026-05-20T10:00:00.000Z',
    });

    expect(result.tone).toBe(expectedTone);
    expect(result.reason).toBe(expectedReason);
    expect(result.badgeLabel).not.toBe('ALARM');
  });

  it('prioritizes discomfort over inactivity', () => {
    const result = evaluateTherapyAdherence({
      daysSinceStart: 7,
      daysSinceLastActivity: 8,
      missedTrainings: 4,
      hardCount: 2,
      hasDiscomfort: true,
      requiredSoFar: 7,
      activeDays: 1,
      lastActivityAt: '2026-05-20T10:00:00.000Z',
    });

    expect(result.reason).toBe('discomfort');
    expect(result.tone).toBe('caution');
  });

  it('does not classify a fresh plan as inactivity', () => {
    const result = evaluateTherapyAdherence({
      daysSinceStart: 2,
      daysSinceLastActivity: 2,
      missedTrainings: 0,
      hardCount: 0,
      hasDiscomfort: false,
      requiredSoFar: 2,
      activeDays: 1,
      lastActivityAt: '2026-05-20T10:00:00.000Z',
    });

    expect(result.reason).toBe('on_track');
    expect(result.tone).toBe('positive');
  });
});

describe('calculateTherapyStatus', () => {
  it('uses latest completed activity even when input order is unsorted', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();

    const statusResult = calculateTherapyStatus(
      [
        { id: 'old', status: 'completed', completedAt: sixDaysAgo, painLevel: 1, difficultyLevel: 3 },
        { id: 'new', status: 'completed', completedAt: oneDayAgo, painLevel: 1, difficultyLevel: 3 },
      ],
      [{ id: 'assignment-1', status: 'active', startDate: sixDaysAgo }]
    );

    expect(statusResult.daysSinceLastActivity).toBeLessThanOrEqual(2);
    expect(statusResult.reason).not.toBe('inactivity');
    expect(statusResult.status).not.toBe('alert');
  });
});
