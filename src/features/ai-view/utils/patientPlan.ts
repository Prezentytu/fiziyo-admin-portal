import type { ExerciseOverrideFields } from '@/components/shared/exercise/exerciseOverride';
import {
  resolveEffectiveExerciseParams,
  type EffectiveMappingSource,
} from '@/components/shared/exercise/resolveEffectiveExerciseParams';
import { formatSecondsPolish } from '@/utils/durationPolish';
import { formatPlanDate } from './schedulePlan';

/** Current like `isCurrentAssignmentStatus` in the app; no status is an old record, also current. */
const CURRENT_STATUSES = new Set(['assigned', 'active', 'in_progress', 'inprogress']);
const MAX_PLANS = 3;

export interface PlanAssignmentSource {
  id: string;
  status?: string | null;
  assignedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  exerciseOverrides?: string | null;
  exerciseSet?: {
    id: string;
    name: string;
    exerciseMappings?: ReadonlyArray<EffectiveMappingSource & { order?: number | null }> | null;
  } | null;
}

export interface PlanAdherenceSource {
  assignmentId: string;
  targetSessions: number;
  completedSessions: number;
}

export interface PatientPlanExercise {
  mappingId: string;
  name: string;
  /** "3 × 10", "3 × 10 na każdą stronę" (naprzemiennie w rekordzie 3.3) or "2 × 30 sekund"; one dose like on the patient card. */
  dose: string;
}

export interface PatientPlanSummary {
  assignmentId: string;
  setId: string;
  name: string;
  endDate?: string;
  exercises: PatientPlanExercise[];
  thisWeek?: { completed: number; target: number };
}

function parseOverrides(json?: string | null): Record<string, ExerciseOverrideFields> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, ExerciseOverrideFields>) : {};
  } catch {
    return {};
  }
}

export function isCurrentAssignmentStatus(status?: string | null): boolean {
  const normalized = status?.trim().toLowerCase().replace('-', '_');
  return !normalized || CURRENT_STATUSES.has(normalized);
}

/** Current plans with a set, newest first. */
function currentAssignments(assignments: readonly PlanAssignmentSource[]): PlanAssignmentSource[] {
  return assignments
    .filter((assignment) => assignment.exerciseSet && isCurrentAssignmentStatus(assignment.status))
    .toSorted((a, b) => (b.assignedAt ?? '').localeCompare(a.assignedAt ?? ''));
}

/**
 * What a patient has in their plan right now, read-only for the chat card: current plans, newest
 * first, exercises the patient sees (hidden ones dropped) with the dose after their overrides, and
 * this week's sessions. Same precedence as the patient card (`resolveEffectiveExerciseParams`).
 */
export function summarizePatientPlans(
  assignments: readonly PlanAssignmentSource[],
  adherence: readonly PlanAdherenceSource[] = []
): PatientPlanSummary[] {
  return currentAssignments(assignments)
    .slice(0, MAX_PLANS)
    .map((assignment) => {
      const set = assignment.exerciseSet!;
      const overrides = parseOverrides(assignment.exerciseOverrides);
      const exercises = (set.exerciseMappings ?? [])
        .toSorted((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .map((mapping) => resolveEffectiveExerciseParams(mapping, overrides[mapping.id]))
        .filter((effective) => !effective.hidden)
        .map((effective) => ({
          mappingId: effective.mappingId,
          name: effective.displayName,
          dose:
            effective.isTimeBased && effective.duration
              ? `${effective.sets} × ${formatSecondsPolish(effective.duration)}`
              : `${effective.sets} × ${effective.reps}${
                  effective.alternatingPerSide && effective.side?.toLowerCase() === 'alternating'
                    ? ' na każdą stronę'
                    : ''
                }`,
        }));
      const week = adherence.find((entry) => entry.assignmentId === assignment.id);
      return {
        assignmentId: assignment.id,
        setId: set.id,
        name: set.name,
        endDate: assignment.endDate ?? undefined,
        exercises,
        thisWeek: week ? { completed: week.completedSessions, target: week.targetSessions } : undefined,
      };
    });
}

/**
 * „Ten tydzień” and „Zestaw” of the context panel, from the same plans as the plan card. The panel
 * used to say „brak planu” whenever no session was counted this week (a plan starting tomorrow)
 * and to name the first set of the activity report, the older of two plans (test 17.11, P52).
 */
export function contextPlanFacts(
  assignments: readonly PlanAssignmentSource[],
  adherence: readonly PlanAdherenceSource[] = [],
  now: Date = new Date()
): { week: string; set: string } {
  const plans = currentAssignments(assignments);
  const set = plans[0]?.exerciseSet?.name ?? 'brak aktywnego';
  if (plans.length === 0) return { week: 'brak planu', set };

  const planIds = new Set(plans.map((plan) => plan.id));
  const weeks = adherence.filter((entry) => planIds.has(entry.assignmentId));
  const target = weeks.reduce((sum, week) => sum + week.targetSessions, 0);
  const completed = weeks.reduce((sum, week) => sum + week.completedSessions, 0);
  if (target > 0) return { week: `${completed} z ${target} treningów`, set };

  const starts = plans.map((plan) => (plan.startDate ? new Date(plan.startDate) : undefined));
  const upcoming = starts.filter((start): start is Date => start !== undefined && start.getTime() > now.getTime());
  if (upcoming.length === plans.length) {
    const first = new Date(Math.min(...upcoming.map((start) => start.getTime())));
    return { week: `plan od ${formatPlanDate(first)}`, set };
  }
  return { week: 'plan aktywny, brak treningów w tym tygodniu', set };
}
