import { describe, expect, it } from 'vitest';

import { planFrequency } from '../schedulePlan';
import {
  entryPlan,
  MAX_WEEK_SETS,
  normalizeWeek,
  toggleWeekDay,
  unsentEntries,
  weekOverview,
  weekPlanLabel,
  weekReady,
} from '../weekPlan';

describe('weekPlan (SPEC-067)', () => {
  it('keeps each set once, at most the cap', () => {
    const many = Array.from({ length: MAX_WEEK_SETS + 3 }, (_, index) => ({ setId: `s${index}`, days: ['monday'] }));
    expect(normalizeWeek(many)).toHaveLength(MAX_WEEK_SETS);
    expect(normalizeWeek([{ setId: ' s1 ', days: ['sunday', 'monday'] }, { setId: 's1' }])).toEqual([
      { setId: 's1', days: ['monday', 'sunday'] },
    ]);
  });

  it('toggles a day, never leaving a set without one', () => {
    const week = [{ setId: 's1', days: ['monday' as const] }];
    expect(toggleWeekDay(week, 's1', 'thursday')).toEqual([{ setId: 's1', days: ['monday', 'thursday'] }]);
    expect(toggleWeekDay(week, 's1', 'monday')).toEqual(week);
  });

  it('shows what is done on each weekday, two sets on one day included', () => {
    const overview = weekOverview([
      { setId: 's1', days: ['monday'] },
      { setId: 's8', days: ['monday', 'sunday'] },
    ]);
    expect(overview[0]).toEqual({ day: 'monday', setIds: ['s1', 's8'] });
    expect(overview[1]).toEqual({ day: 'tuesday', setIds: [] });
    expect(overview[6]).toEqual({ day: 'sunday', setIds: ['s8'] });
  });

  it('is ready to send once every set has a day', () => {
    expect(weekReady([{ setId: 's1', days: ['monday'] }])).toBe(true);
    expect(
      weekReady([
        { setId: 's1', days: ['monday'] },
        { setId: 's2', days: [] },
      ])
    ).toBe(false);
    expect(weekReady([])).toBe(false);
  });

  it('assigns each set with the shared period and its own days', () => {
    const plan = entryPlan({ start: 'monday', weeks: 4 }, { setId: 's1', days: ['monday'] });
    expect(plan).toMatchObject({ start: 'monday', weeks: 4, days: ['monday'] });
    const frequency = planFrequency(plan);
    expect(frequency.timesPerWeek).toBe(1);
    expect(frequency.monday).toBe(true);
    expect(frequency.tuesday).toBe(false);
  });

  it('retries only the sets not sent yet', () => {
    const week = [
      { setId: 's1', days: ['monday' as const] },
      { setId: 's2', days: ['tuesday' as const] },
    ];
    expect(unsentEntries(week, ['s1'])).toEqual([week[1]]);
  });

  it('labels the sent week', () => {
    expect(weekPlanLabel(8, { start: 'tomorrow', weeks: 2 }, new Date(2026, 10, 28))).toBe(
      '8 zestawów w tygodniu (od jutra, 29 listopada · 2 tygodnie)'
    );
  });
});
