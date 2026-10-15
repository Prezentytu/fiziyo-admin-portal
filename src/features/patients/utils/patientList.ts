import { comparePatientsByAttention, getPatientActivityStatus } from './patientActivityStatus';
import { hasActivePremium } from './premiumQueue';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PatientAccessKind = 'premium' | 'locked' | 'shadow';

export interface PatientAccess {
  kind: PatientAccessKind;
  label: string;
}

interface AccessInput {
  isShadowUser?: boolean | null;
  premiumValidUntil?: string | null;
  premiumStatus?: 'FREE' | 'ACTIVE' | 'EXPIRED' | null;
}

function daysLabel(days: number): string {
  return days === 1 ? '1 dzień' : `${days} dni`;
}

/** Access column copy from the v4 design. */
export function getPatientAccess(input: AccessInput, now: Date = new Date()): PatientAccess {
  if (input.isShadowUser) return { kind: 'shadow', label: 'Połącz z aplikacją' };
  if (!hasActivePremium(input, now)) return { kind: 'locked', label: 'Aktywuj Premium' };
  if (!input.premiumValidUntil) return { kind: 'premium', label: 'Premium' };

  const daysLeft = Math.max(1, Math.ceil((new Date(input.premiumValidUntil).getTime() - now.getTime()) / MS_PER_DAY));
  return { kind: 'premium', label: `Premium · jeszcze ${daysLabel(daysLeft)}` };
}

export type PatientSort = 'urgency' | 'name';

interface SortInput {
  fullname?: string | null;
  lastActivity?: string | null;
  assignedAt?: string | null;
  therapist?: { id: string } | null;
}

function lastNameOf(fullname: string | null | undefined): string {
  const parts = (fullname ?? '').trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

/**
 * My patients first; within each group either the attention order (longest without training on top)
 * or last name A–Z.
 */
export function sortPatients<T extends SortInput>(
  patients: readonly T[],
  sort: PatientSort,
  therapistId: string | undefined,
  now: Date = new Date()
): T[] {
  const withActivity = patients.map((patient) => ({
    patient,
    activity: getPatientActivityStatus(patient.lastActivity, now),
    lastActivity: patient.lastActivity,
    assignedAt: patient.assignedAt,
  }));

  return withActivity
    .sort((left, right) => {
      const leftMine = left.patient.therapist?.id === therapistId;
      const rightMine = right.patient.therapist?.id === therapistId;
      if (leftMine !== rightMine) return leftMine ? -1 : 1;

      if (sort === 'name') {
        return (
          lastNameOf(left.patient.fullname).localeCompare(lastNameOf(right.patient.fullname), 'pl') ||
          (left.patient.fullname ?? '').localeCompare(right.patient.fullname ?? '', 'pl')
        );
      }
      return comparePatientsByAttention(left, right);
    })
    .map(({ patient }) => patient);
}
