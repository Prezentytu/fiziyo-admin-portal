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

  it('does not let a short first name swallow common words', () => {
    const patients = [
      { id: 'p-ola', name: 'Ola Lis' },
      { id: 'p-ala', name: 'Ala Kot' },
    ];
    expect(matchPatients('zestaw z olejem na bliznę, ale bez alergii', patients).kind).toBe('none');
    expect(matchPatients('plan dla Oli', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-ola' } });
  });

  it('matches a four-letter first name by its forms, not by prefix', () => {
    const patients = [{ id: 'p-maja', name: 'Maja Lis' }];
    expect(matchPatients('zestaw na maj', patients).kind).toBe('none');
    expect(matchPatients('plan dla Mai', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-maja' } });
  });

  it('does not match a longer first name by prefix', () => {
    const patients = [
      { id: 'p-karol', name: 'Karol Nowak' },
      { id: 'p-maria', name: 'Maria Lis' },
      { id: 'p-magda', name: 'Magda Kot' },
    ];
    for (const text of ['zestaw dla Karoliny', 'dla Mariana', 'dla Mariusza', 'plan Magdaleny']) {
      expect(matchPatients(text, patients).kind).toBe('none');
    }
    expect(matchPatients('zestaw dla Karola', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-karol' } });
    expect(matchPatients('plan dla Marii', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-maria' } });
    expect(matchPatients('plan Magdy', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-magda' } });
    expect(matchPatients('ustal z Nowakiem plan', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-karol' } });
  });

  it('does not turn a name into another name with a feminine ending', () => {
    const patients = [
      { id: 'p-wiktor', name: 'Wiktor Nowak' },
      { id: 'p-kamil', name: 'Kamil Lis' },
      { id: 'p-antoni', name: 'Antoni Kot' },
    ];
    for (const text of ['zestaw dla Wiktoria', 'dla Kamili', 'plan Antonia']) {
      expect(matchPatients(text, patients).kind).toBe('none');
    }
    expect(matchPatients('o Wiktorze', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-wiktor' } });
    expect(matchPatients('dla Kamila', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-kamil' } });
    expect(matchPatients('dla Antoniego', patients)).toMatchObject({ kind: 'one', patient: { id: 'p-antoni' } });
  });

  it('does not treat common words as names', () => {
    expect(matchPatients('jak ewentualnie ćwiczyć kolano', PATIENTS).kind).toBe('none');
  });
});
