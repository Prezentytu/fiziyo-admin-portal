import { describe, expect, it } from 'vitest';

import { nominativeName, pickPatientAnswer } from '../pickPatientAnswer';

const PATIENTS = [
  { id: 'p1', name: 'Anna Kowalska' },
  { id: 'p2', name: 'Jan Nowak' },
  { id: 'p3', name: 'Jan Wiśniewski' },
];

describe('pickPatientAnswer', () => {
  it('finds a patient named in any case', () => {
    expect(pickPatientAnswer('do Anny Kowalskiej', PATIENTS)).toEqual({ kind: 'one', patient: PATIENTS[0] });
  });

  it('lets the therapist choose when the answer fits several patients', () => {
    expect(pickPatientAnswer('dla Jana', PATIENTS)).toEqual({ kind: 'many', patientIds: ['p2', 'p3'] });
  });

  it('offers a new patient with the name in the nominative and the contact from the message', () => {
    expect(pickPatientAnswer('do jarka adamowskiego, jarek@example.com', PATIENTS)).toEqual({
      kind: 'none',
      details: { name: 'Jarek Adamowski', email: 'jarek@example.com' },
    });
  });
});

describe('nominativeName', () => {
  it.each([
    ['do jarka adamowskiego', 'Jarek Adamowski'],
    ['dla Adama Nowickiego', 'Adam Nowicki'],
    ['pani Marii Zielińskiej', 'Maria Zielińska'],
    ['dla Anny Kowalskiej', 'Anna Kowalska'],
    ['Piotr Zieliński', 'Piotr Zieliński'],
    ['Monika', 'Monika'],
  ])('%s → %s', (text, expected) => {
    expect(nominativeName(text)).toBe(expected);
  });
});
