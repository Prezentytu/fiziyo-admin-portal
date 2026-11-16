import {
  comparePatientsByAttention,
  getPatientActivityStatus,
  needsAttention,
  type PatientActivityStatus,
  type PatientAttention,
} from '@/features/patients/utils/patientActivityStatus';

interface PeekablePatient {
  therapistId?: string;
  lastActivity?: string;
  attention?: PatientAttention | null;
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
    .map((patient) => ({
      ...patient,
      activity: getPatientActivityStatus(patient.lastActivity, now, patient.attention),
    }))
    .filter((patient) => needsAttention(patient.activity))
    .sort(comparePatientsByAttention);
}

// sendExerciseReminders takes at most 50 patients per call (MaxTherapistReminderPatients).
const MAX_REMINDERS_PER_CALL = 50;

/**
 * "Przypomnij wszystkim": everyone on the list who is behind the plan, not only the rows the card shows.
 * A patient who trained and reported pain, difficulty or a note gets no "find time for your set" push.
 */
export function pendingReminderIds(
  attention: ReadonlyArray<{ id: string; activity?: Pick<PatientActivityStatus, 'isInactive'> }>,
  remindedIds: readonly string[]
): string[] {
  const reminded = new Set(remindedIds);
  return attention
    .filter((patient) => patient.activity?.isInactive !== false && !reminded.has(patient.id))
    .slice(0, MAX_REMINDERS_PER_CALL)
    .map((patient) => patient.id);
}
