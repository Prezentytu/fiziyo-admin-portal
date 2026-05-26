'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { GET_ORGANIZATION_VERIFICATION_STATS_QUERY } from '@/graphql/queries/adminExercises.queries';
import type { GetOrganizationVerificationStatsResponse } from '@/graphql/types/adminExercise.types';

export function useOrganizationVerificationAccess() {
  const { currentOrganization, isLoading: organizationLoading } = useOrganization();
  const { canManageOrganization, isLoading: roleLoading } = useRoleAccess();

  const organizationId = currentOrganization?.organizationId ?? null;

  const { data, loading: statsLoading } = useQuery<GetOrganizationVerificationStatsResponse>(
    GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
    {
      variables: { organizationId: organizationId ?? '' },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );

  return useMemo(
    () => ({
      canAccessOrganizationVerification: Boolean(organizationId) && canManageOrganization,
      pendingCount: data?.organizationVerificationStats.pendingOrgReview ?? 0,
      isLoading: organizationLoading || roleLoading || statsLoading,
    }),
    [organizationId, canManageOrganization, data?.organizationVerificationStats.pendingOrgReview, organizationLoading, roleLoading, statsLoading]
  );
}
