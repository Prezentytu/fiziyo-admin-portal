import { gql } from "@apollo/client";
import { ADMIN_EXERCISE_FRAGMENT } from "../queries/adminExercises.queries";

/**
 * GraphQL Mutations for Admin Exercise Verification Module
 * Requires: ContentManager or SiteSuperAdmin role
 */

/**
 * Approve an exercise - changes status to Published
 * Sets isPublicTemplate = true
 * @param exerciseId - ID of the exercise to approve
 * @param notes - Optional approval notes (e.g., praise, suggestions)
 */
export const APPROVE_EXERCISE_MUTATION = gql`
  mutation ApproveExercise($exerciseId: String!, $notes: String) {
    approveExercise(exerciseId: $exerciseId, notes: $notes) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Reject an exercise - changes status to ChangesRequested
 * @param exerciseId - ID of the exercise to reject
 * @param notes - Required rejection notes (reason for rejection)
 */
export const REJECT_EXERCISE_MUTATION = gql`
  mutation RejectExercise($exerciseId: String!, $notes: String!) {
    rejectExercise(exerciseId: $exerciseId, notes: $notes) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

/**
 * Bulk approve multiple exercises
 * @param exerciseIds - Array of exercise IDs to approve
 */
export const BULK_APPROVE_EXERCISES_MUTATION = gql`
  mutation BulkApproveExercises($exerciseIds: [String!]!) {
    bulkApproveExercises(exerciseIds: $exerciseIds) {
      totalRequested
      successCount
      failedIds
      errors
    }
  }
`;

/**
 * Bulk reject multiple exercises
 * @param exerciseIds - Array of exercise IDs to reject
 * @param notes - Required rejection notes (applies to all)
 */
export const BULK_REJECT_EXERCISES_MUTATION = gql`
  mutation BulkRejectExercises($exerciseIds: [String!]!, $notes: String!) {
    bulkRejectExercises(exerciseIds: $exerciseIds, notes: $notes) {
      totalRequested
      successCount
      failedIds
      errors
    }
  }
`;

/**
 * Resubmit an exercise for review
 * Changes status from ChangesRequested/Draft to PendingReview
 * @param exerciseId - ID of the exercise to resubmit
 */
export const RESUBMIT_FOR_REVIEW_MUTATION = gql`
  mutation ResubmitForReview($exerciseId: String!) {
    resubmitForReview(exerciseId: $exerciseId) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;
