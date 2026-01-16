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
  query GetPendingReviewExercises {
    pendingReviewExercises {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Get exercises with changes requested
 * Used in verification queue
 */
export const GET_CHANGES_REQUESTED_EXERCISES_QUERY = gql`
  query GetChangesRequestedExercises {
    changesRequestedExercises {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Get approved exercises (ready to publish)
 */
export const GET_APPROVED_EXERCISES_QUERY = gql`
  query GetApprovedExercises {
    approvedExercises {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
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

/**
 * Get suggested tags for an exercise
 * AI-powered tag suggestions based on exercise content
 */
export const GET_SUGGESTED_TAGS_QUERY = gql`
  query GetSuggestedTags($exerciseId: String!) {
    suggestedTags(exerciseId: $exerciseId) {
      mainTags
      additionalTags
      suggestedCategory
    }
  }
`;

// ============================================
// Exercise Relationships (Graph) Queries
// ============================================

/**
 * Get exercise relationships (regression, progression)
 * Backend returns ExerciseRelationTarget directly (flat structure)
 * @param exerciseId - ID of the exercise
 */
export const GET_EXERCISE_RELATIONSHIPS_QUERY = gql`
  query GetExerciseRelationships($exerciseId: String!) {
    exerciseRelationships(exerciseId: $exerciseId) {
      exerciseId
      regression {
        id
        name
        thumbnailUrl
        gifUrl
        difficultyLevel
        isVerified
        isAISuggested
      }
      progression {
        id
        name
        thumbnailUrl
        gifUrl
        difficultyLevel
        isVerified
        isAISuggested
      }
    }
  }
`;

/**
 * Get AI-suggested candidates for relation
 * Uses DifficultyLevel and ProgressionFamilyId to find similar exercises
 * @param exerciseId - ID of the exercise
 * @param relationType - REGRESSION or PROGRESSION
 * @param limit - Max number of candidates
 */
export const GET_RELATION_CANDIDATES_QUERY = gql`
  query GetRelationCandidates(
    $exerciseId: String!
    $relationType: ExerciseRelationType!
    $limit: Int
  ) {
    relationCandidates(
      exerciseId: $exerciseId
      relationType: $relationType
      limit: $limit
    ) {
      exerciseId
      relationType
      candidates {
        id
        name
        thumbnailUrl
        gifUrl
        difficultyLevel
        isSameFamily
        mainTags
      }
    }
  }
`;

/**
 * Search exercises for relation assignment
 * Used in "Smart Search" popover
 * @param searchQuery - Search query
 * @param excludeExerciseId - ID to exclude (current exercise)
 * @param difficultyLevel - Optional difficulty filter
 * @param limit - Max results
 */
export const SEARCH_EXERCISES_FOR_RELATION_QUERY = gql`
  query SearchExercisesForRelation(
    $searchQuery: String!
    $excludeExerciseId: String
    $difficultyLevel: DifficultyLevel
    $limit: Int
  ) {
    searchExercisesForRelation(
      searchQuery: $searchQuery
      excludeExerciseId: $excludeExerciseId
      difficultyLevel: $difficultyLevel
      limit: $limit
    ) {
      id
      name
      thumbnailUrl
      gifUrl
      difficultyLevel
      mainTags
      type
    }
  }
`;