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
}

/**
 * „Zgłoś do poprawki” jest dla ćwiczenia z bazy FiziYo, którego nie poprawisz edycją. Widzi je każdy,
 * także weryfikator FiziYo: zgłoszenie zostawia ślad w kolejce, a „Popraw w weryfikacji” jest obok.
 * Własne ćwiczenie gabinetu poprawia się edycją albo w weryfikacji organizacji, więc bez zgłoszenia.
 */
export function canReportExerciseIssue({ scope }: ExerciseReportVisibilityInput): boolean {
  return scope === 'GLOBAL';
}
