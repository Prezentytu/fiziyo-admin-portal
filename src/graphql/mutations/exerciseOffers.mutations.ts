import { gql } from '@apollo/client';

import { EXERCISE_OFFER_FIELDS_FRAGMENT } from '@/graphql/queries/exerciseOffers.queries';

export const RESPOND_TO_EXERCISE_OFFER_MUTATION = gql`
  mutation RespondToExerciseOffer(
    $organizationId: String!
    $offerId: String!
    $decision: ExerciseOfferDecision!
    $note: String
  ) {
    respondToExerciseOffer(organizationId: $organizationId, offerId: $offerId, decision: $decision, note: $note) {
      ...ExerciseOfferFields
    }
  }
  ${EXERCISE_OFFER_FIELDS_FRAGMENT}
`;
