import { polishPlural } from '@/utils/polishPlural';
import {
  DEFAULT_SCHEDULE_PLAN,
  formatPlanDate,
  PLAN_DAYS,
  planWeeksLabel,
  planWithDays,
  resolvePlanDates,
  type PlanDay,
  type PlanStart,
  type SchedulePlan,
} from './schedulePlan';

/** SPEC-067: one set of the week and the weekdays the patient does it. */
export interface WeekEntry {
  setId: string;
  days: PlanDay[];
}

/** Start and length shared by every set of the week; the days belong to each set. */
export interface WeekPeriod {
  start: PlanStart;
  weeks: number;
}

/** Same cap as the backend (`ChatViewSpecValidator.MaxWeekSets`). */
export const MAX_WEEK_SETS = 10;

const DAY_ORDER = PLAN_DAYS.map((day) => day.value);

export const DEFAULT_WEEK_PERIOD: WeekPeriod = {
  start: DEFAULT_SCHEDULE_PLAN.start,
  weeks: DEFAULT_SCHEDULE_PLAN.weeks,
};

function orderedDays(days: readonly string[]): PlanDay[] {
  return DAY_ORDER.filter((day) => days.includes(day));
}

/** What the dispatcher sent, as the card can hold it: each set once, known days Monday first, at most the cap. */
export function normalizeWeek(
  entries: ReadonlyArray<{ setId?: string | null; days?: readonly string[] | null }>
): WeekEntry[] {
  const seen = new Set<string>();
  const week: WeekEntry[] = [];
  for (const entry of entries) {
    const setId = entry.setId?.trim();
    if (!setId || seen.has(setId)) continue;
    seen.add(setId);
    week.push({ setId, days: orderedDays(entry.days ?? []) });
    if (week.length === MAX_WEEK_SETS) break;
  }
  return week;
}

/** A set gains or loses a day; a set keeps at least one day, so the last one cannot be switched off. */
export function toggleWeekDay(week: readonly WeekEntry[], setId: string, day: PlanDay): WeekEntry[] {
  return week.map((entry) => {
    if (entry.setId !== setId) return entry;
    const has = entry.days.includes(day);
    if (has && entry.days.length === 1) return entry;
    return { ...entry, days: has ? entry.days.filter((value) => value !== day) : orderedDays([...entry.days, day]) };
  });
}

/** Sets done on each weekday, Monday first: the week at a glance above the rows. */
export function weekOverview(week: readonly WeekEntry[]): Array<{ day: PlanDay; setIds: string[] }> {
  return DAY_ORDER.map((day) => ({
    day,
    setIds: week.filter((entry) => entry.days.includes(day)).map((entry) => entry.setId),
  }));
}

/** Send is possible once every set has a day. */
export function weekReady(week: readonly WeekEntry[]): boolean {
  return week.length > 0 && week.every((entry) => entry.days.length > 0);
}

/** The schedule one set is assigned with: the shared period and the set's own days. */
export function entryPlan(period: WeekPeriod, entry: WeekEntry): SchedulePlan {
  return planWithDays({ ...period, rhythm: 'daily' }, entry.days);
}

/** Sets still to send: a send that stopped half way is retried only for the rest. */
export function unsentEntries(week: readonly WeekEntry[], sentSetIds: readonly string[]): WeekEntry[] {
  return week.filter((entry) => !sentSetIds.includes(entry.setId));
}

/** "od jutra, 29 listopada · 4 tygodnie" */
export function describeWeekPeriod(period: WeekPeriod, now: Date = new Date()): string {
  const { startDate } = resolvePlanDates({ ...period, rhythm: 'daily' }, now);
  const startLabel =
    period.start === 'today' ? 'od dziś' : period.start === 'tomorrow' ? 'od jutra' : 'od poniedziałku';
  return `${startLabel}, ${formatPlanDate(startDate)} · ${planWeeksLabel(period.weeks)}`;
}

export function formatSetCount(count: number): string {
  return `${count} ${polishPlural(count, 'zestaw', 'zestawy', 'zestawów')}`;
}

/** "3 zestawy w tygodniu (od jutra, 29 listopada · 4 tygodnie)", the plan label of the Sent card. */
export function weekPlanLabel(count: number, period: WeekPeriod, now: Date = new Date()): string {
  return `${formatSetCount(count)} w tygodniu (${describeWeekPeriod(period, now)})`;
}
