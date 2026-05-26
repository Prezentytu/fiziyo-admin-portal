'use client';

import { useSubscription, useApolloClient } from '@apollo/client/react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import {
  GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import { ON_EXERCISE_UPDATED } from '@/graphql/subscriptions';

/** Queries refetched when org verification queue changes. */
export const ORG_VERIFICATION_REFETCH_QUERIES = [
  GET_ORGANIZATION_VERIFICATION_STATS_QUERY,
  GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY,
] as const;

/**
 * Keeps org verification stats and queue in sync via WebSocket.
 * Mount once in layout-level hooks (e.g. sidebar badge) so updates work from any page.
 */
export function useOrganizationVerificationRealtime() {
  const apolloClient = useApolloClient();
  const { currentOrganization } = useOrganization();
  const { canManageOrganization } = useRoleAccess();

  const organizationId = currentOrganization?.organizationId;

  useSubscription<{ onExerciseUpdated: string }>(ON_EXERCISE_UPDATED, {
    skip: !organizationId || !canManageOrganization,
    variables: { organizationId: organizationId! },
    onData: () => {
      void apolloClient.refetchQueries({
        include: [...ORG_VERIFICATION_REFETCH_QUERIES],
      });
    },
  });
}
