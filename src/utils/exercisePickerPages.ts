import type { ExerciseLibraryTab } from '@/types/apollo';
import type { ExerciseSourceFilter } from '@/utils/exerciseSourceFilter';

export const EXERCISE_PICKER_PAGE_SIZE = 50;
export const POPULAR_EXERCISE_LIMIT = 10;

const TAB_BY_SOURCE: Record<ExerciseSourceFilter, ExerciseLibraryTab> = {
  all: 'ALL',
  organization: 'ORGANIZATION',
  fiziyo: 'FIZIYO',
};

export function toPickerLibraryTab(sourceFilter: ExerciseSourceFilter): ExerciseLibraryTab {
  return TAB_BY_SOURCE[sourceFilter];
}

/** Items of the loaded pages in page order, each exercise once (a record can move between pages after a write). */
export function flattenPickerPages<T extends { id: string }>(pages: ReadonlyMap<number, readonly T[]>): T[] {
  const seen = new Set<string>();
  const items: T[] = [];
  for (const page of [...pages.keys()].sort((left, right) => left - right)) {
    for (const item of pages.get(page) ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

/** Most used exercise ids, most used first; ties keep a stable order by id. */
export function topPopularExerciseIds(
  popularity: Readonly<Record<string, number>> | undefined,
  limit: number = POPULAR_EXERCISE_LIMIT
): string[] {
  return Object.entries(popularity ?? {})
    .filter(([, count]) => count > 0)
    .sort(([leftId, left], [rightId, right]) => right - left || leftId.localeCompare(rightId))
    .slice(0, limit)
    .map(([exerciseId]) => exerciseId);
}

/**
 * Every exercise record the picker knows: loaded pages first, then records fetched by id.
 * A page record wins, because the pages are refetched after writes and carry the current `updatedAt`.
 */
export function mergeKnownExercises<T extends { id: string }>(
  pageItems: readonly T[],
  recordsById: ReadonlyMap<string, T>
): T[] {
  const merged = [...pageItems];
  const pageIds = new Set(pageItems.map((item) => item.id));
  for (const [exerciseId, record] of recordsById) {
    if (!pageIds.has(exerciseId)) merged.push(record);
  }
  return merged;
}
