'use client';

import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { toast } from 'sonner';

import { RESTORE_EXERCISE_MUTATION, RESTORE_EXERCISE_SET_MUTATION } from '@/graphql/mutations/trash.mutations';
import type { RestoreExerciseResponse, RestoreExerciseSetResponse } from '@/graphql/types';
import { TRASH_RETENTION_DAYS } from './utils/trashRetention';

/** Toast after „Usuń”: the item went to the trash, with an immediate undo. */
export function useTrashToast() {
  const apolloClient = useApolloClient();

  const setDeleted = useCallback(
    (set: { id: string; name: string }, onRestored?: () => void) => {
      toast.success(`Zestaw „${set.name}” jest w koszu przez ${TRASH_RETENTION_DAYS} dni`, {
        action: {
          label: 'Cofnij',
          onClick: async () => {
            try {
              await apolloClient.mutate<RestoreExerciseSetResponse>({
                mutation: RESTORE_EXERCISE_SET_MUTATION,
                variables: { exerciseSetId: set.id },
              });
              apolloClient.cache.evict({ id: 'ROOT_QUERY', fieldName: 'exerciseSets' });
              apolloClient.cache.gc();
              onRestored?.();
              toast.success('Przywrócono zestaw');
            } catch {
              toast.error('Nie udało się przywrócić zestawu. Znajdziesz go w koszu.');
            }
          },
        },
      });
    },
    [apolloClient]
  );

  const exerciseDeleted = useCallback(
    (exercise: { id: string; name: string }, onRestored?: () => void) => {
      toast.success(`Ćwiczenie „${exercise.name}” jest w koszu przez ${TRASH_RETENTION_DAYS} dni`, {
        action: {
          label: 'Cofnij',
          onClick: async () => {
            try {
              await apolloClient.mutate<RestoreExerciseResponse>({
                mutation: RESTORE_EXERCISE_MUTATION,
                variables: { exerciseId: exercise.id },
              });
              onRestored?.();
              toast.success('Przywrócono ćwiczenie. Do zestawów dodaj je ponownie.');
            } catch {
              toast.error('Nie udało się przywrócić ćwiczenia. Znajdziesz je w koszu.');
            }
          },
        },
      });
    },
    [apolloClient]
  );

  return { setDeleted, exerciseDeleted };
}
