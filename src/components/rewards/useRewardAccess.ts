'use client';

import { useQuery } from '@apollo/client/react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_REWARD_SETTINGS_QUERY } from '@/graphql/queries/organizationRewards.queries';

export function useRewardAccess() {
  const { currentOrganization, isLoading, isSwitching } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const role = currentOrganization?.role?.toLowerCase();
  const allowed = Boolean(organizationId && (role === 'owner' || role === 'admin' || role === 'therapist'));
  const skip = isLoading || isSwitching || !allowed;
  // R1 resolves both flags against the organization in the backend token.
  const query = useQuery(GET_REWARD_SETTINGS_QUERY, { skip, fetchPolicy: 'network-only' });
  return {
    organizationId,
    loading: isLoading || isSwitching || (!skip && query.loading),
    settings: skip || query.loading || query.error ? null : query.data?.organizationRewardSettings,
    error: !skip && query.error,
    refetch: query.refetch,
  };
}
