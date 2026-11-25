import type { Frequency } from '../types';
import { getDefaultDaysForFrequency } from './scheduleUtils';

export const FREQUENCY_DAYS = [
  { key: 'monday', label: 'Pn', api: 'MONDAY' },
  { key: 'tuesday', label: 'Wt', api: 'TUESDAY' },
  { key: 'wednesday', label: 'Śr', api: 'WEDNESDAY' },
  { key: 'thursday', label: 'Cz', api: 'THURSDAY' },
  { key: 'friday', label: 'Pt', api: 'FRIDAY' },
  { key: 'saturday', label: 'So', api: 'SATURDAY' },
  { key: 'sunday', label: 'Nd', api: 'SUNDAY' },
] as const;

export type FrequencyDayKey = (typeof FREQUENCY_DAYS)[number]['key'];
export type FrequencyType = 'DAILY_1X' | 'DAILY_2X' | 'WEEKLY_3X' | 'SPECIFIC_DAYS';

const NO_DAYS = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
} as const;

export function getSelectedDaysCount(frequency: Frequency): number {
  return FREQUENCY_DAYS.filter((day) => frequency[day.key]).length;
}

export function detectFrequencyType(frequency: Frequency): FrequencyType {
  if (frequency.isFlexible === false || getSelectedDaysCount(frequency) > 0) return 'SPECIFIC_DAYS';

  const timesPerWeek = frequency.timesPerWeek ?? 7;
  if (timesPerWeek === 7) {
    return (frequency.timesPerDay ?? 1) >= 2 ? 'DAILY_2X' : 'DAILY_1X';
  }
  return 'WEEKLY_3X';
}

/** Kafelek trybu harmonogramu: wybrane dni zachowują zaznaczenie albo dostają domyślne 3 dni. */
export function applyFrequencyType(frequency: Frequency, nextType: FrequencyType): Frequency {
  if (nextType === 'SPECIFIC_DAYS') {
    const selectedDaysCount = getSelectedDaysCount(frequency);
    const defaultDays = selectedDaysCount > 0 ? null : getDefaultDaysForFrequency(3);
    return {
      ...frequency,
      timesPerDay: frequency.timesPerDay || 1,
      timesPerWeek: selectedDaysCount || 3,
      isFlexible: false,
      ...(defaultDays ?? {}),
    };
  }

  if (nextType === 'WEEKLY_3X') {
    return { ...frequency, timesPerDay: 1, timesPerWeek: 3, isFlexible: true, ...NO_DAYS };
  }

  return {
    ...frequency,
    timesPerDay: nextType === 'DAILY_2X' ? 2 : 1,
    timesPerWeek: 7,
    isFlexible: true,
    ...NO_DAYS,
  };
}

export function setFrequencyTimesPerWeek(frequency: Frequency, value: number): Frequency {
  if (detectFrequencyType(frequency) === 'SPECIFIC_DAYS') return frequency;
  return { ...frequency, timesPerWeek: value, isFlexible: true, ...NO_DAYS };
}

export function toggleFrequencyDay(frequency: Frequency, day: FrequencyDayKey): Frequency {
  if (detectFrequencyType(frequency) !== 'SPECIFIC_DAYS') return frequency;
  const next = { ...frequency, [day]: !frequency[day], isFlexible: false };
  return { ...next, timesPerWeek: getSelectedDaysCount(next) };
}
