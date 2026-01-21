/**
 * Funkcje pomocnicze do polskiej odmiany i formatowania
 */

/**
 * Odmiana polska dla "seria/serie/serii"
 */
export function formatSets(count: number): string {
  if (count === 1) return '1 seria';
  if (count >= 2 && count <= 4) return `${count} serie`;
  return `${count} serii`;
}

/**
 * Odmiana polska dla "powtórzenie/powtórzenia/powtórzeń"
 */
export function formatReps(count: number): string {
  if (count === 1) return '1 powtórzenie';
  if (count >= 2 && count <= 4) return `${count} powtórzenia`;
  return `${count} powtórzeń`;
}

/**
 * Odmiana polska dla sekund
 */
export function formatSeconds(count: number): string {
  if (count === 1) return '1 sekunda';
  if (count >= 2 && count <= 4) return `${count} sekundy`;
  return `${count} sekund`;
}

/**
 * Formatowanie czasu trwania w czytelnej formie
 */
export function formatDurationPolish(seconds: number): string {
  if (seconds < 60) {
    return formatSeconds(seconds);
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  let result = '';
  if (minutes === 1) {
    result = '1 minuta';
  } else if (minutes >= 2 && minutes <= 4) {
    result = `${minutes} minuty`;
  } else {
    result = `${minutes} minut`;
  }

  if (remainingSeconds > 0) {
    result += ` ${formatSeconds(remainingSeconds)}`;
  }

  return result;
}

/**
 * Odmiana polska dla "ćwiczenie/ćwiczenia/ćwiczeń"
 */
export function formatExercises(count: number): string {
  if (count === 1) return '1 ćwiczenie';
  if (count >= 2 && count <= 4) return `${count} ćwiczenia`;
  return `${count} ćwiczeń`;
}

/**
 * Odmiana polska dla "raz/razy"
 */
export function formatTimes(count: number): string {
  if (count === 1) return '1 raz';
  return `${count} razy`;
}

/**
 * Formatowanie dni tygodnia do czytelnej listy
 */
export function formatDaysPolish(frequency: {
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
}): string {
  const dayNames = {
    monday: 'Poniedziałek',
    tuesday: 'Wtorek',
    wednesday: 'Środa',
    thursday: 'Czwartek',
    friday: 'Piątek',
    saturday: 'Sobota',
    sunday: 'Niedziela',
  };

  const activeDays: string[] = [];

  if (frequency.monday) activeDays.push(dayNames.monday);
  if (frequency.tuesday) activeDays.push(dayNames.tuesday);
  if (frequency.wednesday) activeDays.push(dayNames.wednesday);
  if (frequency.thursday) activeDays.push(dayNames.thursday);
  if (frequency.friday) activeDays.push(dayNames.friday);
  if (frequency.saturday) activeDays.push(dayNames.saturday);
  if (frequency.sunday) activeDays.push(dayNames.sunday);

  if (activeDays.length === 0) return 'Brak wybranych dni';
  if (activeDays.length === 7) return 'Codziennie';
  if (activeDays.length === 5 && !frequency.saturday && !frequency.sunday) {
    return 'Od poniedziałku do piątku';
  }

  return activeDays.join(', ');
}

/**
 * Tłumaczenie typu ćwiczenia (wersja pełna)
 * Obsługuje zarówno REPS/TIME jak i reps/time
 */
export function translateExerciseTypePolish(type?: string): string {
  if (!type) return '';
  const types: Record<string, string> = {
    reps: 'Na powtórzenia',
    time: 'Na czas',
  };
  return types[type.toLowerCase()] || type;
}

/**
 * Tłumaczenie typu ćwiczenia (wersja krótka dla badge'y)
 * Obsługuje zarówno REPS/TIME jak i reps/time
 */
export function translateExerciseTypeShort(type?: string): string {
  if (!type) return '';
  const types: Record<string, string> = {
    reps: 'Powtórzenia',
    time: 'Czasowe',
  };
  return types[type.toLowerCase()] || type;
}

/**
 * Tłumaczenie strony ćwiczenia
 * Obsługuje zarówno LEFT/RIGHT/etc jak i left/right/etc
 */
export function translateExerciseSidePolish(side?: string): string {
  if (!side) return '';
  const sides: Record<string, string> = {
    left: 'Lewa strona',
    right: 'Prawa strona',
    alternating: 'Naprzemiennie L/P',
    both: 'Obie strony jednocześnie',
    none: '',
  };
  return sides[side.toLowerCase()] || '';
}
