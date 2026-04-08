import { describe, expect, it } from 'vitest';
import { appendPatientIfMissing } from '../patientSelectionUtils';
import type { Patient } from '../../types';

const patientA: Patient = {
  id: 'patient-a',
  name: 'Anna Kowalska',
  email: 'anna@example.com',
};

const patientB: Patient = {
  id: 'patient-b',
  name: 'Jan Nowak',
  email: 'jan@example.com',
};

describe('appendPatientIfMissing', () => {
  it('appends patient when missing', () => {
    const result = appendPatientIfMissing([patientA], patientB);
    expect(result).toEqual([patientA, patientB]);
  });

  it('does not append duplicate patient id', () => {
    const result = appendPatientIfMissing([patientA], patientA);
    expect(result).toEqual([patientA]);
  });

  it('works with empty selection', () => {
    const result = appendPatientIfMissing([], patientA);
    expect(result).toEqual([patientA]);
  });
});
