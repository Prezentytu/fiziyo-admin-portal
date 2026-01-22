import { useSubscription, useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import {
  ON_CLINIC_CREATED,
  ON_CLINIC_UPDATED,
  ON_CLINIC_DELETED,
} from "@/graphql/subscriptions";

interface UseRealtimeClinicsOptions {
  /** ID organizacji do subskrypcji */
  organizationId: string | null;
  /** Callback wywoływany po utworzeniu gabinetu (otrzymuje ID) */
  onCreated?: (clinicId: string) => void;
  /** Callback wywoływany po aktualizacji gabinetu (otrzymuje ID) */
  onUpdated?: (clinicId: string) => void;
  /** Callback wywoływany po usunięciu gabinetu (otrzymuje ID) */
  onDeleted?: (clinicId: string) => void;
  /** Czy subskrypcje są włączone (domyślnie true) */
  enabled?: boolean;
}

/**
 * Hook do real-time updates dla gabinetów
 *
 * Subskrypcje zwracają tylko ID - hook automatycznie:
 * - Refetchuje przy created/updated
 * - Usuwa z cache przy deleted
 */
export function useRealtimeClinics({
  organizationId,
  onCreated,
  onUpdated,
  onDeleted,
  enabled = true,
}: UseRealtimeClinicsOptions) {
  const client = useApolloClient();
  const skip = !organizationId || !enabled;

  // Helper do refetch
  const refetch = useCallback(() => {
    if (!organizationId) return;
    client.refetchQueries({
      include: ["GetOrganizationClinics"],
    });
  }, [client, organizationId]);

  // Subskrypcja na nowe gabinety
  useSubscription(ON_CLINIC_CREATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const clinicId = data.data?.onClinicCreated as string | undefined;
      if (!clinicId) return;

      refetch();
      onCreated?.(clinicId);
    },
  });

  // Subskrypcja na aktualizacje gabinetów
  useSubscription(ON_CLINIC_UPDATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const clinicId = data.data?.onClinicUpdated as string | undefined;
      if (!clinicId) return;

      refetch();
      onUpdated?.(clinicId);
    },
  });

  // Subskrypcja na usunięte gabinety
  useSubscription(ON_CLINIC_DELETED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const clinicId = data.data?.onClinicDeleted as string | undefined;
      if (!clinicId) return;

      // Usuń z cache
      client.cache.evict({
        id: client.cache.identify({ __typename: "Clinic", id: clinicId }),
      });
      client.cache.gc();

      onDeleted?.(clinicId);
    },
  });

  return { refetch };
}
