import { describe, expect, it } from 'vitest';

import { matchPatients } from '../patientMatch';

const PATIENTS = [
  { id: 'p-jan', name: 'Jan Kowalski' },
  { id: 'p-ewa-w', name: 'Ewa Wiśniewska' },
  { id: 'p-ewa-n', name: 'Ewa Nowicka' },
  { id: 'p-marek', name: 'Marek Zieliński' },
];

describe('matchPatients', () => {
  it('finds a patient by inflected full name', () => {
    const match = matchPatients('Zestaw dla Jana Kowalskiego na kolano', PATIENTS);
    expect(match.kind).toBe('one');
    expect(match.kind === 'one' && match.patient.id).toBe('p-jan');
    expect(match.consumedWords).toEqual(expect.arrayContaining(['jana', 'kowalskiego']));
  });

  it('handles the movable e in Polish first names', () => {
    const match = matchPatients('przypisz Markowi zestaw', PATIENTS);
    expect(match.kind === 'one' && match.patient.id).toBe('p-marek');
  });

  it('matches without Polish diacritics', () => {
    const match = matchPatients('plan dla ewy wisniewskiej', PATIENTS);
    expect(match.kind === 'one' && match.patient.id).toBe('p-ewa-w');
  });

  it('asks when a first name fits several patients', () => {
    const match = matchPatients('zestaw dla Ewy na lędźwie', PATIENTS);
    expect(match.kind).toBe('many');
    expect(match.kind === 'many' && match.patients.map((patient) => patient.id)).toEqual(['p-ewa-w', 'p-ewa-n']);
  });

  it('does not treat common words as names', () => {
    expect(matchPatients('jak ewentualnie ćwiczyć kolano', PATIENTS).kind).toBe('none');
  });
});
