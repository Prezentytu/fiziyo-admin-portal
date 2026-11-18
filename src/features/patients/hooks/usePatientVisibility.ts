'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client/react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { evictPatientLists, isRestrictedToOwnPatients } from '@/features/patients/utils/patientCareAccess';
import { GET_ORGANIZATION_PATIENT_VISIBILITY_QUERY } from '@/graphql/queries/organizations.queries';
import type { OrganizationPatientVisibilityQueryData } from '@/graphql/types';

/**
 * Whether the signed-in therapist or staff member sees only patients in their care (the clinic keeps
 * `therapistsSeeAllPatients` off). For copy and disabled actions only: the backend decides what is returned.
 * Owner and admin never ask for the setting. No answer (loading, error, API without the field) means
 * „unknown”, never „off”: the UI then stays unrestricted, as before the setting existed.
 */
export function usePatientVisibility(): { isRestricted: boolean } {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const role = currentOrganization?.role?.toLowerCase();
  const dependsOnSetting = role === 'therapist' || role === 'staff';

  const { data, client } = useQuery<OrganizationPatientVisibilityQueryData>(GET_ORGANIZATION_PATIENT_VISIBILITY_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId || !dependsOnSetting,
    // The owner can flip the setting while this session is open.
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const answer = data?.organizationById?.therapistsSeeAllPatients;
  const setting = typeof answer === 'boolean' ? answer : undefined;

  // Lists fetched under the previous setting show patients this user no longer sees, or miss new ones.
  const seen = useRef<{ organizationId: string; setting: boolean } | null>(null);
  useEffect(() => {
    if (!organizationId || setting === undefined) return;
    const previous = seen.current;
    seen.current = { organizationId, setting };
    if (previous && previous.organizationId === organizationId && previous.setting !== setting) {
      evictPatientLists(client.cache);
    }
  }, [client, organizationId, setting]);

  return { isRestricted: isRestrictedToOwnPatients(role, setting) };
}
