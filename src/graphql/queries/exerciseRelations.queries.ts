import { gql } from '@apollo/client';

export const GET_RELATED_EXERCISES_QUERY = gql`
  query GetRelatedExercises($organizationId: String!, $exerciseId: String!) {
    relatedExercises(organizationId: $organizationId, exerciseId: $exerciseId) {
      id
      relationType
      targetExerciseId
      targetName
      targetThumbnailUrl
      isTargetAvailable
      difference
      whenToSwitch
      isVerified
      isAISuggested
    }
  }
`;
