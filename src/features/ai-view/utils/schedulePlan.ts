import { addDays, startOfDay } from 'date-fns';

import type { Frequency } from '@/features/assignment/types';
import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import {
  buildAssignmentFrequencyPayload,
  normalizeFrequencySeed,
  type AssignmentFrequencyPayload,
  type FrequencyInput,
} from '@/features/assignment/utils/scheduleFrequencyUtils';
import { DEFAULT_TEMPLATE_SET_FREQUENCY } from '@/features/exercise-sets/utils/createSetSubmit';
import {
  DEFAULT_PLAN_WEEKS,
  getDefaultDaysForFrequency,
  type WeekDays,
} from '@/features/assignment/utils/scheduleUtils';
import { polishPlural } from '@/utils/polishPlural';

export type PlanStart = 'today' | 'tomorrow' | 'monday';
export type PlanRhythm = 'daily' | 'three' | 'two';

export type PlanDay = keyof WeekDays;

export interface SchedulePlan {
  start: PlanStart;
  weeks: number;
  rhythm: PlanRhythm;
  /**
   * Konkretne dni tygodnia („co poniedziałek”, „wt i czw”); gdy są, wygrywają z `rhythm`.
   * Rozmowa 27.11: „raz w tygodniu co poniedziałek” czat zaokrąglał do 2× w tygodniu.
   */
  days?: PlanDay[];
}

export const PLAN_DAYS: ReadonlyArray<{ value: PlanDay; short: string; label: string; every: string }> = [
  { value: 'monday', short: 'Pn', label: 'poniedziałek', every: 'co poniedziałek' },
  { value: 'tuesday', short: 'Wt', label: 'wtorek', every: 'co wtorek' },
  { value: 'wednesday', short: 'Śr', label: 'środa', every: 'co środę' },
  { value: 'thursday', short: 'Cz', label: 'czwartek', every: 'co czwartek' },
  { value: 'friday', short: 'Pt', label: 'piątek', every: 'co piątek' },
  { value: 'saturday', short: 'So', label: 'sobota', every: 'co sobotę' },
  { value: 'sunday', short: 'Nd', label: 'niedziela', every: 'co niedzielę' },
];

// Same default period as the assignment wizard, so the chat and the wizard propose one plan.
export const DEFAULT_SCHEDULE_PLAN: SchedulePlan = { start: 'tomorrow', weeks: DEFAULT_PLAN_WEEKS, rhythm: 'daily' };

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

/** The plan the schedule step proposes: the default one, in the rhythm of the catalog set when it has one. */
export function proposedPlan(rhythm?: PlanRhythm): SchedulePlan {
  return rhythm ? { ...DEFAULT_SCHEDULE_PLAN, rhythm } : DEFAULT_SCHEDULE_PLAN;
}

/** Quick replies under "Od kiedy i jak często?"; the first one accepts the proposed plan. */
export function scheduleReplies(
  proposed: SchedulePlan = DEFAULT_SCHEDULE_PLAN
): ReadonlyArray<{ label: string; plan: SchedulePlan }> {
  const otherRhythm: { label: string; rhythm: PlanRhythm } =
    proposed.rhythm === 'daily'
      ? { label: '3 razy w tygodniu', rhythm: 'three' }
      : { label: 'Codziennie', rhythm: 'daily' };
  return [
    { label: 'Pasuje', plan: proposed },
    { label: 'Od poniedziałku', plan: { ...proposed, start: 'monday' } },
    { label: 'Na 6 tygodni', plan: { ...proposed, weeks: 6 } },
    { label: otherRhythm.label, plan: { ...proposed, rhythm: otherRhythm.rhythm } },
  ];
}

const RHYTHM_TIMES_PER_WEEK: Record<PlanRhythm, number> = { daily: 7, three: 3, two: 2 };

const EVERY_DAY: WeekDays = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: true,
};

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

/**
 * The rhythm a catalog set was saved with, when it is one the chat offers; another one (5× w tygodniu)
 * is left to the default plan rather than rounded, so the proposal never claims the set says so.
 */
export function rhythmOfFrequency(frequency: FrequencyInput | null | undefined): PlanRhythm | undefined {
  if (!frequency) return undefined;
  const timesPerWeek = Number(buildAssignmentFrequencyPayload(frequency).timesPerWeek);
  return PLAN_RHYTHMS.find((option) => RHYTHM_TIMES_PER_WEEK[option.value] === timesPerWeek)?.value;
}

