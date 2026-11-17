import { describe, expect, it } from 'vitest';

import {
  describePlan,
  parseSchedulePlan,
  planFrequency,
  planStartDate,
  planWeeksLabel,
  resolvePlanDates,
} from '../schedulePlan';

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
    const weekdays = parseSchedulePlan('od poniedziałku do piątku, 2 tygodnie');
    expect(weekdays?.plan).toEqual({ start: 'tomorrow', weeks: 2, rhythm: 'daily' });
    expect(weekdays?.notes.join(' ')).toContain('codziennie');

    const report = parseSchedulePlan('Pon–pt, weekendy wolne, 2 tygodnie');
    expect(report?.plan).toEqual({ start: 'tomorrow', weeks: 2, rhythm: 'daily' });
    expect(report?.notes).toHaveLength(1);

    const everyOther = parseSchedulePlan('co drugi dzień');
    expect(everyOther?.plan.rhythm).toBe('three');
    expect(everyOther?.notes.join(' ')).toContain('3× w tygodniu');

    const five = parseSchedulePlan('od dziś 5 razy w tygodniu');
    expect(five?.plan).toEqual({ start: 'today', weeks: 2, rhythm: 'daily' });
    expect(five?.notes).toHaveLength(1);
  });

  it('is not a schedule when the text names no start, length or rhythm', () => {
    for (const text of ['dodaj jeszcze mostek', 'a może coś na kolano', 'Jan Kowalski', '']) {
      expect(parseSchedulePlan(text)).toBeNull();
    }
  });
});
