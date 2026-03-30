/**
 * Dni tygodnia (zgodne z polem Frequency w assignment).
 * Używane przez getDefaultDaysForFrequency do rozkładu sesji w tygodniu.
 */
export interface WeekDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

const ALL_FALSE: WeekDays = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
};

/**
 * Zwraca domyślny rozkład dni tygodnia dla danej liczby sesji w tygodniu.
 * Dni są rozłożone równomiernie (np. 3 → Pn, Śr, Pt).
 *
 * @param timesPerWeek liczba sesji w tygodniu (1–7)
 */
export function getDefaultDaysForFrequency(timesPerWeek: number): WeekDays {
  const n = Math.max(1, Math.min(7, Math.round(timesPerWeek)));
  if (n >= 5) {
    return {
      ...ALL_FALSE,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    };
  }
  if (n >= 4) {
    return {
      ...ALL_FALSE,
      monday: true,
      wednesday: true,
      friday: true,
      saturday: true,
    };
  }
  if (n >= 3) {
    return {
      ...ALL_FALSE,
      monday: true,
      wednesday: true,
      friday: true,
    };
  }
  if (n >= 2) {
    return {
      ...ALL_FALSE,
      monday: true,
      thursday: true,
    };
  }
  return {
    ...ALL_FALSE,
    monday: true,
  };
}
