import { gql } from '@apollo/client';
import { EXERCISE_FULL_FRAGMENT } from './exercises.queries';
import { VERIFICATION_QUEUE_ITEM_FRAGMENT } from './adminExercises.queries';

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
  query GetCrossOrgVerificationQueuePage(
    $filter: String!
    $search: String
    $page: Int!
    $pageSize: Int!
    $sort: VerificationQueueSort
    $dateFrom: DateTime
    $dateTo: DateTime
  ) {
    crossOrgVerificationQueuePage(
      filter: $filter
      search: $search
      page: $page
      pageSize: $pageSize
      sort: $sort
      dateFrom: $dateFrom
      dateTo: $dateTo
    ) {
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
  query GetCrossOrgVerificationQueueNavigator(
    $currentExerciseId: String!
    $filter: String!
    $search: String
    $sort: VerificationQueueSort
    $dateFrom: DateTime
    $dateTo: DateTime
  ) {
    crossOrgVerificationQueueNavigator(
      currentExerciseId: $currentExerciseId
      filter: $filter
      search: $search
      sort: $sort
      dateFrom: $dateFrom
      dateTo: $dateTo
    ) {
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
