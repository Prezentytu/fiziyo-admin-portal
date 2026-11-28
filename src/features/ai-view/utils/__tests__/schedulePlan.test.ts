import { describe, expect, it } from 'vitest';

import { DEFAULT_TEMPLATE_SET_FREQUENCY } from '@/features/exercise-sets/utils/createSetSubmit';
import {
  catalogRhythmOptions,
  catalogSetFrequency,
  DEFAULT_SCHEDULE_PLAN,
  describePlan,
  PLAN_DAYS,
  planWithDays,
  requestedSchedule,
  type PlanDay,
  type SchedulePlan,
  parseSchedulePlan,
  proposedPlan,
  rhythmOfFrequency,
  scheduleReplies,
  planFrequency,
  planStartDate,
  planWeeksLabel,
  resolvePlanDates,
} from '../schedulePlan';

const WORKDAYS: PlanDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Thursday, 30 October 2026, mid-day local time.
const THURSDAY = new Date(2026, 9, 30, 12, 0);
const MONDAY = new Date(2026, 10, 2, 9, 0);

describe('planStartDate', () => {
  it('starts today, tomorrow or on the coming Monday', () => {
    expect(planStartDate('today', THURSDAY)).toEqual(new Date(2026, 9, 30));
    expect(planStartDate('tomorrow', THURSDAY)).toEqual(new Date(2026, 9, 31));
    expect(planStartDate('monday', THURSDAY)).toEqual(new Date(2026, 10, 2));
  });

  it('means next week when said on a Monday', () => {
    expect(planStartDate('monday', MONDAY)).toEqual(new Date(2026, 10, 9));
  });
});

describe('resolvePlanDates', () => {
  it('ends on the last day of the last week, inclusive', () => {
    const { startDate, endDate } = resolvePlanDates({ start: 'tomorrow', weeks: 4, rhythm: 'daily' }, THURSDAY);
    expect(startDate).toEqual(new Date(2026, 9, 31));
    expect(endDate).toEqual(new Date(2026, 10, 27, 23, 59));
  });
});

describe('planFrequency', () => {
  it('maps the rhythm to fixed weekdays, once a day, the same days as the Assignment Wizard', () => {
    expect(planFrequency({ start: 'today', weeks: 2, rhythm: 'daily' })).toMatchObject({
      timesPerWeek: 7,
      sunday: true,
    });
    expect(planFrequency({ start: 'today', weeks: 2, rhythm: 'three' })).toMatchObject({
      timesPerDay: 1,
      timesPerWeek: 3,
      isFlexible: false,
      monday: true,
      tuesday: false,
      wednesday: true,
      friday: true,
    });
    expect(planFrequency({ start: 'today', weeks: 2, rhythm: 'two' })).toMatchObject({
      timesPerWeek: 2,
      monday: true,
      thursday: true,
      tuesday: false,
      friday: false,
    });
  });
});

describe('describePlan', () => {
  it('reads as one line for the summary card', () => {
    expect(describePlan({ start: 'tomorrow', weeks: 4, rhythm: 'daily' }, THURSDAY)).toBe(
      'od jutra, 31 października · 4 tygodnie · codziennie'
    );
  });

  it('declines weeks in Polish', () => {
    expect(planWeeksLabel(1)).toBe('1 tydzień');
    expect(planWeeksLabel(2)).toBe('2 tygodnie');
    expect(planWeeksLabel(6)).toBe('6 tygodni');
  });
});

