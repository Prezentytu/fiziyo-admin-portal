import { describe, expect, it } from 'vitest';

import {
  addPatientReply,
  isAddPatientRequest,
  parseNewPatientDetails,
  threadNewPatientDetails,
  withNewPatientDetails,
} from '../newPatientDetails';

describe('parseNewPatientDetails', () => {
  it('takes the name, phone and reason the therapist wrote (report 01.11, W1)', () => {
    expect(
      parseNewPatientDetails('dodaj pacjentkę Anna Czat-Nowak, tel 600 100 200, ból lędźwi od pół roku, praca siedząca')
    ).toEqual({
      name: 'Anna Czat-Nowak',
      phone: '600 100 200',
      contextLabel: 'ból lędźwi od pół roku, praca siedząca',
    });
  });

  it('stops at the plan part of a combined command', () => {
    expect(
      parseNewPatientDetails('dodaj pacjenta Jan Czat-Kowalski i od razu ułóż mu zestaw: clamshell, bird dog')
    ).toEqual({ name: 'Jan Czat-Kowalski' });
  });

  it('reads an e-mail and a +48 phone, and names no one without a capitalized name', () => {
    expect(parseNewPatientDetails('nowy pacjent Marek Lis, marek.lis@example.com, +48 600-100-200')).toEqual({
      name: 'Marek Lis',
      phone: '+48 600-100-200',
      email: 'marek.lis@example.com',
    });
    expect(parseNewPatientDetails('dodaj pacjenta na jutro')).toEqual({});
  });
});

describe('withNewPatientDetails', () => {
  it('keeps the name as written over the model one and leaves other cards alone', () => {
    expect(
      withNewPatientDetails({ component: 'AddPatient', name: 'Jan Kowalski' }, 'dodaj pacjenta Jan Czat-Kowalski')
    ).toEqual({ component: 'AddPatient', name: 'Jan Czat-Kowalski' });
    expect(withNewPatientDetails({ component: 'AddPatient', name: 'Jan Kowalski' }, 'nowy pacjent')).toEqual({
      component: 'AddPatient',
      name: 'Jan Kowalski',
    });
    const peek = { component: 'PatientPeek' as const, filter: 'inactive' as const };
    expect(withNewPatientDetails(peek, 'tel 600 100 200')).toBe(peek);
  });
});

// Demo 18.11: „stwórz mi pacjenta dla takiego maila” skończyło się pytaniem o imię w czacie i formularzem bez e-maila.
describe('parseNewPatientDetails: whatever was given, in any order', () => {
  it('reads an e-mail alone, without taking the words around it for a name', () => {
    expect(parseNewPatientDetails('dodaj pacjenta ala@example.com')).toEqual({ email: 'ala@example.com' });
    expect(parseNewPatientDetails('stwórz mi pacjenta dla takiego maila: ala@example.com')).toEqual({
      email: 'ala@example.com',
    });
    expect(parseNewPatientDetails('załóż pacjenta z mailem ala@example.com')).toEqual({ email: 'ala@example.com' });
  });

  it('reads a name next to a contact without a comma, also written in lower case', () => {
    expect(parseNewPatientDetails('dodaj pacjenta Jan Kowalski jan@example.com')).toEqual({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
    });
    expect(parseNewPatientDetails('dodaj pacjenta jan@example.com Jan Kowalski')).toEqual({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
    });
    expect(parseNewPatientDetails('dodaj pacjentkę anna czat-nowak 600 100 200')).toEqual({
      name: 'Anna Czat-Nowak',
      phone: '600 100 200',
    });
    expect(parseNewPatientDetails('utwórz pacjenta Kowalski')).toEqual({ name: 'Kowalski' });
  });

  it('reads a name without the word „pacjent” when the command starts with adding', () => {
    expect(parseNewPatientDetails('dodaj Jan Kowalski jan@example.com')).toEqual({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
    });
  });

  it('names no one from words that are not a name', () => {
    expect(parseNewPatientDetails('dodaj pacjenta z bólem kolana')).toEqual({});
    expect(parseNewPatientDetails('dodaj nowego pacjenta')).toEqual({});
  });
});

