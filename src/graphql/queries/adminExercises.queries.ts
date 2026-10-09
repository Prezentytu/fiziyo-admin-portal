import { gql } from '@apollo/client';
import { EXERCISE_FULL_FRAGMENT } from './exercises.queries';

/**
 * GraphQL Queries for Admin Exercise Verification Module
 * Requires: ContentManager or SiteSuperAdmin role
 */

// Fragment for admin exercise with verification fields
export const ADMIN_EXERCISE_FRAGMENT = gql`
  fragment AdminExerciseFragment on Exercise {
    id
    name
    patientDescription
    clinicalDescription
    type
    side
    defaultSets
    defaultReps
    defaultDuration
    defaultRestBetweenSets
    defaultRestBetweenReps
    preparationTime
    defaultExecutionTime
    thumbnailUrl
    imageUrl
    images
    gifUrl
    videoUrl
    enrichmentData
    notes
    audioCue
    tempo
    defaultLoad {
      loadWeightKg
      loadSource
      type
      value
      unit
      text
    }
    loadType
    loadValue
    loadUnit
    loadText
    mainTags
    additionalTags
    scope
    isActive
    isSystem
    isPublicTemplate
    isSystemExample
    status
    adminReviewNotes
    contributorId
    createdById
    organizationId
    difficultyLevel
    progressionFamilyId
    createdAt
    updatedAt
    # Global submission tracking (nowy model weryfikacji)
    globalSubmissionId
    sourceOrganizationExerciseId
    submittedToGlobalAt
    organizationVerificationStatus
    submittedForOrgReviewAt
    orgReviewedById
    orgReviewedAt
    orgReviewNotes
    createdBy {
      id
      fullname
      email
      image
    }
  }
`;

/** Minimal fields returned by org verification mutations (avoids non-null createdBy resolver issues). */
export const ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT = gql`
  fragment OrgVerificationMutationResultFragment on Exercise {
    id
    organizationVerificationStatus
    submittedForOrgReviewAt
    orgReviewedById
    orgReviewedAt
    orgReviewNotes
  }
`;

export const VERIFICATION_QUEUE_ITEM_FRAGMENT = gql`
  fragment VerificationQueueItemFragment on Exercise {
    id
    name
    status
    thumbnailUrl
    imageUrl
    images
    patientDescription
    createdAt
    updatedAt
    organizationVerificationStatus
    submittedForOrgReviewAt
    orgReviewedAt
    orgReviewNotes
    createdBy {
      id
      fullname
      email
      image
    }
  }
`;

export const GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY = gql`
  query GetExerciseByIdForAdmin($id: String!) {
    exerciseByIdForAdmin(id: $id) {
      ...ExerciseFullFragment
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;

/**
 * Get exercise verification statistics
 * Used in dashboard stats cards
 */
export const GET_VERIFICATION_STATS_QUERY = gql`
  query GetVerificationStats {
    verificationStats {
      pendingReview
      changesRequested
      approved
      published
      archivedGlobal
      total
    }
  }
`;

export const GET_VERIFICATION_QUEUE_PAGE_QUERY = gql`
  query GetVerificationQueuePage($filter: String!, $search: String, $page: Int!, $pageSize: Int!) {
    verificationQueuePage(filter: $filter, search: $search, page: $page, pageSize: $pageSize) {
      items {
        ...VerificationQueueItemFragment
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

export const GET_VERIFICATION_QUEUE_NAVIGATOR_QUERY = gql`
  query GetVerificationQueueNavigator($currentExerciseId: String!, $filter: String!, $search: String) {
    verificationQueueNavigator(currentExerciseId: $currentExerciseId, filter: $filter, search: $search) {
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

export const GET_ORGANIZATION_VERIFICATION_STATS_QUERY = gql`
  query GetOrganizationVerificationStats($organizationId: String!) {
    organizationVerificationStats(organizationId: $organizationId) {
      notSubmitted
      pendingOrgReview
      orgChangesRequested
      orgVerified
      orgArchived
      total
    }
  }
`;

export const GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY = gql`
  query GetOrganizationVerificationQueuePage(
    $organizationId: String!
    $filter: String!
    $search: String
    $page: Int!
    $pageSize: Int!
  ) {
    organizationVerificationQueuePage(
      organizationId: $organizationId
      filter: $filter
      search: $search
      page: $page
      pageSize: $pageSize
    ) {
      items {
        ...VerificationQueueItemFragment
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

export const GET_ORGANIZATION_VERIFICATION_QUEUE_NAVIGATOR_QUERY = gql`
  query GetOrganizationVerificationQueueNavigator(
    $organizationId: String!
    $currentExerciseId: String!
    $filter: String!
    $search: String
  ) {
    organizationVerificationQueueNavigator(
      organizationId: $organizationId
      currentExerciseId: $currentExerciseId
      filter: $filter
      search: $search
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

export const GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY = gql`
  query GetExerciseByIdForOrgVerification($organizationId: String!, $id: String!) {
    exerciseByIdForOrgVerification(organizationId: $organizationId, id: $id) {
      ...ExerciseFullFragment
    }
  }
  ${EXERCISE_FULL_FRAGMENT}
`;

/**
 * Get reviewer statistics for gamification
 * Used in "Twoje Wpływy" section
 */
export const GET_REVIEWER_STATS_QUERY = gql`
  query GetReviewerStats {
    reviewerStats {
      totalApproved
      totalRejected
      currentStreak
      total
    }
  }
`;

// ============================================
// Exercise Relationships (Graph) Queries
// ============================================
