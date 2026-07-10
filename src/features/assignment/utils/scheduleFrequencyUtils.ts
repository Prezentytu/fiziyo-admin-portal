import type { Frequency } from '../types';

const WEEK_DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

type FrequencyNumber = number | string | null | undefined;

export interface FrequencyInput {
  timesPerDay?: FrequencyNumber;
  timesPerWeek?: FrequencyNumber;
  minTimesPerWeek?: FrequencyNumber;
  breakBetweenSets?: FrequencyNumber;
  isFlexible?: boolean | null;
  monday?: boolean | null;
  tuesday?: boolean | null;
  wednesday?: boolean | null;
  thursday?: boolean | null;
  friday?: boolean | null;
  saturday?: boolean | null;
  sunday?: boolean | null;
}

export interface AssignmentFrequencyPayload {
  timesPerDay: string;
  timesPerWeek: string;
  breakBetweenSets: string;
  isFlexible: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

function normalizePositiveInteger(value: FrequencyNumber, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
}

function normalizeNonNegativeNumber(value: FrequencyNumber, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export function hasSelectedScheduleDays(frequency: FrequencyInput): boolean {
  return WEEK_DAY_KEYS.some((day) => frequency[day] === true);
}

function getSelectedScheduleDaysCount(frequency: FrequencyInput): number {
  return WEEK_DAY_KEYS.filter((day) => frequency[day] === true).length;
}

export function normalizeFrequencySeed(frequency?: FrequencyInput | null): Frequency {
  const hasSelectedDays = frequency ? hasSelectedScheduleDays(frequency) : false;
  const isFlexible = frequency?.isFlexible ?? !hasSelectedDays;

  return {
    timesPerDay: normalizePositiveInteger(frequency?.timesPerDay, 1),
    timesPerWeek: normalizePositiveInteger(frequency?.timesPerWeek, 3),
    minTimesPerWeek:
      frequency?.minTimesPerWeek === undefined || frequency.minTimesPerWeek === null
        ? undefined
        : normalizePositiveInteger(frequency.minTimesPerWeek, 1),
    breakBetweenSets: normalizeNonNegativeNumber(frequency?.breakBetweenSets, 4),
    isFlexible,
    monday: isFlexible ? false : (frequency?.monday ?? false),
    tuesday: isFlexible ? false : (frequency?.tuesday ?? false),
    wednesday: isFlexible ? false : (frequency?.wednesday ?? false),
    thursday: isFlexible ? false : (frequency?.thursday ?? false),
    friday: isFlexible ? false : (frequency?.friday ?? false),
    saturday: isFlexible ? false : (frequency?.saturday ?? false),
    sunday: isFlexible ? false : (frequency?.sunday ?? false),
  };
}

export function buildAssignmentFrequencyPayload(frequency: FrequencyInput): AssignmentFrequencyPayload {
  const normalized = normalizeFrequencySeed(frequency);
  const isFlexible = normalized.isFlexible === true;
  const selectedDaysCount = getSelectedScheduleDaysCount(normalized);

  return {
    timesPerDay: String(normalized.timesPerDay),
    timesPerWeek: String(isFlexible ? normalized.timesPerWeek : selectedDaysCount),
    breakBetweenSets: String(normalized.breakBetweenSets),
    isFlexible,
    monday: isFlexible ? false : normalized.monday,
    tuesday: isFlexible ? false : normalized.tuesday,
    wednesday: isFlexible ? false : normalized.wednesday,
    thursday: isFlexible ? false : normalized.thursday,
    friday: isFlexible ? false : normalized.friday,
    saturday: isFlexible ? false : normalized.saturday,
    sunday: isFlexible ? false : normalized.sunday,
  };
}
