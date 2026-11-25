/** Same as backend TrashPolicy.RetentionDays. */
export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until the purge job removes the item; 0 when it is due. */
export function daysUntilPurge(purgeAt: string, now: Date = new Date()): number {
  const remaining = new Date(purgeAt).getTime() - now.getTime();
  return remaining <= 0 ? 0 : Math.ceil(remaining / DAY_MS);
}

/** „Usunie się za 3 dni” / „Usunie się jutro” / „Usunie się dziś”. */
export function purgeLabel(purgeAt: string, now: Date = new Date()): string {
  const days = daysUntilPurge(purgeAt, now);
  if (days === 0) return 'Usunie się dziś';
  if (days === 1) return 'Usunie się jutro';
  return `Usunie się za ${days} ${polishDays(days)}`;
}

function polishDays(count: number): string {
  return count === 1 ? 'dzień' : 'dni';
}
