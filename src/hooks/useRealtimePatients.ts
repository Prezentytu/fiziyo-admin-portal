import { useSubscription, useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import {
  ON_PATIENT_CREATED,
  ON_PATIENT_UPDATED,
  ON_PATIENT_DELETED,
} from "@/graphql/subscriptions";

interface UseRealtimePatientsOptions {
  /** ID organizacji do subskrypcji */
  organizationId: string | null;
  /** Callback wywoływany po utworzeniu pacjenta (otrzymuje ID) */
  onCreated?: (patientId: string) => void;
  /** Callback wywoływany po aktualizacji pacjenta (otrzymuje ID) */
  onUpdated?: (patientId: string) => void;
  /** Callback wywoływany po usunięciu pacjenta (otrzymuje ID) */
  onDeleted?: (patientId: string) => void;
  /** Czy subskrypcje są włączone (domyślnie true) */
  enabled?: boolean;
}

/**
 * Hook do real-time updates dla pacjentów
 *
 * Subskrypcje zwracają tylko ID - hook automatycznie:
 * - Refetchuje przy created/updated
 * - Usuwa z cache przy deleted
 */
export function useRealtimePatients({
  organizationId,
  onCreated,
  onUpdated,
  onDeleted,
  enabled = true,
}: UseRealtimePatientsOptions) {
  const client = useApolloClient();
  const skip = !organizationId || !enabled;

  // Helper do refetch
  const refetch = useCallback(() => {
    if (!organizationId) return;
    client.refetchQueries({
      include: ["GetOrganizationPatients", "GetTherapistPatients"],
    });
  }, [client, organizationId]);

  // Subskrypcja na nowych pacjentów
  useSubscription(ON_PATIENT_CREATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const patientId = data.data?.onPatientCreated as string | undefined;
      if (!patientId) return;

      refetch();
      onCreated?.(patientId);
    },
  });

  // Subskrypcja na aktualizacje pacjentów
  useSubscription(ON_PATIENT_UPDATED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const patientId = data.data?.onPatientUpdated as string | undefined;
      if (!patientId) return;

      refetch();
      onUpdated?.(patientId);
    },
  });

  // Subskrypcja na usuniętych pacjentów
  useSubscription(ON_PATIENT_DELETED, {
    skip,
    variables: { organizationId: organizationId! },
    onData: ({ data }) => {
      const patientId = data.data?.onPatientDeleted as string | undefined;
      if (!patientId) return;

      // Usuń z cache
      client.cache.evict({
        id: client.cache.identify({ __typename: "User", id: patientId }),
      });
      client.cache.gc();

      onDeleted?.(patientId);
    },
  });

  return { refetch };
}
