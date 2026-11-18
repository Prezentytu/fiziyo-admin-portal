import { describe, expect, it } from 'vitest';
import {
  getPatientAccess,
  patientListEmptyState,
  patientListSubtitle,
  settledSearchResultsCount,
  sortPatients,
} from './patientList';

const NOW = new Date(2026, 9, 15, 12, 0);

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('getPatientAccess', () => {
  it('asks to connect the app for patients without an account', () => {
    expect(getPatientAccess({ isShadowUser: true, premiumValidUntil: daysFromNow(10) }, NOW)).toEqual({
      kind: 'shadow',
      label: 'Połącz z aplikacją',
    });
  });

  it('offers activation when Premium is missing or expired', () => {
    expect(getPatientAccess({ premiumStatus: 'FREE' }, NOW).kind).toBe('locked');
    expect(getPatientAccess({ premiumValidUntil: daysFromNow(-2) }, NOW)).toEqual({ kind: 'locked', label: 'Aktywuj Premium' });
  });

  it('counts remaining days with Polish singular', () => {
    expect(getPatientAccess({ premiumValidUntil: daysFromNow(23) }, NOW).label).toBe('Premium · jeszcze 23 dni');
    expect(getPatientAccess({ premiumValidUntil: daysFromNow(0.5) }, NOW).label).toBe('Premium · jeszcze 1 dzień');
  });
});

describe('sortPatients', () => {
  const me = { id: 'me' };
  const other = { id: 'other' };
  const patients = [
    { fullname: 'Ewa Wiśniewska', lastActivity: daysFromNow(-9), therapist: other },
    { fullname: 'Anna Kowalska', lastActivity: daysFromNow(0), therapist: me },
    { fullname: 'Piotr Zieliński', lastActivity: daysFromNow(-9), therapist: me },
    { fullname: 'Marek Nowak', lastActivity: daysFromNow(-2), therapist: me },
  ];

  it('puts my patients first, longest without training on top', () => {
    expect(sortPatients(patients, 'urgency', 'me', NOW).map((patient) => patient.fullname)).toEqual([
      'Piotr Zieliński',
      'Marek Nowak',
      'Anna Kowalska',
      'Ewa Wiśniewska',
    ]);
  });

  it('sorts by last name with Polish collation', () => {
    expect(sortPatients(patients, 'name', 'me', NOW).map((patient) => patient.fullname)).toEqual([
      'Anna Kowalska',
      'Marek Nowak',
      'Piotr Zieliński',
      'Ewa Wiśniewska',
    ]);
  });
});

describe('settledSearchResultsCount', () => {
  const ready = { listLoaded: true, filtersByTherapist: true, therapistId: 't1', count: 0 };

  it('waits for the patient list before reporting an empty search', () => {
    expect(settledSearchResultsCount({ ...ready, listLoaded: false })).toBeNull();
  });

  it('waits for the therapist id on tabs that filter by it', () => {
    expect(settledSearchResultsCount({ ...ready, therapistId: undefined })).toBeNull();
  });

  it('reports the visible count once the list can be shown', () => {
    expect(settledSearchResultsCount(ready)).toBe(0);
    expect(settledSearchResultsCount({ ...ready, filtersByTherapist: false, therapistId: null, count: 3 })).toBe(3);
  });
});

describe('patient list copy for a therapist who sees only own patients', () => {
  it('does not send a restricted therapist to take patients over from „Wszyscy”', () => {
    expect(patientListEmptyState({ filter: 'my', isRestricted: false }).description).toContain('przejmij opiekę');
    const restricted = patientListEmptyState({ filter: 'my', isRestricted: true }).description;
    expect(restricted).not.toContain('przejmij');
    expect(restricted).toContain('właściciela lub administratora');
  });

  it('explains an empty „Wszyscy” instead of claiming the clinic has no patients', () => {
    expect(patientListEmptyState({ filter: 'all', isRestricted: false }).title).toBe('Brak pacjentów w organizacji');
    expect(patientListEmptyState({ filter: 'all', isRestricted: true })).toEqual({
      title: 'Nie masz jeszcze pacjentów pod opieką',
      description:
        'Widzisz tylko pacjentów pod swoją opieką. Pozostałych przypisuje właściciel albo administrator gabinetu.',
    });
  });

  it('shows the clinic total only to those who see the whole clinic', () => {
    expect(patientListSubtitle({ myCount: 3, totalCount: 12, isRestricted: false })).toBe(
      '3 pod Twoją opieką · 12 w organizacji'
    );
    expect(patientListSubtitle({ myCount: 3, totalCount: 3, isRestricted: true })).toBe('3 pod Twoją opieką');
    expect(patientListSubtitle({ myCount: 3, totalCount: 4, isRestricted: true })).toBe(
      '3 pod Twoją opieką · 4 widocznych dla Ciebie'
    );
  });
});
