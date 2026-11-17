'use client';

import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { GET_EXERCISE_OFFERS_QUERY } from '@/graphql/queries/exerciseOffers.queries';
import { RESPOND_TO_EXERCISE_OFFER_MUTATION } from '@/graphql/mutations/exerciseOffers.mutations';
import type {
  ExerciseOfferDecision,
  GetExerciseOffersResponse,
  GetExerciseOffersVariables,
  RespondToExerciseOfferResponse,
  RespondToExerciseOfferVariables,
} from '@/graphql/types/exerciseOffer.types';

import { toPendingOfferViews } from './utils/exerciseOffers';

/**
 * Open offers from the FiziYo team for the current organization. Only owner and admin may read them (backend),
 * so other roles do not query; errorPolicy 'all' keeps the panel silent on an API without the field.
 */
export function useExerciseOffers() {
  const { currentOrganization } = useOrganization();
  const { canManageOrganization } = useRoleAccess();
  const organizationId = currentOrganization?.organizationId ?? '';

  const { data, loading, refetch } = useQuery<GetExerciseOffersResponse, GetExerciseOffersVariables>(
    GET_EXERCISE_OFFERS_QUERY,
    {
      variables: { organizationId, status: 'PENDING' },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    }
  );

  const [respondMutation] = useMutation<RespondToExerciseOfferResponse, RespondToExerciseOfferVariables>(
    RESPOND_TO_EXERCISE_OFFER_MUTATION
  );

  const offers = useMemo(() => toPendingOfferViews(data?.exerciseOffers), [data?.exerciseOffers]);

  const respond = async (offerId: string, decision: ExerciseOfferDecision, note: string | null) => {
    const result = await respondMutation({ variables: { organizationId, offerId, decision, note } });
    if (result.error) {
      throw result.error;
    }
    if (!result.data?.respondToExerciseOffer) {
      throw new Error('Serwer nie potwierdził odpowiedzi.');
    }
  };

  return { organizationId, offers, loading, respond, refetch };
}
