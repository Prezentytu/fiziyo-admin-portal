'use client';

import { useApolloClient, useQuery, useSubscription } from '@apollo/client/react';

import { useVerificationScopes } from '@/features/verification/useVerificationScopes';
import { GET_VERIFICATION_STATS_QUERY } from '@/graphql/queries/adminExercises.queries';
import { GET_CROSS_ORG_VERIFICATION_STATS_QUERY } from '@/graphql/queries/crossOrgVerification.queries';
import { ON_EXERCISE_SUBMITTED_FOR_GLOBAL_REVIEW } from '@/graphql/subscriptions';
import type { GetCrossOrgVerificationStatsResponse } from '@/graphql/types/adminExercise.types';

const CROSS_ORG_POLL_INTERVAL_MS = 30_000;

/**
 * Keeps the catalog and cross-org pending counts fresh outside their lists, like
 * `useOrganizationVerificationRealtime` does for the own organization. Mount once in layout-level hooks.
 */
export function useVerificationQueuesRealtime() {
  const apolloClient = useApolloClient();
  const scopes = useVerificationScopes();
  const hasGlobal = scopes.some((scope) => scope.key === 'global');
  const hasCrossOrg = scopes.some((scope) => scope.key === 'cross-org');

  useSubscription<{ onExerciseSubmittedForGlobalReview: string }>(ON_EXERCISE_SUBMITTED_FOR_GLOBAL_REVIEW, {
    skip: !hasGlobal && !hasCrossOrg,
    onData: () => {
      void apolloClient.refetchQueries({
        include: [GET_VERIFICATION_STATS_QUERY, GET_CROSS_ORG_VERIFICATION_STATS_QUERY],
      });
    },
  });

  // Organization-level submissions have no cross-tenant subscription; the cross-org list polls the same way.
  useQuery<GetCrossOrgVerificationStatsResponse>(GET_CROSS_ORG_VERIFICATION_STATS_QUERY, {
    skip: !hasCrossOrg,
    fetchPolicy: 'cache-and-network',
    pollInterval: CROSS_ORG_POLL_INTERVAL_MS,
    skipPollAttempt: () => document.hidden,
  });
}
