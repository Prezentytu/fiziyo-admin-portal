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

  it('does not let a feminine name swallow the masculine one', () => {
    const patients = [{ id: 'p-kamila', name: 'Kamila Lis' }];
    for (const text of ['zestaw dla Kamil', 'przypisz Kamilowi zestaw', 'plan z Kamilem']) {
      expect(matchPatients(text, patients).kind).toBe('none');
    }
    for (const text of ['dla Kamili', 'plan z Kamilą', 'pokaż Kamilę']) {
      expect(matchPatients(text, patients)).toMatchObject({ kind: 'one', patient: { id: 'p-kamila' } });
    }
  });

  it('keeps masculine and feminine forms of i-stem names and adjectival surnames apart', () => {
    const antonia = [{ id: 'p-antonia', name: 'Antonia Kot' }];
    expect(matchPatients('dla Antoniego', antonia).kind).toBe('none');
    expect(matchPatients('dla Antonii', antonia)).toMatchObject({ kind: 'one', patient: { id: 'p-antonia' } });
    for (const text of ['dla Antoni', 'dla Antoniu', 'dla Antonio']) {
      expect(matchPatients(text, antonia).kind).toBe('none');
    }
    expect(matchPatients('dla Mario', [{ id: 'p-maria', name: 'Maria Lis' }]).kind).toBe('none');
    const short = [
      { id: 'p-julia', name: 'Julia Nowak' },
      { id: 'p-hania', name: 'Hania Lis' },
    ];
    expect(matchPatients('zestaw dla Juli', short)).toMatchObject({ kind: 'one', patient: { id: 'p-julia' } });
    expect(matchPatients('dla Hani', short)).toMatchObject({ kind: 'one', patient: { id: 'p-hania' } });
    expect(matchPatients('Haniu, plan', short)).toMatchObject({ kind: 'one', patient: { id: 'p-hania' } });
    expect(matchPatients('dla Kseni', [{ id: 'p-ksenia', name: 'Ksenia Nowak' }]).kind).toBe('one');
    expect(matchPatients('dla Gieni', [{ id: 'p-gienia', name: 'Gienia Nowak' }]).kind).toBe('one');
    const foreign = [
      { id: 'p-mario', name: 'Mario Rossi' },
      { id: 'p-julio', name: 'Julio Nowak' },
      { id: 'p-antonio', name: 'Antonio Kot' },
    ];
    for (const text of ['dla Marii', 'dla Mari', 'dla Juli', 'dla Julii', 'dla Antonii', 'dla Antonia']) {
      expect(matchPatients(text, foreign).kind).toBe('none');
    }
    expect(matchPatients('przypisz Mariowi', foreign)).toMatchObject({ kind: 'one', patient: { id: 'p-mario' } });
    const bruno = [{ id: 'p-bruno', name: 'Bruno Nowak' }];
    for (const text of ['zestaw dla Bruna', 'notatka o Brunie']) {
      expect(matchPatients(text, bruno)).toMatchObject({ kind: 'one', patient: { id: 'p-bruno' } });
    }
    expect(matchPatients('dla Jasia', [{ id: 'p-jasio', name: 'Jasio Nowak' }]).kind).toBe('one');
    expect(matchPatients('dla Henia', [{ id: 'p-henio', name: 'Henio Nowak' }]).kind).toBe('one');
    expect(matchPatients('dla Gienia', [{ id: 'p-gienio', name: 'Gienio Lis' }]).kind).toBe('one');
    expect(matchPatients('zestaw dla Ani na kolano', [{ id: 'p-ania', name: 'Ania Kowalska' }]).kind).toBe('one');
    expect(matchPatients('dla Asi', [{ id: 'p-asia', name: 'Asia Nowak' }]).kind).toBe('one');
    expect(matchPatients('dla Nicoli', [{ id: 'p-nicole', name: 'Nicole Nowak' }]).kind).toBe('one');
    const basia = [{ id: 'p-basia', name: 'Basia Nowak' }];
    for (const text of ['dla Basi', 'Basiu', 'z Basią']) {
      expect(matchPatients(text, basia)).toMatchObject({ kind: 'one', patient: { id: 'p-basia' } });
    }

    const anna = [{ id: 'p-anna', name: 'Anna Kowalska' }];
    expect(matchPatients('plan Kowalskiego', anna).kind).toBe('none');
    expect(matchPatients('plan Kowalskiej', anna)).toMatchObject({ kind: 'one', patient: { id: 'p-anna' } });

    const jan = [{ id: 'p-jan', name: 'Jan Kowalski' }];
    expect(matchPatients('plan Kowalskiej', jan).kind).toBe('none');
    expect(matchPatients('plan Kowalskiemu', jan)).toMatchObject({ kind: 'one', patient: { id: 'p-jan' } });
  });

  it('does not treat common words as names', () => {
    expect(matchPatients('jak ewentualnie ćwiczyć kolano', PATIENTS).kind).toBe('none');
  });
});
