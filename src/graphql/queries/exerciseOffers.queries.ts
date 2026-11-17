import { gql } from '@apollo/client';

export const EXERCISE_OFFER_FIELDS_FRAGMENT = gql`
  fragment ExerciseOfferFields on ExerciseOfferType {
    id
    mode
    status
    message
    offeredAt
    respondedAt
    responseNote
    adoptedExerciseId
    exercise {
      id
      name
      patientDescription
      clinicalDescription
      images
      videoUrl
      defaultSets
      defaultReps
      defaultExecutionTime
    }
  }
`;

/** Propozycje ćwiczeń od zespołu FiziYo; backend zwraca je tylko ownerowi i adminowi organizacji z tokenu. */
export const GET_EXERCISE_OFFERS_QUERY = gql`
  query GetExerciseOffers($organizationId: String!, $status: String) {
    exerciseOffers(organizationId: $organizationId, status: $status) {
      ...ExerciseOfferFields
    }
  }
  ${EXERCISE_OFFER_FIELDS_FRAGMENT}
`;
