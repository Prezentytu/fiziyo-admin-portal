import { describe, expect, it } from 'vitest';

import { describePlan, planFrequency, planStartDate, planWeeksLabel, resolvePlanDates } from '../schedulePlan';

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
  it('maps the rhythm to fixed weekdays, once a day', () => {
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
      tuesday: true,
      friday: true,
      monday: false,
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
