import { useSubscription, useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import {
  ON_EXERCISE_SET_CREATED,
  ON_EXERCISE_SET_UPDATED,
  ON_EXERCISE_SET_DELETED,
} from "@/graphql/subscriptions";

interface UseRealtimeExerciseSetsOptions {
  /** ID organizacji do subskrypcji */
  organizationId: string | null;
  /** Callback wywoływany po utworzeniu zestawu (otrzymuje ID) */
  onCreated?: (setId: string) => void;
  /** Callback wywoływany po aktualizacji zestawu (otrzymuje ID) */
  onUpdated?: (setId: string) => void;
  /** Callback wywoływany po usunięciu zestawu (otrzymuje ID) */
  onDeleted?: (setId: string) => void;
  /** Czy subskrypcje są włączone (domyślnie true) */
  enabled?: boolean;
}

/**
 * Hook do real-time updates dla zestawów ćwiczeń
 *
 * Subskrypcje zwracają tylko ID - hook automatycznie:
 * - Refetchuje przy created/updated
 * - Usuwa z cache przy deleted
 */
export function useRealtimeExerciseSets({
  organizationId,
  onCreated,
  onUpdated,
  onDeleted,
  enabled = true,
}: UseRealtimeExerciseSetsOptions) {
  const client = useApolloClient();
  const skip = !organizationId || !enabled;

  // Helper do refetch
  const refetch = useCallback(() => {
    if (!organizationId) return;
    client.refetchQueries({
      include: ["GetOrganizationExerciseSets", "GetExerciseSet"],
    });
  }, [client, organizationId]);

  // Subskrypcja na nowe zestawy
  useSubscription(ON_EXERCISE_SET_CREATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const setId = data.data?.onExerciseSetCreated as string | undefined;
      if (!setId) return;

      refetch();
      onCreated?.(setId);
    },
  });

  // Subskrypcja na aktualizacje zestawów
  useSubscription(ON_EXERCISE_SET_UPDATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const setId = data.data?.onExerciseSetUpdated as string | undefined;
      if (!setId) return;

      refetch();
      onUpdated?.(setId);
    },
  });

  // Subskrypcja na usunięte zestawy
  useSubscription(ON_EXERCISE_SET_DELETED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const setId = data.data?.onExerciseSetDeleted as string | undefined;
      if (!setId) return;

      // Usuń z cache
      client.cache.evict({
        id: client.cache.identify({ __typename: "ExerciseSet", id: setId }),
      });
      client.cache.gc();

      onDeleted?.(setId);
    },
  });

  return { refetch };
}
