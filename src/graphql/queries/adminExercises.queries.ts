import { gql } from "@apollo/client";

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
    notes
    audioCue
    tempo
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
    createdBy {
      id
      fullname
      email
      image
    }
  }
`;

/**
 * Get exercises pending review (Status = PendingReview)
 * Used in verification queue
 */
export const GET_PENDING_EXERCISES_QUERY = gql`
  query GetPendingExercises {
    pendingExercises {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Get exercises by specific status
 * Used for filtering in tabs (PendingReview, ChangesRequested, etc.)
 */
export const GET_EXERCISES_BY_STATUS_QUERY = gql`
  query GetExercisesByStatus($status: ContentStatus!) {
    exercisesByStatus(status: $status) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Get exercise status statistics
 * Used in dashboard stats cards
 */
export const GET_EXERCISE_STATUS_STATS_QUERY = gql`
  query GetExerciseStatusStats {
    exerciseStatusStats {
      draft
      pendingReview
      changesRequested
      approved
      published
      total
    }
  }
`;

/**
 * Get system exercises (IsSystem = true)
 * Gold standard exercises
 */
export const GET_SYSTEM_EXERCISES_QUERY = gql`
  query GetSystemExercises {
    systemExercises {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Get exercises with uncategorized tags
 * For tag cleanup workflow
 */
export const GET_EXERCISES_WITH_UNCATEGORIZED_TAGS_QUERY = gql`
  query GetExercisesWithUncategorizedTags {
    exercisesWithUncategorizedTags {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;
