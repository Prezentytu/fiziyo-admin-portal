import { describe, expect, it } from 'vitest';

import { resolveAssignmentDisplayStatus } from '../assignmentDisplayStatus';

const NOW = new Date('2026-05-26T10:00:00.000Z');

describe('resolveAssignmentDisplayStatus', () => {
  it('shows expired when endDate is in the past even if status is assigned', () => {
    const result = resolveAssignmentDisplayStatus({
      status: 'assigned',
      endDate: '2026-05-20T10:00:00.000Z',
      premiumValidUntil: '2026-06-20T10:00:00.000Z',
      now: NOW,
    });

    expect(result.primary.kind).toBe('expired');
    expect(result.primary.label).toBe('Wygasł');
    expect(result.secondary).toBeUndefined();
  });

  it('shows expired when backend status is expired', () => {
    const result = resolveAssignmentDisplayStatus({
      status: 'expired',
      endDate: '2026-06-20T10:00:00.000Z',
      premiumValidUntil: '2026-06-20T10:00:00.000Z',
      now: NOW,
    });

    expect(result.primary.kind).toBe('expired');
    expect(result.primary.variant).toBe('destructive');
  });

  it('shows paused when status is paused', () => {
    const result = resolveAssignmentDisplayStatus({
      status: 'paused',
      endDate: '2026-06-20T10:00:00.000Z',
      premiumValidUntil: '2026-06-20T10:00:00.000Z',
      now: NOW,
    });

    expect(result.primary.kind).toBe('paused');
    expect(result.primary.label).toBe('Wstrzymany');
  });

  it('shows expiring soon when endDate is within 2 days', () => {
    const result = resolveAssignmentDisplayStatus({
      status: 'assigned',
      endDate: '2026-05-28T10:00:00.000Z',
      premiumValidUntil: '2026-06-20T10:00:00.000Z',
      now: NOW,
    });

    expect(result.primary.kind).toBe('expiring_soon');
    expect(result.primary.label).toBe('Wygasa za 2 dni');
  });

  it('shows active when assignment and premium are valid', () => {
    const result = resolveAssignmentDisplayStatus({
      status: 'active',
      endDate: '2026-06-20T10:00:00.000Z',
      premiumValidUntil: '2026-06-20T10:00:00.000Z',
      now: NOW,
    });

    expect(result.primary.kind).toBe('active');
    expect(result.primary.label).toBe('Aktywny');
    expect(result.secondary).toBeUndefined();
  });

  it('shows secondary premium hint when assignment is active but premium is missing', () => {
    const result = resolveAssignmentDisplayStatus({
      status: 'active',
      endDate: '2026-06-20T10:00:00.000Z',
      premiumValidUntil: null,
      now: NOW,
    });

    expect(result.primary.kind).toBe('active');
    expect(result.secondary).toEqual({
      label: 'Brak Premium',
      variant: 'warning',
    });
  });
});
