import type { PatientAttention } from '@/types/apollo';

export type { PatientAttention };

export type PatientActivityTone = 'success' | 'warning' | 'danger' | 'none';

export interface PatientActivityStatus {
  tone: PatientActivityTone;
  label: string;
  daysSinceTraining: number | null;
  /** Ból, trudność albo notatka od pacjenta od ostatniego przejrzenia (liczy dzwonek). */
  hasPatientSignal?: boolean;
  lastSignalAt?: string | null;
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

const KNOWN_TONES: readonly PatientActivityTone[] = ['success', 'warning', 'danger', 'none'];

function trainingLabel(days: number | null): string {
  if (days === null) return 'Brak aktywności';
  if (days === 0) return 'Trening dziś';
  if (days === 1) return 'Trening wczoraj';
  return `Trening ${days} dni temu`;
}

function attentionLabel(attention: PatientAttention, days: number | null): string {
  const top = attention.reasons[0];
  if (top === 'PAIN') return attention.maxPainLevel ? `Ból ${attention.maxPainLevel}/5` : 'Zgłoszony ból';
  if (top === 'DIFFICULTY') return 'Za trudne';
  if (top === 'NOTE') return 'Nowa notatka';
  if (top === 'INACTIVE' && days !== null) return `Bez treningu od ${days} dni`;
  if (top === 'INACTIVE') return 'Nie zaczął planu';
  return trainingLabel(days);
}

/**
 * Status z reguły serwera: ból ≥4, trudność, notatka od przejrzenia, przerwa względem częstotliwości planu.
 * Bez pola `attention` (API sprzed SPEC-039) liczy dawnym progiem z dni od ostatniego treningu.
 */
export function getPatientActivityStatus(
  lastActivity: string | null | undefined,
  now: Date = new Date(),
  attention?: PatientAttention | null
): PatientActivityStatus {
  if (attention && KNOWN_TONES.includes(attention.tone as PatientActivityTone)) {
    const days = attention.daysSinceTraining ?? null;
    return {
      tone: attention.tone as PatientActivityTone,
      label: attentionLabel(attention, days),
      daysSinceTraining: days,
      hasPatientSignal: attention.hasPatientSignal,
      lastSignalAt: attention.lastSignalAt ?? null,
    };
  }
  return getLegacyActivityStatus(lastActivity, now);
}

/** Thresholds from the v4 design: 0–1 days green, 2–3 orange, 4+ red, no training yet = neutral. */
function getLegacyActivityStatus(lastActivity: string | null | undefined, now: Date): PatientActivityStatus {
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

/** Pacjenci z sygnałem od siebie (ból, trudność, notatka) — to liczy dzwonek. */
export function countPatientSignals(statuses: readonly PatientActivityStatus[]): number {
  return statuses.filter((status) => status.hasPatientSignal).length;
}

/**
 * Red first (pain, long break), then orange, then patients who never trained (newest first), then recent.
 * Within a tone a signal from the patient goes before plain inactivity, the freshest signal on top;
 * then the longest without training.
 */
export function comparePatientsByAttention(left: SortablePatient, right: SortablePatient): number {
  const priorityDiff = TONE_PRIORITY[left.activity.tone] - TONE_PRIORITY[right.activity.tone];
  if (priorityDiff !== 0) return priorityDiff;

  const signalDiff = Number(Boolean(right.activity.hasPatientSignal)) - Number(Boolean(left.activity.hasPatientSignal));
  if (signalDiff !== 0) return signalDiff;
  if (left.activity.hasPatientSignal) {
    const freshness = timeOf(right.activity.lastSignalAt) - timeOf(left.activity.lastSignalAt);
    if (freshness !== 0) return freshness;
  }

  if (left.activity.tone === 'none') return timeOf(right.assignedAt) - timeOf(left.assignedAt);
  if (left.activity.tone === 'success') return timeOf(right.lastActivity) - timeOf(left.lastActivity);
  return (right.activity.daysSinceTraining ?? 0) - (left.activity.daysSinceTraining ?? 0);
}
