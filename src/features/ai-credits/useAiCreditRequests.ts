'use client';

import { useQuery } from '@apollo/client/react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { GET_AI_CREDIT_REQUESTS_QUERY } from '@/graphql/queries/billing.queries';
import type { GetAICreditRequestsResponse, GetAICreditRequestsVariables } from '@/graphql/types';

import { normalizeCreditRequests } from './utils/creditsRequest';

/** Prośby o kredyty widzą tylko Owner i Admin; dla innych ról backend rzuca błąd, więc nie odpytujemy. */
export function useAiCreditRequests() {
  const { currentOrganization } = useOrganization();
  const { canManageOrganization } = useRoleAccess();
  const organizationId = currentOrganization?.organizationId ?? '';

  const { data, loading } = useQuery<GetAICreditRequestsResponse, GetAICreditRequestsVariables>(
    GET_AI_CREDIT_REQUESTS_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    }
  );

  return {
    organizationId,
    canRequest: canManageOrganization,
    requests: normalizeCreditRequests(data?.aiCreditRequests),
    loading,
  };
}
