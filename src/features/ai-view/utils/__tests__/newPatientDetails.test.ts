import { describe, expect, it } from 'vitest';

import { parseNewPatientDetails, withNewPatientDetails } from '../newPatientDetails';

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
