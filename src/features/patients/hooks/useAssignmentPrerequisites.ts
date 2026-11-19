import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';

import {
  EXERCISE_DEPENDENCY_INVALID,
  buildPrerequisiteOptions,
} from '@/features/exercise-sets/utils/exerciseDependencies';
import { getGraphQLErrorCode, getGraphQLErrorMessage } from '@/features/patients/utils/patientConsent';
import { GET_PATIENT_ASSIGNMENT_PREREQUISITES_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { SET_ASSIGNMENT_PREREQUISITE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import type {
  GetPatientAssignmentPrerequisitesResponse,
  SetAssignmentPrerequisiteResponse,
  SetAssignmentPrerequisiteVariables,
} from '@/graphql/types';

interface AssignmentLike {
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
}

export interface AssignmentPrerequisiteControl {
  readonly currentId: string | null;
  readonly options: readonly { id: string; name: string }[];
  readonly saving: boolean;
  readonly onChange: (requiresAssignmentId: string | null) => void;
}

/**
 * „Zestaw po zestawie” (SPEC-061): który zestaw pacjent robi przed danym. Zwraca null dla przypisania, gdy API nie zna
 * pola (przed fizjo-app#682) – karta planu wygląda wtedy jak dotąd.
 */
export function useAssignmentPrerequisites(patientId: string, assignments: readonly AssignmentLike[]) {
  const { data, error } = useQuery<GetPatientAssignmentPrerequisitesResponse>(GET_PATIENT_ASSIGNMENT_PREREQUISITES_QUERY, {
    variables: { userId: patientId },
    skip: !patientId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const [setPrerequisite, { loading: saving }] = useMutation<
    SetAssignmentPrerequisiteResponse,
    SetAssignmentPrerequisiteVariables
  >(SET_ASSIGNMENT_PREREQUISITE_MUTATION);

  const rows = data?.patientAssignments;
  const supported = Boolean(rows) && !error;
  const requiresById = useMemo(
    () => new Map((rows ?? []).map((row) => [row.id, row.requiresAssignmentId ?? null])),
    [rows]
  );

  const change = useCallback(
    async (assignmentId: string, requiresAssignmentId: string | null) => {
      try {
        await setPrerequisite({ variables: { assignmentId, requiresAssignmentId } });
        toast.success(requiresAssignmentId ? 'Zapisano kolejność zestawów' : 'Usunięto wymagany zestaw');
      } catch (saveError) {
        if (getGraphQLErrorCode(saveError) === EXERCISE_DEPENDENCY_INVALID) {
          toast.error(getGraphQLErrorMessage(saveError, 'Nie udało się zapisać kolejności zestawów'));
        } else {
          console.error('Błąd zapisu kolejności zestawów:', saveError);
          toast.error('Nie udało się zapisać kolejności zestawów');
        }
      }
    },
    [setPrerequisite]
  );

  return useCallback(
    (assignmentId: string): AssignmentPrerequisiteControl | null => {
      if (!supported) return null;
      const currentId = requiresById.get(assignmentId) ?? null;
      const candidates = assignments.map((assignment) => ({
        ...assignment,
        requiresAssignmentId: requiresById.get(assignment.id) ?? null,
      }));
      return {
        currentId,
        options: buildPrerequisiteOptions(assignmentId, candidates, currentId),
        saving,
        onChange: (next) => void change(assignmentId, next),
      };
    },
    [supported, requiresById, assignments, saving, change]
  );
}