/** "Jak często?" before a catalog save: the catalog default (flexible 3× a week) first, unless the set had another rhythm. */
export function catalogRhythmOptions(suggested: PlanRhythm = 'three'): PlanRhythm[] {
  return [suggested, ...PLAN_RHYTHMS.map((option) => option.value).filter((value) => value !== suggested)];
}

/**
 * Frequency of a set saved in the catalog. Every day means all seven days; fewer sessions stay
 * flexible like the catalog default, so the patient (or the wizard later) picks the days.
 */
export function catalogSetFrequency(rhythm: PlanRhythm): AssignmentFrequencyPayload {
  if (rhythm === 'daily')
    return { ...DEFAULT_TEMPLATE_SET_FREQUENCY, timesPerWeek: '7', isFlexible: false, ...EVERY_DAY };
  return { ...DEFAULT_TEMPLATE_SET_FREQUENCY, timesPerWeek: String(RHYTHM_TIMES_PER_WEEK[rhythm]) };
}

/** Days the plan is done on: the chosen ones, or the Assignment Wizard's default for the rhythm. */
export function planDays(plan: SchedulePlan): PlanDay[] {
  if (plan.days?.length) return PLAN_DAYS.map((day) => day.value).filter((day) => plan.days?.includes(day));
  const days = plan.rhythm === 'daily' ? EVERY_DAY : getDefaultDaysForFrequency(RHYTHM_TIMES_PER_WEEK[plan.rhythm]);
  return PLAN_DAYS.map((day) => day.value).filter((day) => days[day]);
}

/** The same weekdays and defaults the Assignment Wizard picks for this many sessions a week, or the chosen days. */
export function planFrequency(plan: SchedulePlan): Frequency {
  const chosen = planDays(plan);
  const days = Object.fromEntries(
    PLAN_DAYS.map((day) => [day.value, chosen.includes(day.value)])
  ) as unknown as WeekDays;
  return normalizeFrequencySeed({ timesPerWeek: chosen.length, isFlexible: false, ...days });
}

/** A set of days as a rhythm when one fits (all seven = codziennie), so the card shows the same choice either way. */
export function planWithDays(plan: SchedulePlan, days: readonly PlanDay[]): SchedulePlan {
  const ordered = PLAN_DAYS.map((day) => day.value).filter((day) => days.includes(day));
  if (ordered.length === 0) return plan;
  const { days: _previous, ...rest } = plan;
  if (ordered.length === 7) return { ...rest, rhythm: 'daily' };
  // Pn, Śr, Pt to dokładnie domyślne dni rytmu 3×: zostaje rytm, karta pokazuje znany wybór.
  const asRhythm = (['three', 'two'] as const).find((rhythm) => {
    const defaults = getDefaultDaysForFrequency(RHYTHM_TIMES_PER_WEEK[rhythm]);
    return PLAN_DAYS.every((day) => defaults[day.value] === ordered.includes(day.value));
  });
  if (asRhythm) return { ...rest, rhythm: asRhythm };
  return { ...rest, days: ordered };
}

const DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' });

export function formatPlanDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

export function planWeeksLabel(weeks: number): string {
  return `${weeks} ${polishPlural(weeks, 'tydzień', 'tygodnie', 'tygodni')}`;
}

export function planRhythmLabel(rhythm: PlanRhythm): string {
  return PLAN_RHYTHMS.find((option) => option.value === rhythm)?.label ?? '';
}

/** „Co poniedziałek”, „Pn, Śr, Pt” albo rytm: jak często, w jednym miejscu dla zdania i karty. */
export function planScheduleLabel(plan: SchedulePlan): string {
  const days = plan.days ?? [];
  if (days.length === 0) return planRhythmLabel(plan.rhythm);
  if (days.length === 1) {
    const every = PLAN_DAYS.find((day) => day.value === days[0])?.every ?? '';
    return every.charAt(0).toUpperCase() + every.slice(1);
  }
  return PLAN_DAYS.filter((day) => days.includes(day.value))
    .map((day) => day.short)
    .join(', ');
}

/** "od jutra, 31 października · 4 tygodnie · codziennie" */
export function describePlan(plan: SchedulePlan, now: Date = new Date()): string {
  const { startDate } = resolvePlanDates(plan, now);
  const startLabel = plan.start === 'today' ? 'od dziś' : plan.start === 'tomorrow' ? 'od jutra' : 'od poniedziałku';
  const schedule =
    plan.days?.length && plan.days.length > 1 ? planScheduleLabel(plan) : planScheduleLabel(plan).toLowerCase();
  return `${startLabel}, ${formatPlanDate(startDate)} · ${planWeeksLabel(plan.weeks)} · ${schedule}`;
}

