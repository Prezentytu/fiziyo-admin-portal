import { useSubscription, useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import {
  ON_EXERCISE_CREATED,
  ON_EXERCISE_UPDATED,
  ON_EXERCISE_DELETED,
} from "@/graphql/subscriptions";
import { GET_AVAILABLE_EXERCISES_QUERY } from "@/graphql/queries/exercises.queries";

interface UseRealtimeExercisesOptions {
  /** ID organizacji do subskrypcji */
  organizationId: string | null;
  /** Callback wywoływany po utworzeniu ćwiczenia (otrzymuje ID) */
  onCreated?: (exerciseId: string) => void;
  /** Callback wywoływany po aktualizacji ćwiczenia (otrzymuje ID) */
  onUpdated?: (exerciseId: string) => void;
  /** Callback wywoływany po usunięciu ćwiczenia (otrzymuje ID) */
  onDeleted?: (exerciseId: string) => void;
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

  // Subskrypcja na nowe ćwiczenia
  useSubscription<{ onExerciseCreated: string }>(ON_EXERCISE_CREATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const exerciseId = data.data?.onExerciseCreated;
      if (!exerciseId) return;

      // Refetch listy żeby pobrać nowe ćwiczenie
      refetch();
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
      refetch();
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
        id: client.cache.identify({ __typename: "Exercise", id: exerciseId }),
      });
      client.cache.gc();

      onDeleted?.(exerciseId);
    },
  });

  return { refetch };
}
