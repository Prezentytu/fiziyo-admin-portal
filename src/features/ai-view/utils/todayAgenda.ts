import {
  daysUntilAssignmentEnd,
  resolveAssignmentDisplayStatus,
} from '@/features/patients/utils/assignmentDisplayStatus';
import { getPatientActivityStatus } from '@/features/patients/utils/patientActivityStatus';
import { pluralize } from '@/utils/textUtils';

interface AgendaPatient {
  id: string;
  name: string;
  therapistId?: string;
  lastActivity?: string;
}

interface AgendaNote {
  patientId: string;
  visitDate: string;
  title?: string | null;
}

interface AgendaAssignment {
  userId: string;
  endDate?: string | null;
  status?: string | null;
}

export interface AgendaVisit {
  patientId: string;
  name: string;
  time: string;
  title?: string;
}

export type AgendaIssue =
  | { kind: 'inactive'; patientId: string; name: string; days: number }
  | { kind: 'ending'; patientId: string; name: string; daysLeft: number };

export interface TodayAgenda {
  visits: AgendaVisit[];
  issues: AgendaIssue[];
}

export const INACTIVE_FROM_DAYS = 4;
const MAX_ISSUES = 6;

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

const TIME_FORMAT = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });

/**
 * "Dziś N wizyty · N sprawy" on the chat home: today's visits (clinical notes dated today) and the
 * signed-in therapist's patients who need a word (not exercising, plan expiring soon).
 */
export function buildTodayAgenda(input: {
  therapistId: string | undefined;
  patients: readonly AgendaPatient[];
  notes: readonly AgendaNote[];
  assignments: readonly AgendaAssignment[];
  now?: Date;
}): TodayAgenda {
  const now = input.now ?? new Date();
  if (!input.therapistId) return { visits: [], issues: [] };
  const ownPatients = input.patients.filter((patient) => patient.therapistId === input.therapistId);
  const byId = new Map(ownPatients.map((patient) => [patient.id, patient]));
  const allById = new Map(input.patients.map((patient) => [patient.id, patient]));

  const visits = input.notes
    .filter((note) => {
      const date = new Date(note.visitDate);
      return !Number.isNaN(date.getTime()) && isSameLocalDay(date, now) && allById.has(note.patientId);
    })
    .sort((left, right) => new Date(left.visitDate).getTime() - new Date(right.visitDate).getTime())
    .map((note) => ({
      patientId: note.patientId,
      name: allById.get(note.patientId)?.name ?? 'Pacjent',
      time: TIME_FORMAT.format(new Date(note.visitDate)),
      title: note.title ?? undefined,
    }));

  const ending: AgendaIssue[] = [];
  const seenEnding = new Set<string>();
  for (const assignment of input.assignments) {
    const patient = byId.get(assignment.userId);
    if (!patient || !assignment.endDate || seenEnding.has(patient.id)) continue;
    // The same "expiring soon" the patients list shows, so both views flag the same plans.
    const { primary } = resolveAssignmentDisplayStatus({ status: assignment.status, endDate: assignment.endDate, now });
    if (primary.kind !== 'expiring_soon') continue;
    seenEnding.add(patient.id);
    const daysLeft = daysUntilAssignmentEnd(new Date(assignment.endDate), now);
    ending.push({ kind: 'ending', patientId: patient.id, name: patient.name, daysLeft });
  }

  const inactive: AgendaIssue[] = ownPatients
    .map((patient) => ({ patient, status: getPatientActivityStatus(patient.lastActivity, now) }))
    .filter(({ status }) => status.daysSinceTraining !== null && status.daysSinceTraining >= INACTIVE_FROM_DAYS)
    .sort((left, right) => (right.status.daysSinceTraining ?? 0) - (left.status.daysSinceTraining ?? 0))
    .map(({ patient, status }) => ({
      kind: 'inactive',
      patientId: patient.id,
      name: patient.name,
      days: status.daysSinceTraining ?? 0,
    }));

  ending.sort((left, right) =>
    left.kind === 'ending' && right.kind === 'ending' ? left.daysLeft - right.daysLeft : 0
  );
  return { visits, issues: [...inactive, ...ending].slice(0, MAX_ISSUES) };
}

export function describeIssue(issue: AgendaIssue): string {
  if (issue.kind === 'inactive') return `Nie ćwiczy od ${issue.days} dni`;
  return `Plan wygasa za ${pluralize(issue.daysLeft, 'dzień')}`;
}