/** The therapist stopped the flow before sending: nothing went to the patient. */
export const FLOW_CANCEL_LABEL = 'Anuluj';
export const FLOW_CANCELLED_TEXT = 'Anulowane. Nic nie zostało wysłane, propozycja zestawu zostaje wyżej.';

/** The sentence above "Gotowe do wysłania"; notes say what a typed schedule could not set. */
export function sendSummaryText(plan: SchedulePlan, notes: readonly string[] = []): string {
  return [...notes, `Gotowe do wysłania: ${describePlan(plan)}. Sprawdź i wyślij.`].join(' ');
}

const NUMBER_WORDS: Record<string, number> = {
  jeden: 1,
  jedna: 1,
  dwa: 2,
  dwie: 2,
  trzy: 3,
  cztery: 4,
  piec: 5,
  szesc: 6,
  siedem: 7,
  osiem: 8,
};
const NUMBER = `(\\d+|${Object.keys(NUMBER_WORDS).join('|')})`;
const TIMES_A_WEEK = new RegExp(`${NUMBER}\\s*(?:x|×|razy|raz)(?![a-z0-9])(?:\\s*(?:w|na)\\s*tyg[a-z]*\\.?)?`);
const ONCE_A_WEEK = /(?:^|\s)raz (?:w|na) tyg[a-z]*\.?/;
const WEEKS = new RegExp(`${NUMBER}\\s*(?:tyg|tydz)`);
const MONTHS = new RegExp(`${NUMBER}\\s*mies`);
const WEEKDAY_RANGE =
  /od poniedzialku do piatku|pon[a-z]*\.?\s*(?:-|do)\s*(?:pt|piat[a-z]*)|dni robocze|dni powszednie|weekend[a-z]* woln[a-z]*|bez weekend[a-z]*/;
const WEEKDAYS: ReadonlyArray<[PlanDay, RegExp]> = [
  ['monday', /(?:^|[\s,])(?:pon|pn|poniedzial[a-z]*)(?=[\s,.]|$)/],
  ['tuesday', /(?:^|[\s,])(?:wt|wtor[a-z]*)(?=[\s,.]|$)/],
  ['wednesday', /(?:^|[\s,])(?:sr|srod[a-z]*)(?=[\s,.]|$)/],
  ['thursday', /(?:^|[\s,])(?:czw|cz|czwart[a-z]*)(?=[\s,.]|$)/],
  ['friday', /(?:^|[\s,])(?:pt|piat[a-z]*)(?=[\s,.]|$)/],
  ['saturday', /(?:^|[\s,])(?:sob|so|sobot[a-z]*)(?=[\s,.]|$)/],
  ['sunday', /(?:^|[\s,])(?:nd|niedz|niedziel[a-z]*)(?=[\s,.]|$)/],
];
const WORKDAYS: PlanDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const ACCEPTS_DEFAULT = /^(?:pasuje|ok|okej|tak|dobrze|zgoda|moze byc)[\s.!]*$/;
const MAX_TYPED_WEEKS = 12;

function toNumber(token: string): number {
  return NUMBER_WORDS[token] ?? Number.parseInt(token, 10);
}

function closestRhythm(timesPerWeek: number): PlanRhythm {
  if (timesPerWeek <= 2) return 'two';
  return timesPerWeek <= 4 ? 'three' : 'daily';
}

export interface ParsedSchedule {
  plan: SchedulePlan;
  /** What the text asked for and the chat cannot set yet, with what was set instead. */
  notes: string[];
}

/**
 * A schedule typed as an answer to "Od kiedy i jak często?" ("od dziś, 3 razy w tygodniu, 4 tygodnie").
 * What the text leaves out stays as proposed; a rhythm the chat does not have becomes the closest
 * one with a note; `proposed` is the plan the question offered. Null when the text names no start, length or rhythm: it is not a schedule.
 */
