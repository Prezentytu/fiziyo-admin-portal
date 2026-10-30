export const EXERCISES_PAGE_SIZE_OPTIONS = [12, 24, 48, 96] as const;
export const DEFAULT_EXERCISES_PAGE_SIZE = 24;

export interface ExercisesPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export function paginateExercises<T>(items: T[], page: number, pageSize: number): ExercisesPage<T> {
  const safePageSize = Math.max(Math.floor(pageSize) || DEFAULT_EXERCISES_PAGE_SIZE, 1);
  const totalCount = items.length;
  const totalPages = Math.max(Math.ceil(totalCount / safePageSize), 1);
  const safePage = Math.min(Math.max(Math.floor(page) || 1, 1), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalCount,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}
