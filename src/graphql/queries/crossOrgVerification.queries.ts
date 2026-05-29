import { gql } from '@apollo/client';
import { EXERCISE_FULL_FRAGMENT } from './exercises.queries';
import { ADMIN_EXERCISE_FRAGMENT, VERIFICATION_QUEUE_ITEM_FRAGMENT } from './adminExercises.queries';

export const GET_CROSS_ORG_VERIFICATION_STATS_QUERY = gql`
  query GetCrossOrgVerificationStats {
    crossOrgVerificationStats {
      notSubmitted
      pendingOrgReview
      orgChangesRequested
      orgVerified
      orgArchived
      total
    }
  }
`;

export const GET_CROSS_ORG_VERIFICATION_QUEUE_PAGE_QUERY = gql`
  query GetCrossOrgVerificationQueuePage($filter: String!, $search: String, $page: Int!, $pageSize: Int!) {
    crossOrgVerificationQueuePage(filter: $filter, search: $search, page: $page, pageSize: $pageSize) {
      items {
        organizationId
        organizationName
        exercise {
          ...VerificationQueueItemFragment
        }
      }
      totalCount
      page
      pageSize
      totalPages
      hasPreviousPage
      hasNextPage
      filter
      search
    }
  }
  ${VERIFICATION_QUEUE_ITEM_FRAGMENT}
`;

export const GET_CROSS_ORG_VERIFICATION_QUEUE_NAVIGATOR_QUERY = gql`
  query GetCrossOrgVerificationQueueNavigator($currentExerciseId: String!, $filter: String!, $search: String) {
    crossOrgVerificationQueueNavigator(currentExerciseId: $currentExerciseId, filter: $filter, search: $search) {
      currentExerciseId
      positionInQueue
      totalInQueue
      remainingCount
      nextExerciseId
      previousExerciseId
      filter
      search
    }
  }
`;

export const GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY = gql`
  query GetExerciseByIdForCrossOrgVerification($exerciseId: String!) {
    exerciseByIdForCrossOrgVerification(exerciseId: $exerciseId) {
      ...ExerciseFullFragment
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;

export const GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_ADMIN_QUERY = gql`
  query GetExerciseByIdForCrossOrgVerificationAdmin($exerciseId: String!) {
    exerciseByIdForCrossOrgVerification(exerciseId: $exerciseId) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;
