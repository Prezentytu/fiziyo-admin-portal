import type { ExerciseReportRoutingTarget } from '@/types/exercise-report.types';

interface ExerciseRoutingInput {
  status?: string | null;
  scope?: string | null;
}

/**
 * Routing zgłoszenia jest additive-first i nie zmienia istniejącego lifecycle.
 * Published (globalny) kierujemy do toru poprawki update-pending.
 */
export function resolveExerciseReportRoutingTarget({
  status,
}: ExerciseRoutingInput): ExerciseReportRoutingTarget {
  if (status === 'PUBLISHED') {
    return 'UPDATE_PENDING';
  }

  return 'PENDING_REVIEW';
}
