import { describe, expect, it } from 'vitest';
import type { Frequency } from '../../types';
import {
  applyFrequencyType,
  detectFrequencyType,
  setFrequencyTimesPerWeek,
  toggleFrequencyDay,
} from '../frequencyPresets';

const FLEXIBLE_3X: Frequency = {
  timesPerDay: 1,
  timesPerWeek: 3,
  isFlexible: true,
  breakBetweenSets: 24,
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
};

describe('frequencyPresets', () => {
  it('rozpoznaje tryby harmonogramu', () => {
    expect(detectFrequencyType(FLEXIBLE_3X)).toBe('WEEKLY_3X');
    expect(detectFrequencyType({ ...FLEXIBLE_3X, timesPerWeek: 7 })).toBe('DAILY_1X');
    expect(detectFrequencyType({ ...FLEXIBLE_3X, timesPerWeek: 7, timesPerDay: 2 })).toBe('DAILY_2X');
    expect(detectFrequencyType({ ...FLEXIBLE_3X, isFlexible: false })).toBe('SPECIFIC_DAYS');
  });

  it('wybrane dni bez zaznaczenia dostają domyślne 3 dni', () => {
    const next = applyFrequencyType(FLEXIBLE_3X, 'SPECIFIC_DAYS');
    expect(next.isFlexible).toBe(false);
    expect([next.monday, next.wednesday, next.friday]).toEqual([true, true, true]);
    expect(next.timesPerWeek).toBe(3);
  });

  it('powrót do trybu elastycznego czyści dni', () => {
    const specific = applyFrequencyType(FLEXIBLE_3X, 'SPECIFIC_DAYS');
    const daily = applyFrequencyType(specific, 'DAILY_2X');
    expect(daily).toMatchObject({ isFlexible: true, timesPerWeek: 7, timesPerDay: 2, monday: false });
  });

  it('przełączenie dnia przelicza sesje w tygodniu', () => {
    const specific = applyFrequencyType(FLEXIBLE_3X, 'SPECIFIC_DAYS');
    const next = toggleFrequencyDay(specific, 'saturday');
    expect(next.saturday).toBe(true);
    expect(next.timesPerWeek).toBe(4);
  });

  it('dni i liczba w tygodniu nie mieszają się między trybami', () => {
    expect(toggleFrequencyDay(FLEXIBLE_3X, 'monday')).toBe(FLEXIBLE_3X);
    const specific = applyFrequencyType(FLEXIBLE_3X, 'SPECIFIC_DAYS');
    expect(setFrequencyTimesPerWeek(specific, 5)).toBe(specific);
    expect(setFrequencyTimesPerWeek(FLEXIBLE_3X, 5).timesPerWeek).toBe(5);
  });
});
