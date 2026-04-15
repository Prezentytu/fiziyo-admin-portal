const WEEK_DAY_SHORTCUTS = [
  { key: 'monday', label: 'Pn' },
  { key: 'tuesday', label: 'Wt' },
  { key: 'wednesday', label: 'Śr' },
  { key: 'thursday', label: 'Cz' },
  { key: 'friday', label: 'Pt' },
  { key: 'saturday', label: 'So' },
  { key: 'sunday', label: 'Nd' },
] as const;

type FrequencyNumberLike = number | string | null | undefined;

export interface FrequencyDisplayValue {
  timesPerWeek?: FrequencyNumberLike;
  monday?: boolean | null;
  tuesday?: boolean | null;
  wednesday?: boolean | null;
  thursday?: boolean | null;
  friday?: boolean | null;
  saturday?: boolean | null;
  sunday?: boolean | null;
}

function normalizeTimesPerWeek(timesPerWeek?: FrequencyNumberLike): number | null {
  if (timesPerWeek === null || timesPerWeek === undefined) {
    return null;
  }

  const parsed = typeof timesPerWeek === 'string' ? Number(timesPerWeek) : timesPerWeek;
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed > 0 ? Math.round(parsed) : null;
}

function getSelectedDayShortcuts(frequency: FrequencyDisplayValue): string[] {
  return WEEK_DAY_SHORTCUTS.filter((day) => Boolean(frequency[day.key])).map((day) => day.label);
}

export function formatTimesPerWeekRecommendation(timesPerWeek?: FrequencyNumberLike): string | null {
  const normalizedTimesPerWeek = normalizeTimesPerWeek(timesPerWeek);
  if (!normalizedTimesPerWeek) {
    return null;
  }

  const timesLabel = normalizedTimesPerWeek === 1 ? 'raz' : 'razy';
  return `${normalizedTimesPerWeek} ${timesLabel} w tygodniu`;
}

export function formatFrequencyDisplay(frequency?: FrequencyDisplayValue): string {
  if (!frequency) {
    return 'Brak harmonogramu';
  }

  const selectedDayShortcuts = getSelectedDayShortcuts(frequency);
  const selectedDaysCount = selectedDayShortcuts.length;

  if (selectedDaysCount === 7) {
    return 'Codziennie';
  }

  if (selectedDaysCount === 5 && !frequency.saturday && !frequency.sunday) {
    return 'Pn-Pt';
  }

  if (selectedDaysCount > 0) {
    return selectedDayShortcuts.join(', ');
  }

  return formatTimesPerWeekRecommendation(frequency.timesPerWeek) ?? 'Brak harmonogramu';
}
