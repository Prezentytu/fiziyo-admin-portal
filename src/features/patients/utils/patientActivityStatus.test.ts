import { describe, expect, it } from 'vitest';
import { comparePatientsByAttention, getPatientActivityStatus, needsAttention } from './patientActivityStatus';

const NOW = new Date(2026, 9, 15, 14, 0);

function daysAgo(days: number, hour = 9): string {
  return new Date(2026, 9, 15 - days, hour, 0).toISOString();
}

describe('getPatientActivityStatus', () => {
  it('treats missing or invalid activity as neutral', () => {
    expect(getPatientActivityStatus(undefined, NOW)).toEqual({ tone: 'none', label: 'Brak aktywności', daysSinceTraining: null });
    expect(getPatientActivityStatus('not a date', NOW).tone).toBe('none');
  });

  it('is green for training today and yesterday (calendar days, not 24h windows)', () => {
    expect(getPatientActivityStatus(daysAgo(0), NOW)).toMatchObject({ tone: 'success', label: 'Trening dziś' });
    expect(getPatientActivityStatus(daysAgo(1, 23), NOW)).toMatchObject({ tone: 'success', label: 'Trening wczoraj' });
  });

  it('is orange for 2–3 days and red from 4 days', () => {
    expect(getPatientActivityStatus(daysAgo(2), NOW)).toMatchObject({ tone: 'warning', label: 'Bez treningu od 2 dni' });
    expect(getPatientActivityStatus(daysAgo(3), NOW).tone).toBe('warning');
    expect(getPatientActivityStatus(daysAgo(4), NOW)).toMatchObject({ tone: 'danger', label: 'Bez treningu od 4 dni' });
  });

  it('flags everyone except recent training as needing attention', () => {
    expect(needsAttention(getPatientActivityStatus(daysAgo(0), NOW))).toBe(false);
    expect(needsAttention(getPatientActivityStatus(daysAgo(2), NOW))).toBe(true);
    expect(needsAttention(getPatientActivityStatus(undefined, NOW))).toBe(true);
  });
});

describe('comparePatientsByAttention', () => {
  it('orders red (longest first), orange, never trained (newest first), then recent', () => {
    const patients = [
      { id: 'recent', lastActivity: daysAgo(0) },
      { id: 'never-old', assignedAt: daysAgo(10) },
      { id: 'orange', lastActivity: daysAgo(3) },
      { id: 'red-9', lastActivity: daysAgo(9) },
      { id: 'never-new', assignedAt: daysAgo(1) },
      { id: 'red-5', lastActivity: daysAgo(5) },
    ].map((patient) => ({ ...patient, activity: getPatientActivityStatus(patient.lastActivity, NOW) }));

    const order = [...patients].sort(comparePatientsByAttention).map((patient) => patient.id);
    expect(order).toEqual(['red-9', 'red-5', 'orange', 'never-new', 'never-old', 'recent']);
  });
});
