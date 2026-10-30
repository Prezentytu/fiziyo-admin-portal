import { describe, expect, it } from 'vitest';

import { buildTodayAgenda, describeIssue } from '../todayAgenda';

const NOW = new Date(2026, 9, 30, 8, 0);
const DAY = 24 * 60 * 60 * 1000;

const PATIENTS = [
  {
    id: 'p-own-idle',
    name: 'Jan Kowalski',
    therapistId: 't1',
    lastActivity: new Date(NOW.getTime() - 6 * DAY).toISOString(),
  },
  {
    id: 'p-own-active',
    name: 'Anna Nowak',
    therapistId: 't1',
    lastActivity: new Date(NOW.getTime() - DAY).toISOString(),
  },
  {
    id: 'p-other',
    name: 'Ewa Wiśniewska',
    therapistId: 't2',
    lastActivity: new Date(NOW.getTime() - 10 * DAY).toISOString(),
  },
];

describe('buildTodayAgenda', () => {
  it("lists today's visits in time order", () => {
    const agenda = buildTodayAgenda({
      therapistId: 't1',
      patients: PATIENTS,
      notes: [
        { patientId: 'p-own-active', visitDate: new Date(2026, 9, 30, 14, 30).toISOString(), title: 'Kontrola' },
        { patientId: 'p-other', visitDate: new Date(2026, 9, 30, 9, 0).toISOString() },
        { patientId: 'p-own-idle', visitDate: new Date(2026, 9, 29, 9, 0).toISOString() },
        { patientId: 'p-unknown', visitDate: new Date(2026, 9, 30, 10, 0).toISOString() },
      ],
      assignments: [],
      now: NOW,
    });
    expect(agenda.visits.map((visit) => visit.patientId)).toEqual(['p-other', 'p-own-active']);
    expect(agenda.visits[1]).toMatchObject({ time: '14:30', title: 'Kontrola' });
  });

  it("raises only the signed-in therapist's patients: not exercising, plan ending soon", () => {
    const agenda = buildTodayAgenda({
      therapistId: 't1',
      patients: PATIENTS,
      notes: [],
      assignments: [
        { userId: 'p-own-active', endDate: new Date(2026, 9, 31, 23, 59).toISOString(), status: 'active' },
        { userId: 'p-own-active', endDate: new Date(2026, 10, 1).toISOString(), status: 'active' },
        { userId: 'p-own-idle', endDate: new Date(2026, 9, 30).toISOString(), status: 'Completed' },
        { userId: 'p-other', endDate: new Date(2026, 9, 30).toISOString(), status: 'active' },
      ],
      now: NOW,
    });
    expect(agenda.issues).toEqual([
      { kind: 'inactive', patientId: 'p-own-idle', name: 'Jan Kowalski', days: 6 },
      { kind: 'ending', patientId: 'p-own-active', name: 'Anna Nowak', daysLeft: 1 },
    ]);
  });

  it('is empty before the therapist is known', () => {
    expect(
      buildTodayAgenda({ therapistId: undefined, patients: PATIENTS, notes: [], assignments: [], now: NOW })
    ).toEqual({
      visits: [],
      issues: [],
    });
  });
});

describe('describeIssue', () => {
  it('words each issue without gendered forms', () => {
    expect(describeIssue({ kind: 'inactive', patientId: 'p', name: 'X', days: 5 })).toBe('Nie ćwiczy od 5 dni');
    expect(describeIssue({ kind: 'ending', patientId: 'p', name: 'X', daysLeft: 0 })).toBe('Plan kończy się dziś');
    expect(describeIssue({ kind: 'ending', patientId: 'p', name: 'X', daysLeft: 1 })).toBe('Plan kończy się jutro');
    expect(describeIssue({ kind: 'ending', patientId: 'p', name: 'X', daysLeft: 3 })).toBe('Plan kończy się za 3 dni');
  });
});
