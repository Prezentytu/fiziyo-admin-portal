import { describe, expect, it } from 'vitest';
import {
  comparePatientsByAttention,
  countPatientSignals,
  getPatientActivityStatus,
  needsAttention,
} from './patientActivityStatus';

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

describe('server attention (SPEC-039)', () => {
  const painToday = {
    tone: 'danger',
    reasons: ['PAIN'],
    maxPainLevel: 5,
    lastSignalAt: daysAgo(0, 8),
    daysSinceTraining: 0,
    hasPatientSignal: true,
  };

  it('puts a patient training daily with pain 5/5 on top, not at the end of the list', () => {
    const patients = [
      { id: 'recent', lastActivity: daysAgo(0) },
      { id: 'red-9', lastActivity: daysAgo(9) },
      { id: 'pain', lastActivity: daysAgo(0), attention: painToday },
    ].map((patient) => ({
      ...patient,
      activity: getPatientActivityStatus(patient.lastActivity, NOW, patient.attention),
    }));

    const pain = patients.find((patient) => patient.id === 'pain')!;
    expect(pain.activity).toMatchObject({ tone: 'danger', label: 'Ból 5/5', hasPatientSignal: true });
    expect(needsAttention(pain.activity)).toBe(true);
    expect([...patients].sort(comparePatientsByAttention).map((patient) => patient.id)).toEqual([
      'pain',
      'red-9',
      'recent',
    ]);
  });

  it('keeps a 3×/week patient green on a planned rest day', () => {
    const restDay = { tone: 'success', reasons: [], daysSinceTraining: 2, expectedGapDays: 3, hasPatientSignal: false };

    const status = getPatientActivityStatus(daysAgo(2), NOW, restDay);

    expect(status).toMatchObject({ tone: 'success', label: 'Trening 2 dni temu' });
    expect(needsAttention(status)).toBe(false);
  });

  it('labels difficulty and notes, and the bell counts only signals from the patient', () => {
    const hard = getPatientActivityStatus(daysAgo(0), NOW, {
      tone: 'warning',
      reasons: ['DIFFICULTY', 'NOTE'],
      daysSinceTraining: 0,
      hasPatientSignal: true,
    });
    const inactive = getPatientActivityStatus(daysAgo(5), NOW, {
      tone: 'danger',
      reasons: ['INACTIVE'],
      daysSinceTraining: 5,
      hasPatientSignal: false,
    });

    expect(hard.label).toBe('Za trudne');
    expect(inactive.label).toBe('Bez treningu od 5 dni');
    expect(countPatientSignals([hard, inactive, getPatientActivityStatus(daysAgo(0), NOW, painToday)])).toBe(2);
  });

  it('falls back to days since training when the API has no attention yet', () => {
    expect(getPatientActivityStatus(daysAgo(2), NOW, null)).toMatchObject({
      tone: 'warning',
      label: 'Bez treningu od 2 dni',
    });
  });
});
