const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;

/**
 * Formatuje czas względny po polsku: "przed chwilą", "3 godz. temu", "wczoraj", "4 dni temu", "2 tyg. temu".
 * Pusta wartość daje pusty string.
 */
export function formatRelativeTime(value?: Date | string | null, now: Date = new Date()): string {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / HOUR_MS);
  const diffDays = Math.floor(diffMs / DAY_MS);

  if (diffHours < 1) return 'przed chwilą';
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return 'wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  return `${Math.floor(diffDays / 7)} tyg. temu`;
}
