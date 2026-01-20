import { gql } from "@apollo/client";
import { ADMIN_EXERCISE_FRAGMENT } from "../queries/adminExercises.queries";

/**
 * GraphQL Mutations for Admin Exercise Verification Module
 * Requires: ContentManager or SiteSuperAdmin role
 */

/**
 * Approve an exercise - changes status to Approved
 * @param exerciseId - ID of the exercise to approve
 * @param reviewNotes - Optional review notes (e.g., praise, suggestions)
 */
export const APPROVE_EXERCISE_MUTATION = gql`
  mutation ApproveExercise($exerciseId: String!, $reviewNotes: String) {
    approveExercise(exerciseId: $exerciseId, reviewNotes: $reviewNotes) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Reject an exercise - changes status to ChangesRequested
 * @param exerciseId - ID of the exercise to reject
 * @param rejectionReason - Required reason for rejection
 */
export const REJECT_EXERCISE_MUTATION = gql`
  mutation RejectExercise($exerciseId: String!, $rejectionReason: String!) {
    rejectExercise(exerciseId: $exerciseId, rejectionReason: $rejectionReason) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Unpublish an exercise - changes status back to Draft
 * Used when exercise was published by mistake
 * @param exerciseId - ID of the exercise to unpublish
 * @param reason - Optional reason for unpublishing
 */
export const UNPUBLISH_EXERCISE_MUTATION = gql`
  mutation UnpublishExercise($exerciseId: String!, $reason: String) {
    unpublishExercise(exerciseId: $exerciseId, reason: $reason) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Batch approve multiple exercises
 * @param exerciseIds - Array of exercise IDs to approve
 */
export const BATCH_APPROVE_EXERCISES_MUTATION = gql`
  mutation BatchApproveExercises($exerciseIds: [String!]!) {
    batchApproveExercises(exerciseIds: $exerciseIds) {
      success
      processedCount
      totalRequested
      errors
    }
  }
`;

/**
 * Publish all approved exercises - changes status to Published
 * Makes exercises visible to all users
 */
export const PUBLISH_APPROVED_EXERCISES_MUTATION = gql`
  mutation PublishApprovedExercises {
    publishApprovedExercises {
      success
      publishedCount
      message
    }
  }
`;

/**
 * Scan exercise repository - checks how many new exercises are available
 * Used before importing to show user what will be imported
 */
export const SCAN_EXERCISE_REPOSITORY_MUTATION = gql`
  mutation ScanExerciseRepository {
    scanExerciseRepository {
      success
      totalInRepository
      newExercisesCount
      existingCount
      message
    }
  }
`;

/**
 * Import exercises from repository to review queue
 * @param limit - Optional limit on number of exercises to import
 */
export const IMPORT_EXERCISES_TO_REVIEW_MUTATION = gql`
  mutation ImportExercisesToReview($limit: Int) {
    importExercisesToReview(limit: $limit) {
      success
      totalToImport
      importedCount
      failedCount
      message
      errors
    }
  }
`;

/**
 * Update a single exercise field - optimized for inline editing
 * Supports optimistic UI with immediate response
 * @param exerciseId - ID of the exercise to update
 * @param field - Field name to update
 * @param value - New value (JSON encoded)
 */
export const UPDATE_EXERCISE_FIELD_MUTATION = gql`
  mutation UpdateExerciseField(
    $exerciseId: String!
    $field: String!
    $value: JSON!
  ) {
    updateExerciseField(exerciseId: $exerciseId, field: $field, value: $value) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Approve exercise and get next one - for "Approve & Next" flow
 * Returns the approved exercise and the next pending exercise
 * @param exerciseId - ID of the exercise to approve
 * @param reviewNotes - Optional review notes
 */
export const APPROVE_EXERCISE_AND_GET_NEXT_MUTATION = gql`
  mutation ApproveExerciseAndGetNext($exerciseId: String!, $reviewNotes: String) {
    approveExerciseAndGetNext(exerciseId: $exerciseId, reviewNotes: $reviewNotes) {
      approvedExercise {
        ...AdminExerciseFragment
      }
      nextExercise {
        ...AdminExerciseFragment
      }
      remainingCount
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Batch update exercise fields - for saving multiple changes at once
 * @param exerciseId - ID of the exercise to update
 * @param updates - Object with field:value pairs
 */
export const BATCH_UPDATE_EXERCISE_FIELDS_MUTATION = gql`
  mutation BatchUpdateExerciseFields(
    $exerciseId: String!
    $updates: JSON!
  ) {
    batchUpdateExerciseFields(exerciseId: $exerciseId, updates: $updates) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

// ============================================
// Exercise Relationships (Graph) Mutations
// ============================================

/**
 * Fragment dla relacji ćwiczenia
 */
export const EXERCISE_RELATION_FRAGMENT = gql`
  fragment ExerciseRelationFragment on ExerciseRelation {
    id
    sourceExerciseId
    targetExerciseId
    relationType
    confidence
    isAISuggested
    isVerified
    createdAt
    verifiedAt
    targetExercise {
      id
      name
      thumbnailUrl
      gifUrl
      videoUrl
      difficultyLevel
      mainTags
      type
    }
  }
`;

/**
 * Set exercise relation (regression/progression)
 * Relations are bidirectional - setting A->B also sets B->A (inverse)
 * @param sourceExerciseId - Current exercise
 * @param targetExerciseId - Related exercise
 * @param relationType - REGRESSION or PROGRESSION
 */
export const SET_EXERCISE_RELATION_MUTATION = gql`
  mutation SetExerciseRelation(
    $sourceExerciseId: String!
    $targetExerciseId: String!
    $relationType: String!
  ) {
    setExerciseRelation(
      sourceExerciseId: $sourceExerciseId
      targetExerciseId: $targetExerciseId
      relationType: $relationType
    ) {
      ...ExerciseRelationFragment
    }
  }
  ${EXERCISE_RELATION_FRAGMENT}
`;

/**
 * Remove exercise relation
 * Also removes the inverse relation
 * @param sourceExerciseId - Current exercise
 * @param relationType - REGRESSION or PROGRESSION
 */
export const REMOVE_EXERCISE_RELATION_MUTATION = gql`
  mutation RemoveExerciseRelation(
    $sourceExerciseId: String!
    $relationType: String!
  ) {
    removeExerciseRelation(
      sourceExerciseId: $sourceExerciseId
      relationType: $relationType
    )
  }
`;

/**
 * Batch set relations during approve
 * Saves all relationships when approving exercise
 */
export const SET_EXERCISE_RELATIONS_BATCH_MUTATION = gql`
  mutation SetExerciseRelationsBatch(
    $exerciseId: String!
    $regressionId: String
    $progressionId: String
  ) {
    setExerciseRelationsBatch(
      exerciseId: $exerciseId
      regressionId: $regressionId
      progressionId: $progressionId
    ) {
      regression {
        ...ExerciseRelationFragment
      }
      progression {
        ...ExerciseRelationFragment
      }
    }
  }
  ${EXERCISE_RELATION_FRAGMENT}
`;