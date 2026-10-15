/**
 * Polish noun form for a count: 1 ćwiczenie, 2–4 ćwiczenia, 5–21 ćwiczeń, 22–24 ćwiczenia.
 */
export function polishPlural(count: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(Math.trunc(count));
  if (absolute === 1) return one;
  const lastDigit = absolute % 10;
  const lastTwoDigits = absolute % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return few;
  return many;
}

export function formatExerciseCount(count: number): string {
  return `${count} ${polishPlural(count, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}`;
}
