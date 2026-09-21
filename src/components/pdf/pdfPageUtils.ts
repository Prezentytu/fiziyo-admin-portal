import { formatDurationPolish, formatSeconds } from './polishUtils';

export const PDF_EXERCISES_PER_FULL_PAGE = 4;
export const PDF_EXERCISES_PER_COMPACT_PAGE = 10;

export function chunkExercisesForPages<T>(
  exercises: readonly T[],
  options: { compact?: boolean } = {}
): T[][] {
  const pageSize = options.compact ? PDF_EXERCISES_PER_COMPACT_PAGE : PDF_EXERCISES_PER_FULL_PAGE;
  if (exercises.length === 0) return [[]];
  const pages: T[][] = [];
  for (let index = 0; index < exercises.length; index += pageSize) {
    pages.push(exercises.slice(index, index + pageSize));
  }
  return pages;
}

export interface ExecutionParametersInput {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
}

export interface FormattedExecutionParameter {
  label: string;
  value: string;
}

export function formatExecutionParameters(params: ExecutionParametersInput): FormattedExecutionParameter[] {
  const items: FormattedExecutionParameter[] = [];

  if (params.sets) {
    items.push({ label: 'Serie', value: String(params.sets) });
  }
  if (params.reps) {
    items.push({ label: 'Powtórzenia', value: String(params.reps) });
  }
  if (!params.reps && params.duration) {
    items.push({ label: 'Czas', value: formatDurationPolish(params.duration) });
  }
  if (params.executionTime) {
    items.push({ label: 'Czas powtórzenia', value: formatSeconds(params.executionTime) });
  }
  if (params.restSets) {
    items.push({ label: 'Przerwa', value: formatSeconds(params.restSets) });
  }
  if (items.length === 0) {
    items.push({ label: 'Podstawowe parametry', value: 'Wg zaleceń' });
  }

  return items;
}

const LONG_DESCRIPTION_THRESHOLD = 280;

export function shouldAllowExerciseRowWrap(description: string | undefined): boolean {
  return (description?.length ?? 0) > LONG_DESCRIPTION_THRESHOLD;
}
