import { gql } from '@apollo/client';
import { EXERCISE_FULL_FRAGMENT } from './exercises.queries';
import { VERIFICATION_QUEUE_ITEM_FRAGMENT } from './adminExercises.queries';

export const GET_CROSS_ORG_VERIFICATION_STATS_QUERY = gql`
  query GetCrossOrgVerificationStats($organizationIds: [String!]) {
    crossOrgVerificationStats(organizationIds: $organizationIds) {
      notSubmitted
      pendingOrgReview
      orgChangesRequested
      orgVerified
      orgArchived
      internalFixes
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
    $organizationIds: [String!]
  ) {
    crossOrgVerificationQueuePage(
      filter: $filter
      search: $search
      page: $page
      pageSize: $pageSize
      sort: $sort
      dateFrom: $dateFrom
      dateTo: $dateTo
      organizationIds: $organizationIds
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

/** Organizacje z ćwiczeniami w kolejkach weryfikacji; zasila wybór organizacji w zakładce „Organizacje klientów”. */
export const GET_CROSS_ORG_VERIFICATION_ORGANIZATIONS_QUERY = gql`
  query GetCrossOrgVerificationOrganizations {
    crossOrgVerificationOrganizations {
      organizationId
      organizationName
      pendingCount
      totalCount
    }
  }
`;

export const GET_CROSS_ORG_VERIFICATION_QUEUE_NAVIGATOR_QUERY = gql`
  query GetCrossOrgVerificationQueueNavigator(
    $currentExerciseId: String!
    $filter: String!
    $search: String
    $sort: VerificationQueueSort
    $dateFrom: DateTime
    $dateTo: DateTime
    $organizationIds: [String!]
  ) {
    crossOrgVerificationQueueNavigator(
      currentExerciseId: $currentExerciseId
      filter: $filter
      search: $search
      sort: $sort
      dateFrom: $dateFrom
      dateTo: $dateTo
      organizationIds: $organizationIds
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
