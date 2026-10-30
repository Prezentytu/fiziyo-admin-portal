import { useSubscription, useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef } from 'react';
import {
  ON_EXERCISE_CREATED,
  ON_EXERCISE_UPDATED,
  ON_EXERCISE_DELETED,
  ON_GLOBAL_EXERCISE_PUBLISHED,
} from '@/graphql/subscriptions';
import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';

const REFETCH_DEBOUNCE_MS = 1000;

interface UseRealtimeExercisesOptions {
  /** ID organizacji do subskrypcji */
  organizationId: string | null;
  /** Callback wywoływany po utworzeniu ćwiczenia (otrzymuje ID) */
  onCreated?: (exerciseId: string) => void;
  /** Callback wywoływany po aktualizacji ćwiczenia (otrzymuje ID) */
  onUpdated?: (exerciseId: string) => void;
  /** Callback wywoływany po usunięciu ćwiczenia (otrzymuje ID) */
  onDeleted?: (exerciseId: string) => void;
  /** Callback wywoływany po publikacji globalnego ćwiczenia (otrzymuje ID) */
  onGlobalPublished?: (exerciseId: string) => void;
  /** Czy subskrypcje są włączone (domyślnie true) */
  enabled?: boolean;
}

/**
 * Hook do real-time updates dla ćwiczeń
 *
 * Subskrypcje zwracają tylko ID - hook automatycznie:
 * - Refetchuje listę przy created/updated
 * - Usuwa z cache przy deleted
 *
 * Użycie:
 * ```tsx
 * useRealtimeExercises({
 *   organizationId,
 *   onCreated: (id) => toast.success(`Nowe ćwiczenie dodane`),
 * });
 * ```
 */
export function useRealtimeExercises({
  organizationId,
  onCreated,
  onUpdated,
  onDeleted,
  onGlobalPublished,
  enabled = true,
}: UseRealtimeExercisesOptions) {
  const client = useApolloClient();
  const skip = !organizationId || !enabled;

  // Helper do refetch
  const refetch = useCallback(() => {
    if (!organizationId) return;
    client.refetchQueries({
      include: [GET_AVAILABLE_EXERCISES_QUERY],
    });
  }, [client, organizationId]);

  // Import i review publikują serię eventów naraz; jedno odświeżenie listy na serię zamiast na event.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      refetchTimer.current = null;
      refetch();
    }, REFETCH_DEBOUNCE_MS);
  }, [refetch]);
  useEffect(
    () => () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    },
    [],
  );

  // Subskrypcja na nowe ćwiczenia
  useSubscription<{ onExerciseCreated: string }>(ON_EXERCISE_CREATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const exerciseId = data.data?.onExerciseCreated;
      if (!exerciseId) return;

      // Refetch listy żeby pobrać nowe ćwiczenie
      scheduleRefetch();
      onCreated?.(exerciseId);
    },
  });

  // Subskrypcja na aktualizacje ćwiczeń
  useSubscription<{ onExerciseUpdated: string }>(ON_EXERCISE_UPDATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const exerciseId = data.data?.onExerciseUpdated;
      if (!exerciseId) return;

      // Refetch żeby pobrać zaktualizowane dane
      scheduleRefetch();
      onUpdated?.(exerciseId);
    },
  });

  // Subskrypcja na usunięte ćwiczenia
  useSubscription<{ onExerciseDeleted: string }>(ON_EXERCISE_DELETED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const exerciseId = data.data?.onExerciseDeleted;
      if (!exerciseId) return;

      // Usuń z cache
      client.cache.evict({
        id: client.cache.identify({ __typename: 'Exercise', id: exerciseId }),
      });
      client.cache.gc();

      onDeleted?.(exerciseId);
    },
  });

  // Subskrypcja na publikacje globalnych ćwiczeń
  useSubscription<{ onGlobalExercisePublished: string }>(ON_GLOBAL_EXERCISE_PUBLISHED, {
    skip: !enabled,
    onData: ({ data }) => {
      const exerciseId = data.data?.onGlobalExercisePublished;
      if (!exerciseId) return;

      // Refetch, żeby odświeżyć listę (w tym zakładkę "Baza FiziYo")
      scheduleRefetch();
      onGlobalPublished?.(exerciseId);
    },
  });

  return { refetch };
}
