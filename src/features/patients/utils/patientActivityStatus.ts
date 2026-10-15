export type PatientActivityTone = 'success' | 'warning' | 'danger' | 'none';

export interface PatientActivityStatus {
  tone: PatientActivityTone;
  label: string;
  daysSinceTraining: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WARNING_FROM_DAYS = 2;
const DANGER_FROM_DAYS = 4;

const TONE_PRIORITY: Record<PatientActivityTone, number> = { danger: 0, warning: 1, none: 2, success: 3 };

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function calendarDaysBetween(earlier: Date, later: Date): number {
  return Math.max(0, Math.round((startOfLocalDay(later) - startOfLocalDay(earlier)) / MS_PER_DAY));
}

/**
 * Thresholds from the v4 design: 0–1 days green, 2–3 orange, 4+ red, no training yet = neutral.
 */
export function getPatientActivityStatus(lastActivity: string | null | undefined, now: Date = new Date()): PatientActivityStatus {
  if (!lastActivity) return { tone: 'none', label: 'Brak aktywności', daysSinceTraining: null };

  const lastDate = new Date(lastActivity);
  if (Number.isNaN(lastDate.getTime())) return { tone: 'none', label: 'Brak aktywności', daysSinceTraining: null };

  const days = calendarDaysBetween(lastDate, now);
  if (days === 0) return { tone: 'success', label: 'Trening dziś', daysSinceTraining: 0 };
  if (days < WARNING_FROM_DAYS) return { tone: 'success', label: 'Trening wczoraj', daysSinceTraining: days };

  const label = `Bez treningu od ${days} dni`;
  return { tone: days >= DANGER_FROM_DAYS ? 'danger' : 'warning', label, daysSinceTraining: days };
}

export function needsAttention(status: PatientActivityStatus): boolean {
  return status.tone !== 'success';
}

interface SortablePatient {
  activity: PatientActivityStatus;
  assignedAt?: string | null;
  lastActivity?: string | null;
}

function timeOf(value: string | null | undefined): number {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Longest without training first, then 2–3 days, then patients who never trained (newest first),
 * then patients who trained recently.
 */
export function comparePatientsByAttention(left: SortablePatient, right: SortablePatient): number {
  const priorityDiff = TONE_PRIORITY[left.activity.tone] - TONE_PRIORITY[right.activity.tone];
  if (priorityDiff !== 0) return priorityDiff;

  if (left.activity.tone === 'none') return timeOf(right.assignedAt) - timeOf(left.assignedAt);
  if (left.activity.tone === 'success') return timeOf(right.lastActivity) - timeOf(left.lastActivity);
  return (right.activity.daysSinceTraining ?? 0) - (left.activity.daysSinceTraining ?? 0);
}
