import { describe, expect, it } from 'vitest';

import {
  creditsLevel,
  creditsRequestControl,
  creditsRequestSchema,
  recentRequests,
  usedPercent,
} from '../creditsRequest';

const usage = (monthlyUsed: number, totalRemaining: number, monthlyLimit = 100) => ({
  monthlyLimit,
  monthlyUsed,
  totalRemaining,
});

describe('creditsLevel', () => {
  it('warns from 80% of the monthly pool, not below', () => {
    expect(creditsLevel(usage(79, 21))).toBe('ok');
    expect(creditsLevel(usage(80, 20))).toBe('low');
    expect(creditsLevel(usage(99, 1))).toBe('low');
  });

  it('reports exhausted when nothing is left', () => {
    expect(creditsLevel(usage(100, 0))).toBe('exhausted');
    expect(creditsLevel(usage(120, -3))).toBe('exhausted');
  });

  it('does not divide by a zero pool', () => {
    expect(creditsLevel(usage(0, 50, 0))).toBe('ok');
    expect(usedPercent(usage(0, 50, 0))).toBe(0);
  });
});

describe('usedPercent', () => {
  it('rounds and caps at 100', () => {
    expect(usedPercent(usage(83, 17))).toBe(83);
    expect(usedPercent(usage(130, 0))).toBe(100);
  });
});

describe('creditsRequestControl', () => {
  it('hides the control for roles that cannot request', () => {
    expect(creditsRequestControl(false, [])).toBe('none');
    expect(creditsRequestControl(false, [{ status: 'pending' }])).toBe('none');
  });

  it('offers the button until a request is pending', () => {
    expect(creditsRequestControl(true, undefined)).toBe('request');
    expect(creditsRequestControl(true, [{ status: 'approved' }, { status: 'rejected' }])).toBe('request');
    expect(creditsRequestControl(true, [{ status: 'approved' }, { status: 'pending' }])).toBe('pending');
  });
});

describe('recentRequests', () => {
  it('returns newest first and at most five', () => {
    const requests = Array.from({ length: 7 }, (_, index) => ({
      id: `r${index}`,
      requestedCredits: 100,
      message: null,
      status: 'approved' as const,
      createdAt: `2026-0${index + 1}-01T00:00:00Z`,
      resolvedAt: null,
      grantedCredits: null,
      resolutionNote: null,
    }));
    const result = recentRequests(requests);
    expect(result).toHaveLength(5);
    expect(result[0].id).toBe('r6');
  });
});

describe('creditsRequestSchema', () => {
  it('accepts 1..10000 whole numbers only', () => {
    expect(creditsRequestSchema.safeParse({ requestedCredits: 500, message: '' }).success).toBe(true);
    expect(creditsRequestSchema.safeParse({ requestedCredits: 10000, message: '' }).success).toBe(true);
    expect(creditsRequestSchema.safeParse({ requestedCredits: 0, message: '' }).success).toBe(false);
    expect(creditsRequestSchema.safeParse({ requestedCredits: 10001, message: '' }).success).toBe(false);
    expect(creditsRequestSchema.safeParse({ requestedCredits: 1.5, message: '' }).success).toBe(false);
  });

  it('caps the note at 500 characters', () => {
    expect(creditsRequestSchema.safeParse({ requestedCredits: 5, message: 'a'.repeat(501) }).success).toBe(false);
  });
});
