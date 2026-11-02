'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useSystemRole } from '@/hooks/useSystemRole';
import { useOrganizationVerificationAccess } from '@/hooks/useOrganizationVerificationAccess';
import {
  getVerificationScopes,
  sumPendingCounts,
  type VerificationPendingCounts,
  type VerificationScope,
} from '@/features/verification/utils/verificationScopes';
import { GET_VERIFICATION_STATS_QUERY } from '@/graphql/queries/adminExercises.queries';
import { GET_CROSS_ORG_VERIFICATION_STATS_QUERY } from '@/graphql/queries/crossOrgVerification.queries';
import type {
  GetCrossOrgVerificationStatsResponse,
  GetVerificationStatsResponse,
} from '@/graphql/types/adminExercise.types';

export function useVerificationScopes(): VerificationScope[] {
  const { currentOrganization } = useOrganization();
  const { canManageOrganization } = useRoleAccess();
  const { canReviewExercises, isSiteSuperAdmin } = useSystemRole();
  const organizationName = currentOrganization?.organizationName;

  return useMemo(
    () => getVerificationScopes({ canManageOrganization, canReviewExercises, isSiteSuperAdmin }, organizationName),
    [canManageOrganization, canReviewExercises, isSiteSuperAdmin, organizationName]
  );
}

/** Pending items per verification queue the user can open, plus their sum for navigation badges. */
export function useVerificationPendingCounts(): { counts: VerificationPendingCounts; total: number } {
  const scopes = useVerificationScopes();
  const { pendingCount: organizationPending } = useOrganizationVerificationAccess();
  const hasGlobal = scopes.some((scope) => scope.key === 'global');
  const hasCrossOrg = scopes.some((scope) => scope.key === 'cross-org');

  const { data: globalData } = useQuery<GetVerificationStatsResponse>(GET_VERIFICATION_STATS_QUERY, {
    skip: !hasGlobal,
    fetchPolicy: 'cache-first',
  });
  const { data: crossOrgData } = useQuery<GetCrossOrgVerificationStatsResponse>(
    GET_CROSS_ORG_VERIFICATION_STATS_QUERY,
    {
      skip: !hasCrossOrg,
      fetchPolicy: 'cache-first',
    }
  );

  const globalPending = globalData?.verificationStats.pendingReview;
  const crossOrgPending = crossOrgData?.crossOrgVerificationStats.pendingOrgReview;

  return useMemo(() => {
    const counts: VerificationPendingCounts = {
      organization: organizationPending,
      global: globalPending,
      'cross-org': crossOrgPending,
    };
    return { counts, total: sumPendingCounts(scopes, counts) };
  }, [scopes, organizationPending, globalPending, crossOrgPending]);
}
