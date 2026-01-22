import { useSubscription, useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import {
  ON_TAG_CREATED,
  ON_TAG_UPDATED,
  ON_TAG_DELETED,
} from "@/graphql/subscriptions";

interface UseRealtimeTagsOptions {
  /** ID organizacji do subskrypcji */
  organizationId: string | null;
  /** Callback wywoływany po utworzeniu tagu (otrzymuje ID) */
  onCreated?: (tagId: string) => void;
  /** Callback wywoływany po aktualizacji tagu (otrzymuje ID) */
  onUpdated?: (tagId: string) => void;
  /** Callback wywoływany po usunięciu tagu (otrzymuje ID) */
  onDeleted?: (tagId: string) => void;
  /** Czy subskrypcje są włączone (domyślnie true) */
  enabled?: boolean;
}

/**
 * Hook do real-time updates dla tagów ćwiczeń
 *
 * Subskrypcje zwracają tylko ID - hook automatycznie:
 * - Refetchuje przy created/updated
 * - Usuwa z cache przy deleted
 */
export function useRealtimeTags({
  organizationId,
  onCreated,
  onUpdated,
  onDeleted,
  enabled = true,
}: UseRealtimeTagsOptions) {
  const client = useApolloClient();
  const skip = !organizationId || !enabled;

  // Helper do refetch
  const refetch = useCallback(() => {
    if (!organizationId) return;
    client.refetchQueries({
      include: ["GetOrganizationTags"],
    });
  }, [client, organizationId]);

  // Subskrypcja na nowe tagi
  useSubscription(ON_TAG_CREATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const tagId = data.data?.onExerciseTagCreated as string | undefined;
      if (!tagId) return;

      refetch();
      onCreated?.(tagId);
    },
  });

  // Subskrypcja na aktualizacje tagów
  useSubscription(ON_TAG_UPDATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const tagId = data.data?.onExerciseTagUpdated as string | undefined;
      if (!tagId) return;

      refetch();
      onUpdated?.(tagId);
    },
  });

  // Subskrypcja na usunięte tagi
  useSubscription(ON_TAG_DELETED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const tagId = data.data?.onExerciseTagDeleted as string | undefined;
      if (!tagId) return;

      // Usuń z cache
      client.cache.evict({
        id: client.cache.identify({ __typename: "ExerciseTag", id: tagId }),
      });
      client.cache.gc();

      onDeleted?.(tagId);
    },
  });

  return { refetch };
}
