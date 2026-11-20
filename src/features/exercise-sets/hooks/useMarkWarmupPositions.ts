import { useCallback } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';

import { GET_EXERCISE_SET_DEPENDENCIES_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { UPDATE_EXERCISE_SET_DEPENDENCIES_MUTATION } from '@/graphql/mutations/exercises.mutations';
import type {
  GetExerciseSetDependenciesResponse,
  UpdateExerciseSetDependenciesResponse,
  UpdateExerciseSetDependenciesVariables,
} from '@/graphql/types';
import { buildWarmupDependencyItems } from '../utils/exerciseDependencies';

const WARMUP_NOT_SAVED = 'Zestaw zapisany, ale bez oznaczenia rozgrzewki. Oznacz ją w edycji zestawu.';

/**
 * SPEC-061: po utworzeniu zestawu albo planu oznacza pozycje rozgrzewki. `warmupFlags[i]` dotyczy i-tej pozycji
 * w kolejności zestawu. Zestaw jest już zapisany, więc błąd tylko ostrzega; API bez fizjo-app#682 (odczyt pól
 * zależności się nie udaje) kończy się po cichu, bez flagi.
 */
export function useMarkWarmupPositions() {
  const apolloClient = useApolloClient();
  const [updateDependencies] = useMutation<
    UpdateExerciseSetDependenciesResponse,
    UpdateExerciseSetDependenciesVariables
  >(UPDATE_EXERCISE_SET_DEPENDENCIES_MUTATION);

  return useCallback(
    async (exerciseSetId: string, warmupFlags: readonly boolean[]) => {
      if (!warmupFlags.some(Boolean)) return;
      let mappings: NonNullable<GetExerciseSetDependenciesResponse['exerciseSetById']>['exerciseMappings'];
      try {
        const { data, error } = await apolloClient.query<GetExerciseSetDependenciesResponse>({
          query: GET_EXERCISE_SET_DEPENDENCIES_QUERY,
          variables: { exerciseSetId },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });
        if (error) return;
        mappings = data?.exerciseSetById?.exerciseMappings;
      } catch {
        return;
      }
      if (!mappings) return;
      try {
        const items = buildWarmupDependencyItems(mappings, warmupFlags);
        if (items.length === 0) throw new Error('Pozycje zestawu nie zgadzają się z zapisanymi ćwiczeniami');
        await updateDependencies({ variables: { exerciseSetId, items } });
      } catch (error) {
        console.error('Błąd oznaczania rozgrzewki:', error);
        toast.warning(WARMUP_NOT_SAVED);
      }
    },
    [apolloClient, updateDependencies]
  );
}
