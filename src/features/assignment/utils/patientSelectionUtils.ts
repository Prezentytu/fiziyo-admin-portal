import type { Patient } from '../types';

export function appendPatientIfMissing(selectedPatients: Patient[], patient: Patient): Patient[] {
  if (selectedPatients.some((selectedPatient) => selectedPatient.id === patient.id)) {
    return selectedPatients;
  }

  return [...selectedPatients, patient];
}