describe('isAddPatientRequest', () => {
  it.each([
    'dodaj pacjenta ala@example.com',
    'Dodaj pacjenta',
    'stwórz mi pacjenta dla takiego maila: ala@example.com',
    'utwórz pacjenta Jan Kowalski',
    'załóż pacjentkę Anna Nowak, 600 100 200',
    'nowy pacjent Marek Lis, marek.lis@example.com',
    'chcę dodać nowego pacjenta',
    'dodaj Jan Kowalski jan@example.com',
    'dodaj jan@example.com',
  ])('takes „%s” as adding a patient', (text) => {
    expect(isAddPatientRequest(text)).toBe(true);
  });

  it.each([
    // Druga część prośby (zestaw) idzie do asystenta razem z pierwszą.
    'dodaj pacjenta Jan Kowalski i od razu ułóż mu zestaw na kolano',
    'dodaj pacjentowi Janowi ćwiczenie mostek',
    'dodaj mostek',
    'dodaj Jan Kowalski',
    'mam nowego pacjenta z bólem barku, co polecasz?',
    'jak dodać pacjenta?',
    'pokaż pacjenta Jan Kowalski',
    'zestaw dla nowego pacjenta na kolano',
  ])('leaves „%s” to the dispatcher', (text) => {
    expect(isAddPatientRequest(text)).toBe(false);
  });
});

describe('addPatientReply', () => {
  const patients = [
    { id: 'p1', name: 'Jan Kowalski', email: 'jan@example.com', phone: '+48 600 100 200' },
    { id: 'p2', name: 'Ewa Nowicka' },
  ];

  it('opens the form at once, filled with what the message gave', () => {
    expect(addPatientReply('stwórz mi pacjenta dla takiego maila: ala@example.com', patients)).toEqual({
      text: 'Uzupełnij brakujące dane w formularzu, a dodam pacjenta.',
      spec: { component: 'AddPatient', email: 'ala@example.com' },
    });
    expect(addPatientReply('dodaj Adam Lis 601 202 303', patients)).toEqual({
      text: 'Uzupełnij brakujące dane w formularzu, a dodam pacjenta: Adam Lis.',
      spec: { component: 'AddPatient', name: 'Adam Lis', phone: '601 202 303' },
    });
    expect(addPatientReply('Dodaj pacjenta', patients)?.spec).toEqual({ component: 'AddPatient' });
  });

  it('shows the patient who is already on the list instead of the form', () => {
    expect(addPatientReply('dodaj pacjenta JAN@example.com', patients)?.spec).toEqual({
      component: 'PatientPeek',
      patientId: 'p1',
    });
    expect(addPatientReply('dodaj pacjenta, tel. 600100200', patients)?.spec).toEqual({
      component: 'PatientPeek',
      patientId: 'p1',
    });
    const byName = addPatientReply('dodaj pacjentkę Ewa Nowicka', patients);
    expect(byName?.spec).toEqual({ component: 'PatientPeek', patientId: 'p2' });
    expect(byName?.text).toContain('Ewa Nowicka');
  });

  it('takes a namesake with another contact for a new person', () => {
    expect(addPatientReply('dodaj pacjenta Jan Kowalski jan.drugi@example.com', patients)?.spec).toEqual({
      component: 'AddPatient',
      name: 'Jan Kowalski',
      email: 'jan.drugi@example.com',
    });
  });

  it('is null for anything that is not adding a patient', () => {
    expect(addPatientReply('zestaw na kolano dla Jana Kowalskiego', patients)).toBeNull();
  });
});

describe('threadNewPatientDetails', () => {
  it('keeps what earlier messages of the open exchange gave, up to the last card', () => {
    const messages = [
      { role: 'user' as const, text: 'dodaj pacjenta stary@example.com' },
      { role: 'assistant' as const, spec: { component: 'PatientAdded' } },
      { role: 'user' as const, text: 'dodaj pacjenta ala@example.com, 600 100 200' },
      { role: 'assistant' as const, text: 'Podaj imię i nazwisko pacjenta.' },
    ];
    expect(threadNewPatientDetails(messages)).toEqual({ email: 'ala@example.com', phone: '600 100 200' });
  });

  it('reads through a question card and is empty without earlier messages', () => {
    const messages = [
      { role: 'user' as const, text: 'dodaj pacjenta ala@example.com' },
      { role: 'assistant' as const, spec: { component: 'Clarify' } },
    ];
    expect(threadNewPatientDetails(messages)).toEqual({ email: 'ala@example.com' });
    expect(threadNewPatientDetails([])).toEqual({});
  });
});

describe('withNewPatientDetails: second turn', () => {
  it('fills the form with the e-mail from the earlier message when the answer gives only the name', () => {
    expect(
      withNewPatientDetails({ component: 'AddPatient', name: 'Jan Kowalski' }, 'Jan Kowalski', {
        email: 'ala@example.com',
      })
    ).toEqual({ component: 'AddPatient', name: 'Jan Kowalski', email: 'ala@example.com' });
  });

  it('lets the newest message win over the earlier one', () => {
    expect(
      withNewPatientDetails({ component: 'AddPatient' }, 'pacjent Jan Kowalski, jan@example.com', {
        email: 'ala@example.com',
        phone: '600 100 200',
      })
    ).toEqual({ component: 'AddPatient', name: 'Jan Kowalski', email: 'jan@example.com', phone: '600 100 200' });
  });
});
