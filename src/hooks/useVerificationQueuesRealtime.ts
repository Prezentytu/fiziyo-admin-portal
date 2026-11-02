'use client';

import { useEffect } from 'react';
import { useApolloClient, useSubscription } from '@apollo/client/react';

import { useVerificationScopes } from '@/features/verification/useVerificationScopes';
import {
  GET_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import {
  GET_CROSS_ORG_VERIFICATION_QUEUE_PAGE_QUERY,
  GET_CROSS_ORG_VERIFICATION_STATS_QUERY,
} from '@/graphql/queries/crossOrgVerification.queries';
import { ON_EXERCISE_SUBMITTED_FOR_GLOBAL_REVIEW } from '@/graphql/subscriptions';

const CROSS_ORG_POLL_INTERVAL_MS = 30_000;
const CROSS_ORG_REFETCH_QUERIES = [GET_CROSS_ORG_VERIFICATION_STATS_QUERY, GET_CROSS_ORG_VERIFICATION_QUEUE_PAGE_QUERY];

/**
 * Keeps the catalog and cross-org counts fresh outside their lists, like `useOrganizationVerificationRealtime`
 * does for the own organization. Stats and queue pages refetch together, so a count never runs ahead of the
 * queue's first item. Mount once in layout-level hooks.
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
        include: [GET_VERIFICATION_STATS_QUERY, GET_VERIFICATION_QUEUE_PAGE_QUERY, ...CROSS_ORG_REFETCH_QUERIES],
      });
    },
  });

  // Organization-level submissions have no cross-tenant subscription, so cross-org counts are polled.
  useEffect(() => {
    if (!hasCrossOrg) {
      return;
    }
    const timer = setInterval(() => {
      if (!document.hidden) {
        void apolloClient.refetchQueries({ include: CROSS_ORG_REFETCH_QUERIES });
      }
    }, CROSS_ORG_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [apolloClient, hasCrossOrg]);
}
