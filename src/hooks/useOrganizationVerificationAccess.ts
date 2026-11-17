'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { GET_ORGANIZATION_VERIFICATION_STATS_QUERY } from '@/graphql/queries/adminExercises.queries';
import { GET_EXERCISE_OFFERS_QUERY } from '@/graphql/queries/exerciseOffers.queries';
import type { GetOrganizationVerificationStatsResponse } from '@/graphql/types/adminExercise.types';
import type { GetExerciseOffersResponse, GetExerciseOffersVariables } from '@/graphql/types/exerciseOffer.types';

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

  // Offers from the FiziYo team wait on the same page, so they count towards the same badge.
  const { data: offersData } = useQuery<GetExerciseOffersResponse, GetExerciseOffersVariables>(
    GET_EXERCISE_OFFERS_QUERY,
    {
      variables: { organizationId: organizationId ?? '', status: 'PENDING' },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    }
  );

  const pendingReview = data?.organizationVerificationStats.pendingOrgReview ?? 0;
  const pendingOffers = offersData?.exerciseOffers?.filter((offer) => offer.status === 'PENDING').length ?? 0;

  return useMemo(
    () => ({
      canAccessOrganizationVerification: Boolean(organizationId) && canManageOrganization,
      pendingCount: pendingReview + pendingOffers,
      isLoading: organizationLoading || roleLoading || statsLoading,
    }),
    [organizationId, canManageOrganization, pendingReview, pendingOffers, organizationLoading, roleLoading, statsLoading]
  );
}