// Test asystenta 17.11 (K7, P11, P85): harmonogram wpisany tekstem układał zestaw od nowa i gubił pacjenta.
describe('parseSchedulePlan', () => {
  it.each([
    ['od dziś, 3 razy w tygodniu, 4 tygodnie', { start: 'today', weeks: 4, rhythm: 'three' }],
    ['od jutra codziennie przez 6 tygodni', { start: 'tomorrow', weeks: 6, rhythm: 'daily' }],
    ['Od poniedziałku, 2x w tyg., 8 tyg', { start: 'monday', weeks: 8, rhythm: 'two' }],
    ['dwa razy w tygodniu przez miesiąc', { start: 'tomorrow', weeks: 4, rhythm: 'two' }],
    ['3× w tygodniu', { start: 'tomorrow', weeks: 2, rhythm: 'three' }],
    ['na 3 tygodnie', { start: 'tomorrow', weeks: 3, rhythm: 'daily' }],
    ['od przyszłego tygodnia, trzy razy w tygodniu, dwa miesiące', { start: 'monday', weeks: 8, rhythm: 'three' }],
    ['pon, śr, pt przez 4 tygodnie', { start: 'tomorrow', weeks: 4, rhythm: 'three' }],
    ['pasuje', { start: 'tomorrow', weeks: 2, rhythm: 'daily' }],
  ])('%s', (text, plan) => {
    expect(parseSchedulePlan(text)).toEqual({ plan, notes: [] });
  });

  it('takes the closest rhythm the chat has and says so', () => {
    const everyOther = parseSchedulePlan('co drugi dzień');
    expect(everyOther?.plan.rhythm).toBe('three');
    expect(everyOther?.notes.join(' ')).toContain('3× w tygodniu');
  });

  // Rozmowa 27.11: „raz w tygodniu co poniedziałek” czat zaokrąglał do 2× w tygodniu; dni ustawiamy dokładnie.
  it.each<[string, Partial<SchedulePlan>]>([
    ['raz w tygodniu co poniedziałek', { rhythm: 'daily', days: ['monday'] }],
    ['chcę aby raz w tygodniu co poniedziałek ten zestaw robił', { days: ['monday'] }],
    ['1x w tygodniu', { days: ['monday'] }],
    ['wtorki i czwartki, 4 tygodnie', { weeks: 4, days: ['tuesday', 'thursday'] }],
    ['od poniedziałku do piątku, 2 tygodnie', { start: 'tomorrow', weeks: 2, days: WORKDAYS }],
    ['Pon–pt, weekendy wolne, 2 tygodnie', { weeks: 2, days: WORKDAYS }],
    ['od dziś 5 razy w tygodniu', { start: 'today', days: WORKDAYS }],
    ['od poniedziałku, 4 tygodnie', { start: 'monday', weeks: 4, rhythm: 'daily' }],
  ])('sets the weekdays: %s', (text, expected) => {
    const parsed = parseSchedulePlan(text);
    expect(parsed?.notes).toEqual([]);
    expect(parsed?.plan).toMatchObject(expected);
    if (!expected.days) expect(parsed?.plan.days).toBeUndefined();
  });

  it('turns chosen days into a frequency with exactly those days', () => {
    const frequency = planFrequency({ start: 'tomorrow', weeks: 4, rhythm: 'daily', days: ['monday'] });
    expect(frequency).toMatchObject({ timesPerWeek: 1, monday: true, tuesday: false, sunday: false });
    expect(describePlan({ start: 'tomorrow', weeks: 4, rhythm: 'daily', days: ['monday'] })).toContain(
      'co poniedziałek'
    );
  });

  it('keeps a known rhythm when the days are its default ones', () => {
    expect(planWithDays(DEFAULT_SCHEDULE_PLAN, ['monday', 'wednesday', 'friday'])).toEqual({
      ...DEFAULT_SCHEDULE_PLAN,
      rhythm: 'three',
    });
    expect(
      planWithDays(
        { ...DEFAULT_SCHEDULE_PLAN, days: ['monday'] },
        PLAN_DAYS.map((day) => day.value)
      )
    ).toEqual(DEFAULT_SCHEDULE_PLAN);
  });

  it('opens the schedule step with what the therapist typed earlier', () => {
    const requested = requestedSchedule([
      'przypisz zestaw Przemkowi',
      'raz w tygodniu co poniedziałek',
      'Dalej: harmonogram',
    ]);
    expect(requested?.plan.days).toEqual(['monday']);
    expect(requestedSchedule(['przypisz zestaw Przemkowi', 'Dalej: harmonogram'])).toBeNull();
  });

  it('is not a schedule when the text names no start, length or rhythm', () => {
    for (const text of ['dodaj jeszcze mostek', 'a może coś na kolano', 'Jan Kowalski', '']) {
      expect(parseSchedulePlan(text)).toBeNull();
    }
  });
});

describe('catalog set frequency', () => {
  it('saves fewer sessions flexible, like the catalog default', () => {
    expect(catalogSetFrequency('three')).toEqual(DEFAULT_TEMPLATE_SET_FREQUENCY);
    expect(catalogSetFrequency('two')).toEqual({ ...DEFAULT_TEMPLATE_SET_FREQUENCY, timesPerWeek: '2' });
  });

  it('saves every day as all seven days', () => {
    expect(catalogSetFrequency('daily')).toMatchObject({
      timesPerWeek: '7',
      isFlexible: false,
      monday: true,
      sunday: true,
    });
  });

  it('reads back the rhythm it saved', () => {
    for (const rhythm of ['daily', 'three', 'two'] as const) {
      expect(rhythmOfFrequency(catalogSetFrequency(rhythm))).toBe(rhythm);
    }
  });

  it('counts fixed days, and leaves a rhythm the chat does not offer to the default', () => {
    expect(rhythmOfFrequency({ isFlexible: false, monday: true, thursday: true, timesPerWeek: 5 })).toBe('two');
    expect(rhythmOfFrequency({ isFlexible: true, timesPerWeek: 5 })).toBeUndefined();
    expect(rhythmOfFrequency(null)).toBeUndefined();
  });

  it("offers the set's rhythm first, else 3× a week", () => {
    expect(catalogRhythmOptions()).toEqual(['three', 'daily', 'two']);
    expect(catalogRhythmOptions('daily')).toEqual(['daily', 'three', 'two']);
  });
});

describe('proposed plan', () => {
  it("takes the set's rhythm, and the replies keep it", () => {
    const plan = proposedPlan('two');
    expect(plan.rhythm).toBe('two');
    const replies = scheduleReplies(plan);
    expect(replies[0].plan).toEqual(plan);
    expect(replies[1].plan).toEqual({ ...plan, start: 'monday' });
    expect(replies[3]).toEqual({ label: 'Codziennie', plan: { ...plan, rhythm: 'daily' } });
  });

  it('keeps the default replies without a set rhythm', () => {
    expect(scheduleReplies().map((reply) => reply.label)).toEqual([
      'Pasuje',
      'Od poniedziałku',
      'Na 6 tygodni',
      '3 razy w tygodniu',
    ]);
  });

  it('fills what a typed answer leaves out from the proposed plan', () => {
    const plan = proposedPlan('three');
    expect(parseSchedulePlan('pasuje', plan)?.plan).toEqual(plan);
    expect(parseSchedulePlan('od dziś', plan)?.plan).toEqual({ ...plan, start: 'today' });
  });
});
