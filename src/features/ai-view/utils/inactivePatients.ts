import {
  comparePatientsByAttention,
  getPatientActivityStatus,
  needsAttention,
  type PatientActivityStatus,
} from '@/features/patients/utils/patientActivityStatus';

interface PeekablePatient {
  therapistId?: string;
  lastActivity?: string;
}

/**
 * "Kto nie ćwiczy" lists only the signed-in therapist's patients. Null until the therapist is known,
 * so the card never shows colleagues' patients while the user query is loading.
 */
export function selectInactivePatients<T extends PeekablePatient>(
  patients: readonly T[],
  therapistId: string | undefined,
  now: Date = new Date()
): Array<T & { activity: PatientActivityStatus }> | null {
  if (!therapistId) return null;
  return patients
    .filter((patient) => patient.therapistId === therapistId)
    .map((patient) => ({ ...patient, activity: getPatientActivityStatus(patient.lastActivity, now) }))
    .filter((patient) => needsAttention(patient.activity))
    .sort(comparePatientsByAttention);
}
