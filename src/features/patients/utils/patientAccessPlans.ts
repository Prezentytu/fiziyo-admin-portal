import type { PdfMappingSource } from '@/components/pdf/pdfExerciseUtils';
import type { PatientAssignmentFrequency, PatientAssignmentListItem } from '@/graphql/types/operation-responses';
import { resolveAssignmentDisplayStatus } from './assignmentDisplayStatus';

/** Plan pacjenta w dialogu „Dostęp”: jedno przypisanie zestawu, nie sam zestaw. */
export interface PatientAccessPlan {
  /** Id przypisania: ten sam zestaw przypisany dwa razy to dwa plany. */
  id: string;
  exerciseSetId: string;
  name: string;
  description?: string;
  exerciseMappings: PdfMappingSource[];
  /** JSON `exerciseOverrides` przypisania; wygrywa z mappingiem na wydruku. */
  exerciseOverrides?: string | null;
  startDate?: string;
  endDate?: string;
  assignedAt?: string;
  frequency?: PatientAssignmentFrequency;
  isActive: boolean;
}

function timestamp(value?: string): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Przypisania zestawów pacjenta jako plany do druku.
 * Aktywność liczy ta sama reguła co badge statusu w panelu (status + data końca),
 * więc wstrzymany, zakończony, anulowany i wygasły plan nie udaje aktywnego.
 * Kolejność: aktywne najpierw, w grupie najnowsze przypisanie najpierw.
 */
export function buildPatientAccessPlans(
  assignments: readonly PatientAssignmentListItem[] | null | undefined,
  now: Date = new Date()
): PatientAccessPlan[] {
  const plans = (assignments ?? []).flatMap((assignment): PatientAccessPlan[] => {
    const exerciseSet = assignment.exerciseSet;
    if (!exerciseSet) return [];

    const { primary } = resolveAssignmentDisplayStatus({
      status: assignment.status,
      endDate: assignment.endDate,
      now,
    });

    return [
      {
        id: assignment.id,
        exerciseSetId: exerciseSet.id,
        name: exerciseSet.name ?? '',
        description: exerciseSet.description ?? undefined,
        exerciseMappings: Array.isArray(exerciseSet.exerciseMappings)
          ? (exerciseSet.exerciseMappings as PdfMappingSource[])
          : [],
        exerciseOverrides: assignment.exerciseOverrides,
        startDate: assignment.startDate ?? undefined,
        endDate: assignment.endDate ?? undefined,
        assignedAt: assignment.assignedAt ?? exerciseSet.creationTime ?? undefined,
        frequency: assignment.frequency,
        isActive: primary.kind === 'active' || primary.kind === 'expiring_soon',
      },
    ];
  });

  return plans.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return timestamp(b.assignedAt) - timestamp(a.assignedAt);
  });
}
