import type { Frequency } from '@/features/assignment/types';
import { polishPlural } from '@/utils/polishPlural';

export type PlanStart = 'today' | 'tomorrow' | 'monday';
export type PlanRhythm = 'daily' | 'three' | 'two';

export interface SchedulePlan {
  start: PlanStart;
  weeks: number;
  rhythm: PlanRhythm;
}

export const DEFAULT_SCHEDULE_PLAN: SchedulePlan = { start: 'tomorrow', weeks: 4, rhythm: 'daily' };

export const PLAN_STARTS: ReadonlyArray<{ value: PlanStart; label: string }> = [
  { value: 'today', label: 'Dziś' },
  { value: 'tomorrow', label: 'Jutro' },
  { value: 'monday', label: 'Od poniedziałku' },
];

export const PLAN_WEEKS: readonly number[] = [2, 4, 6, 8];

export const PLAN_RHYTHMS: ReadonlyArray<{ value: PlanRhythm; label: string }> = [
  { value: 'daily', label: 'Codziennie' },
  { value: 'three', label: '3× w tygodniu' },
  { value: 'two', label: '2× w tygodniu' },
];

/** Quick replies under "Od kiedy i jak często?"; the first one accepts the default plan. */
export const SCHEDULE_REPLIES: ReadonlyArray<{ label: string; plan: SchedulePlan }> = [
  { label: 'Pasuje', plan: DEFAULT_SCHEDULE_PLAN },
  { label: 'Od poniedziałku', plan: { ...DEFAULT_SCHEDULE_PLAN, start: 'monday' } },
  { label: 'Na 6 tygodni', plan: { ...DEFAULT_SCHEDULE_PLAN, weeks: 6 } },
  { label: '3 razy w tygodniu', plan: { ...DEFAULT_SCHEDULE_PLAN, rhythm: 'three' } },
];

const RHYTHM_DAYS: Record<PlanRhythm, ReadonlyArray<keyof Frequency>> = {
  daily: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  three: ['monday', 'wednesday', 'friday'],
  two: ['tuesday', 'friday'],
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function planStartDate(start: PlanStart, now: Date = new Date()): Date {
  const today = startOfDay(now);
  if (start === 'today') return today;
  if (start === 'tomorrow') return addDays(today, 1);
  // Next Monday, never today: "od poniedziałku" said on a Monday means the coming one.
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  return addDays(today, daysUntilMonday);
}

export function resolvePlanDates(plan: SchedulePlan, now: Date = new Date()): { startDate: Date; endDate: Date } {
  const startDate = planStartDate(plan.start, now);
  // The last day is inclusive: 4 weeks from Saturday ends on the Friday four weeks later.
  const endDate = addDays(startDate, plan.weeks * 7 - 1);
  endDate.setHours(23, 59, 0, 0);
  return { startDate, endDate };
}

export function planFrequency(plan: SchedulePlan): Frequency {
  const days = new Set(RHYTHM_DAYS[plan.rhythm]);
  return {
    timesPerDay: 1,
    timesPerWeek: days.size,
    isFlexible: false,
    breakBetweenSets: 4,
    monday: days.has('monday'),
    tuesday: days.has('tuesday'),
    wednesday: days.has('wednesday'),
    thursday: days.has('thursday'),
    friday: days.has('friday'),
    saturday: days.has('saturday'),
    sunday: days.has('sunday'),
  };
}

const DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' });

export function formatPlanDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

function weeksLabel(weeks: number): string {
  return `${weeks} ${polishPlural(weeks, 'tydzień', 'tygodnie', 'tygodni')}`;
}

export function planWeeksLabel(weeks: number): string {
  return weeksLabel(weeks);
}

export function planRhythmLabel(rhythm: PlanRhythm): string {
  return PLAN_RHYTHMS.find((option) => option.value === rhythm)?.label ?? '';
}

/** "od jutra, 31 października · 4 tygodnie · codziennie" */
export function describePlan(plan: SchedulePlan, now: Date = new Date()): string {
  const { startDate } = resolvePlanDates(plan, now);
  const startLabel = plan.start === 'today' ? 'od dziś' : plan.start === 'tomorrow' ? 'od jutra' : 'od poniedziałku';
  return `${startLabel}, ${formatPlanDate(startDate)} · ${weeksLabel(plan.weeks)} · ${planRhythmLabel(plan.rhythm).toLowerCase()}`;
}
