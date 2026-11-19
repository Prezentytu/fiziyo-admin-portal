import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';

import { getGraphQLErrorCode, getGraphQLErrorMessage } from '@/features/patients/utils/patientConsent';
import { trackEvent } from '@/lib/telemetry/client';
import { GET_EXERCISE_SET_DEPENDENCIES_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { UPDATE_EXERCISE_SET_DEPENDENCIES_MUTATION } from '@/graphql/mutations/exercises.mutations';
import type {
  ExerciseSetDependencyInput,
  GetExerciseSetDependenciesResponse,
  UpdateExerciseSetDependenciesResponse,
  UpdateExerciseSetDependenciesVariables,
} from '@/graphql/types';
import {
  EXERCISE_DEPENDENCY_INVALID,
  countDependencyStats,
  mergeDependencyFields,
  type DependencyPosition,
} from '../utils/exerciseDependencies';

interface MappingLike {
  id: string;
  order?: number | null;
}

/**
 * Zależności pozycji zestawu (SPEC-061). `supported` jest false, gdy API nie zna pól (przed fizjo-app#682):
 * ekran zestawu działa wtedy jak dotąd, bez edycji zależności.
 */
export function useExerciseSetDependencies<T extends MappingLike>(
  exerciseSetId: string,
  mappings: readonly T[],
  /** Stała referencja (funkcja modułu), bo wchodzi do useMemo. */
  nameOf: (mapping: T) => string
) {
  const { data, error, refetch } = useQuery<GetExerciseSetDependenciesResponse>(GET_EXERCISE_SET_DEPENDENCIES_QUERY, {
    variables: { exerciseSetId },
    skip: !exerciseSetId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const [updateDependencies, { loading: saving }] = useMutation<
    UpdateExerciseSetDependenciesResponse,
    UpdateExerciseSetDependenciesVariables
  >(UPDATE_EXERCISE_SET_DEPENDENCIES_MUTATION);

  const mappingSignature = mappings.map((mapping) => mapping.id).join(',');
  const previousSignature = useRef(mappingSignature);
  useEffect(() => {
    if (previousSignature.current === mappingSignature) return;
    previousSignature.current = mappingSignature;
    void refetch();
  }, [mappingSignature, refetch]);

  const dependencyRows = data?.exerciseSetById?.exerciseMappings;
  const supported = Boolean(dependencyRows) && !error;
  const positions: DependencyPosition[] = useMemo(
    () => mergeDependencyFields(mappings, dependencyRows ?? [], nameOf),
    [mappings, dependencyRows, nameOf]
  );

  const save = useCallback(
    async (items: ExerciseSetDependencyInput[], nextPositions: readonly DependencyPosition[]): Promise<boolean> => {
      try {
        await updateDependencies({ variables: { exerciseSetId, items } });
        trackEvent('exercise_set:dependencies_save', countDependencyStats(nextPositions));
        toast.success('Zapisano kolejność');
        return true;
      } catch (saveError) {
        if (getGraphQLErrorCode(saveError) === EXERCISE_DEPENDENCY_INVALID) {
          toast.error(getGraphQLErrorMessage(saveError, 'Nie udało się zapisać kolejności'));
        } else {
          console.error('Błąd zapisu zależności ćwiczeń:', saveError);
          toast.error('Nie udało się zapisać kolejności');
        }
        return false;
      }
    },
    [exerciseSetId, updateDependencies]
  );

  return { supported, positions, save, saving };
}
