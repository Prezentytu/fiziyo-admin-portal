import { differenceInDays, format, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { formatFrequencyDisplay } from '@/utils/frequencyDisplay';

const DAY_SHORTCUTS = [
  { key: 'monday', label: 'Pn' },
  { key: 'tuesday', label: 'Wt' },
  { key: 'wednesday', label: 'Śr' },
  { key: 'thursday', label: 'Cz' },
  { key: 'friday', label: 'Pt' },
  { key: 'saturday', label: 'So' },
  { key: 'sunday', label: 'Nd' },
] as const;

type DateLike = Date | string;

export interface ScheduleFrequencyLike {
  timesPerDay?: number;
  timesPerWeek?: number;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
}

export interface ScheduleSummaryInput {
  startDate: DateLike;
  endDate: DateLike;
  frequency: ScheduleFrequencyLike;
}

export interface ScheduleSummary {
  startDate: Date;
  endDate: Date;
  durationDays: number;
  effectiveWeeklyFrequency: number;
  totalSessions: number;
  isFlexibleMode: boolean;
  dayLabels: string[] | null;
  frequencyLabel: string;
  timesPerDay: number;
}

export function pluralizeDay(dayCount: number): string {
  return dayCount === 1 ? 'dzień' : 'dni';
}

export function calculateScheduleSummary(input: ScheduleSummaryInput): ScheduleSummary {
  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);
  const normalizedTimesPerDay = normalizePositiveInt(input.frequency.timesPerDay, 1);
  const selectedDayLabels = DAY_SHORTCUTS.filter((day) =>
    Boolean(input.frequency[day.key as keyof ScheduleFrequencyLike])
  ).map((day) => day.label);
  const selectedDaysCount = selectedDayLabels.length;
  const isFlexibleMode = selectedDaysCount === 0;
  const effectiveWeeklyFrequency = isFlexibleMode
    ? normalizePositiveInt(input.frequency.timesPerWeek, 3)
    : selectedDaysCount;
  const durationDays = Math.max(1, differenceInDays(startOfDay(endDate), startOfDay(startDate)));
  const totalSessions = Math.round((durationDays / 7) * effectiveWeeklyFrequency * normalizedTimesPerDay);

  return {
    startDate,
    endDate,
    durationDays,
    effectiveWeeklyFrequency,
    totalSessions,
    isFlexibleMode,
    dayLabels: isFlexibleMode ? null : selectedDayLabels,
    frequencyLabel: formatFrequencyDisplay(input.frequency),
    timesPerDay: normalizedTimesPerDay,
  };
}

export function formatScheduleDateRange(startDate: DateLike, endDate: DateLike, style: 'short' | 'long'): string {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (style === 'short') {
    return `${format(start, 'dd.MM.yyyy', { locale: pl })}–${format(end, 'dd.MM.yyyy', { locale: pl })}`;
  }

  return `${format(start, 'd MMM yyyy', { locale: pl })} — ${format(end, 'd MMM yyyy', { locale: pl })}`;
}

export function formatScheduleCompact(summary: ScheduleSummary): string {
  return `${formatScheduleDateRange(summary.startDate, summary.endDate, 'short')} · ${summary.durationDays} ${pluralizeDay(summary.durationDays)} · ${summary.effectiveWeeklyFrequency}×/tyg · ~${summary.totalSessions} sesji`;
}

export function formatScheduleDetailed(summary: ScheduleSummary): string {
  const frequencyPart = `${summary.frequencyLabel}, ${summary.timesPerDay}× dziennie`;
  return [
    `Start: ${format(summary.startDate, 'dd.MM.yyyy', { locale: pl })}`,
    `Koniec: ${format(summary.endDate, 'dd.MM.yyyy', { locale: pl })}`,
    `Okres: ${summary.durationDays} ${pluralizeDay(summary.durationDays)}`,
    `Częstotliwość: ${frequencyPart}`,
    `Szacowane sesje: ~${summary.totalSessions}`,
  ].join('\n');
}

export function calculateStartInDays(startDate: DateLike, now: Date = new Date()): number {
  return differenceInDays(startOfDay(normalizeDate(startDate)), startOfDay(now));
}

function normalizeDate(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value);
}

function normalizePositiveInt(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.max(1, Math.round(value));
}
