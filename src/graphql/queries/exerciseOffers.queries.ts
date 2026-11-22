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
      type
      side
      patientDescription
      clinicalDescription
      audioCue
      tempo
      rangeOfMotion
      resistance
      equipment
      difficultyLevel
      mainTags
      additionalTags
      images
      videoUrl
      videos
      preparationTime
      defaultSets
      defaultReps
      defaultDuration
      defaultExecutionTime
      defaultRestBetweenSets
      defaultRestBetweenReps
      enrichmentData
    }
  }
`;

/** Propozycje ćwiczeń od zespołu FiziYo; backend zwraca je tylko ownerowi i adminowi organizacji z tokenu. */
export const GET_EXERCISE_OFFERS_QUERY = gql`
  query GetExerciseOffers($organizationId: String!, $status: ExerciseOfferStatus) {
    exerciseOffers(organizationId: $organizationId, status: $status) {
      ...ExerciseOfferFields
    }
  }
  ${EXERCISE_OFFER_FIELDS_FRAGMENT}
`;
