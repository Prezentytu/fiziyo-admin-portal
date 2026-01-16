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