export function parseSchedulePlan(text: string, proposed: SchedulePlan = DEFAULT_SCHEDULE_PLAN): ParsedSchedule | null {
  let rest = normalizeSearchText(text).replace(/[–—]/g, '-').trim();
  if (!rest) return null;
  if (ACCEPTS_DEFAULT.test(rest)) return { plan: proposed, notes: [] };

  const notes: string[] = [];
  let rhythm: PlanRhythm | undefined;
  let days: PlanDay[] | undefined;
  const setClosest = (asked: string, timesPerWeek: number) => {
    rhythm = closestRhythm(timesPerWeek);
    notes.push(
      `${asked} nie da się jeszcze ustawić w czacie. Ustawione najbliższe: ${planRhythmLabel(rhythm).toLowerCase()}.`
    );
  };
  // „od poniedziałku” to start planu, nie dzień ćwiczeń.
  const named = WEEKDAYS.filter(([, pattern]) => pattern.test(rest.replace(/od pon[a-z]*/g, ' '))).map(([day]) => day);

  if (WEEKDAY_RANGE.test(rest)) {
    days = WORKDAYS;
    rest = rest.replace(WEEKDAY_RANGE, ' ');
  } else if (/co drugi dzien|co 2 dni|co 2\.? dzien/.test(rest)) {
    setClosest('Co drugi dzień', 3.5);
  } else if (/codzien|co dzien|kazdego dnia|dzien w dzien/.test(rest)) {
    rhythm = 'daily';
  } else {
    const times = TIMES_A_WEEK.exec(rest);
    const timesPerWeek = times ? toNumber(times[1]) : ONCE_A_WEEK.test(rest) ? 1 : undefined;
    if (times) rest = rest.replace(TIMES_A_WEEK, ' ');
    if (named.length > 0) days = named;
    else if (timesPerWeek === 7) rhythm = 'daily';
    else if (timesPerWeek === 3) rhythm = 'three';
    else if (timesPerWeek === 2) rhythm = 'two';
    else if (timesPerWeek !== undefined && timesPerWeek >= 1 && timesPerWeek <= 6) {
      const defaults = getDefaultDaysForFrequency(timesPerWeek);
      days = PLAN_DAYS.map((day) => day.value).filter((day) => defaults[day]);
    }
  }

  let start: PlanStart | undefined;
  if (/(?:^|\s)(?:dzis|dzisiaj|od zaraz|od razu)(?=[\s,.]|$)/.test(rest)) start = 'today';
  else if (/jutr/.test(rest)) start = 'tomorrow';
  else if (/od pon|od (?:przyszlego|nastepnego) tyg/.test(rest) || (!days && /w poniedzialek/.test(rest)))
    start = 'monday';

  let weeks: number | undefined;
  const weeksMatch = WEEKS.exec(rest);
  const monthsMatch = MONTHS.exec(rest);
  if (weeksMatch) weeks = toNumber(weeksMatch[1]);
  else if (/poltora mies/.test(rest)) weeks = 6;
  else if (monthsMatch) weeks = toNumber(monthsMatch[1]) * 4;
  else if (/(?:na|przez) miesiac/.test(rest)) weeks = 4;
  else if (/(?:na|przez) tydzien/.test(rest)) weeks = 1;
  if (weeks !== undefined && (!Number.isFinite(weeks) || weeks < 1)) weeks = undefined;
  if (weeks !== undefined && weeks > MAX_TYPED_WEEKS) {
    notes.push(
      `${planWeeksLabel(weeks)} to więcej, niż da się ustawić w czacie. Ustawione: ${planWeeksLabel(MAX_TYPED_WEEKS)}.`
    );
    weeks = MAX_TYPED_WEEKS;
  }

  if (start === undefined && weeks === undefined && rhythm === undefined && days === undefined) return null;
  const base: SchedulePlan = {
    start: start ?? proposed.start,
    weeks: weeks ?? proposed.weeks,
    rhythm: rhythm ?? proposed.rhythm,
    ...(rhythm === undefined && proposed.days && { days: proposed.days }),
  };
  return { plan: days ? planWithDays(base, days) : base, notes };
}

/** How far back a typed schedule still counts: the request and the turns that led to the set proposal. */
const REQUESTED_SCHEDULE_LOOKBACK = 6;

/**
 * Rozmowa 27.11: „chcę, aby raz w tygodniu co poniedziałek ten zestaw robił” przy propozycji zestawu poszło do
 * modelu, a krok harmonogramu i tak proponował „codziennie”. Krok harmonogramu bierze najnowszy harmonogram
 * wpisany przez fizjoterapeutę od ostatniej wysyłki (zdania, w których jest dzień, rytm albo liczba tygodni).
 */
export function requestedSchedule(
  userTexts: readonly string[],
  proposed: SchedulePlan = DEFAULT_SCHEDULE_PLAN
): ParsedSchedule | null {
  for (const text of userTexts.slice(-REQUESTED_SCHEDULE_LOOKBACK).reverse()) {
    if (ACCEPTS_DEFAULT.test(normalizeSearchText(text).trim())) continue;
    const parsed = parseSchedulePlan(text, proposed);
    if (parsed) return parsed;
  }
  return null;
}
