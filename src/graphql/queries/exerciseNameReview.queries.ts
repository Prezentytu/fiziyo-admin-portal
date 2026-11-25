import { gql } from '@apollo/client';

/** BW-FZ-123: przegląd nazw i ćwiczeń filarowych. Backend wpuszcza tylko ReviewExercises (zespół FiziYo). */
export const EXERCISE_NAME_REVIEW_ROW_FRAGMENT = gql`
  fragment ExerciseNameReviewRowFragment on ExerciseNameReviewRow {
    exerciseId
    name
    aliases
    isPillar
    pillarExerciseId
    thumbnailUrl
    imageUrl
    videoUrl
    status
    organizationVerificationStatus
    proposal {
      proposedName
      proposedIsPillar
      proposedPillarExerciseId
      family
      reason
      proposedAt
      status
      decidedById
      decidedByName
      decidedAt
      finalName
      addedAlias
    }
  }
`;

export const GET_EXERCISE_NAME_REVIEW_ORGANIZATIONS_QUERY = gql`
  query GetExerciseNameReviewOrganizations {
    exerciseNameReviewOrganizations {
      id
      name
      exerciseCount
    }
  }
`;

export const GET_EXERCISE_NAME_REVIEWS_QUERY = gql`
  query GetExerciseNameReviews($organizationId: String!) {
    exerciseNameReviews(organizationId: $organizationId) {
      ...ExerciseNameReviewRowFragment
    }
  }
  ${EXERCISE_NAME_REVIEW_ROW_FRAGMENT}
`;

export const GET_EXERCISE_NAME_REVIEW_LOG_QUERY = gql`
  query GetExerciseNameReviewLog($organizationId: String!, $take: Int!) {
    exerciseNameReviewLog(organizationId: $organizationId, take: $take) {
      id
      exerciseId
      userId
      userName
      action
      oldName
      newName
      oldIsPillar
      newIsPillar
      oldPillarExerciseId
      newPillarExerciseId
      createdAt
      canUndo
    }
  }
`;

export const GET_EXERCISE_NAME_VOCABULARY_QUERY = gql`
  query GetExerciseNameVocabulary {
    exerciseNameVocabulary {
      id
      preferred
      avoid
    }
  }
`;

export const GET_EXERCISE_NAME_PROPOSAL_JOB_QUERY = gql`
  query GetExerciseNameProposalJob($organizationId: String!) {
    exerciseNameProposalJob(organizationId: $organizationId) {
      withoutProposal
      job {
        organizationId
        state
        proposed
        total
        failed
        error
        startedAt
        finishedAt
      }
    }
  }
`;
