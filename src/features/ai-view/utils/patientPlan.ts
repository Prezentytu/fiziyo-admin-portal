import type { ExerciseOverrideFields } from '@/components/shared/exercise/exerciseOverride';
import {
  resolveEffectiveExerciseParams,
  type EffectiveMappingSource,
} from '@/components/shared/exercise/resolveEffectiveExerciseParams';
import { formatSecondsPolish } from '@/utils/durationPolish';

/** Current like `isCurrentAssignmentStatus` in the app; no status is an old record, also current. */
const CURRENT_STATUSES = new Set(['assigned', 'active', 'in_progress', 'inprogress']);
const MAX_PLANS = 3;

export interface PlanAssignmentSource {
  id: string;
  status?: string | null;
  assignedAt?: string | null;
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

function isCurrent(status?: string | null): boolean {
  const normalized = status?.trim().toLowerCase().replace('-', '_');
  return !normalized || CURRENT_STATUSES.has(normalized);
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
  return assignments
    .filter((assignment) => assignment.exerciseSet && isCurrent(assignment.status))
    .toSorted((a, b) => (b.assignedAt ?? '').localeCompare(a.assignedAt ?? ''))
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
                  effective.alternatingPerSide && effective.side?.toLowerCase() === 'alternating' ? ' na każdą stronę' : ''
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
