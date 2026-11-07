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
  scope,
}: ExerciseRoutingInput): ExerciseReportRoutingTarget {
  if (scope === 'ORGANIZATION') {
    return 'PENDING_ORG_REVIEW';
  }

  if (status === 'PUBLISHED') {
    return 'UPDATE_PENDING';
  }

  return 'PENDING_REVIEW';
}

interface ExerciseReportVisibilityInput {
  scope?: string | null;
  canReviewExercises: boolean;
}

/**
 * Jedna droga zgłaszania (Skrzynka #26): „Zgłoś do poprawki” jest tylko dla ćwiczenia z bazy FiziYo,
 * którego fizjoterapeuta nie może poprawić sam. Własne ćwiczenie gabinetu poprawia się edycją albo
 * w weryfikacji organizacji, a weryfikator FiziYo poprawia ćwiczenie globalne w centrum weryfikacji
 * („Popraw w weryfikacji”), więc nie zgłasza go do własnej skrzynki.
 */
export function canReportExerciseIssue({ scope, canReviewExercises }: ExerciseReportVisibilityInput): boolean {
  return scope === 'GLOBAL' && !canReviewExercises;
}
