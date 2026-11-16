import type { OrganizationPatientDto } from '@/types/apollo';
import { getPatientActivityStatus, type PatientActivityStatus } from './patientActivityStatus';

/** A signal from a patient does not wait for a page reload, but the organization list is a heavy query. */
export const PATIENT_SIGNALS_POLL_MS = 2 * 60 * 1000;

/** Backend lets Owner, Admin and Therapist mark signals as reviewed; Staff sees the bell read-only (SPEC-039). */
export function canMarkSignalsReviewed(role: string | null | undefined): boolean {
  return ['owner', 'admin', 'therapist'].includes((role ?? '').toLowerCase());
}

export interface PatientSignalItem {
  patientId: string;
  name: string;
  activity: PatientActivityStatus;
}

function timeOf(value: string | null | undefined): number {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Dzwonek: pacjenci z sygnałem od siebie (ból, trudność, notatka) od ostatniego przejrzenia, najświeższy
 * na górze. Sama nieaktywność nie dzwoni, bo jest na liście (SPEC-039, D-4). Fizjoterapeuta z własnymi
 * pacjentami widzi swoich; bez przypisań (właściciel, recepcja) widzi całą organizację.
 */
export function selectPatientSignals(
  patients: readonly OrganizationPatientDto[],
  therapistId: string | undefined,
  now: Date = new Date()
): PatientSignalItem[] {
  const hasOwnPatients = Boolean(therapistId) && patients.some((item) => item.therapist?.id === therapistId);
  return patients
    .filter((item) => !hasOwnPatients || item.therapist?.id === therapistId)
    .map((item) => ({
      patientId: item.patient.id,
      name: item.patient.fullname || item.patient.email || 'Pacjent',
      activity: getPatientActivityStatus(item.lastActivity, now, item.attention),
    }))
    .filter((item) => item.activity.hasPatientSignal)
    .sort((left, right) => timeOf(right.activity.lastSignalAt) - timeOf(left.activity.lastSignalAt));
}
