import { gql } from '@apollo/client';
import { ADMIN_EXERCISE_FRAGMENT, ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT } from '../queries/adminExercises.queries';

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
 * @param rejectionReason - Required reason category for rejection
 * @param notes - Required notes/feedback for the author
 */
export const REJECT_EXERCISE_MUTATION = gql`
  mutation RejectExercise($exerciseId: String!, $rejectionReason: String!, $notes: String!) {
    rejectExercise(exerciseId: $exerciseId, rejectionReason: $rejectionReason, notes: $notes) {
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

export const BATCH_ARCHIVE_EXERCISES_MUTATION = gql`
  mutation BatchArchiveExercises($exerciseIds: [String!]!, $reason: String) {
    batchArchiveExercises(exerciseIds: $exerciseIds, reason: $reason) {
      totalRequested
      successCount
      failedIds
      errors
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
 * @param fieldName - Field name to update
 * @param value - New value (string)
 */
export const UPDATE_EXERCISE_FIELD_MUTATION = gql`
  mutation UpdateExerciseField($exerciseId: String!, $fieldName: String!, $value: String) {
    updateExerciseField(exerciseId: $exerciseId, fieldName: $fieldName, value: $value) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

export const APPROVE_ORGANIZATION_EXERCISE_MUTATION = gql`
  mutation ApproveOrganizationExercise($exerciseId: String!, $reviewNotes: String) {
    approveOrganizationExercise(exerciseId: $exerciseId, reviewNotes: $reviewNotes) {
      ...OrgVerificationMutationResultFragment
    }
  }
  ${ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT}
`;

export const REQUEST_ORGANIZATION_EXERCISE_CHANGES_MUTATION = gql`
  mutation RequestOrganizationExerciseChanges($exerciseId: String!, $reviewNotes: String!, $rejectionReason: String!) {
    requestOrganizationExerciseChanges(
      exerciseId: $exerciseId
      reviewNotes: $reviewNotes
      rejectionReason: $rejectionReason
    ) {
      ...OrgVerificationMutationResultFragment
    }
  }
  ${ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT}
`;

export const ARCHIVE_ORGANIZATION_EXERCISE_MUTATION = gql`
  mutation ArchiveOrganizationExercise($exerciseId: String!, $reason: String) {
    archiveOrganizationExercise(exerciseId: $exerciseId, reason: $reason) {
      ...OrgVerificationMutationResultFragment
    }
  }
  ${ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT}
`;

export const BATCH_ARCHIVE_ORGANIZATION_EXERCISES_MUTATION = gql`
  mutation BatchArchiveOrganizationExercises($organizationId: String!, $exerciseIds: [String!]!, $reason: String) {
    batchArchiveOrganizationExercises(organizationId: $organizationId, exerciseIds: $exerciseIds, reason: $reason) {
      totalRequested
      successCount
      failedIds
      errors
    }
  }
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
    aiConfidence
    isAISuggested
    isVerified
    createdAt
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
  mutation SetExerciseRelation($sourceExerciseId: String!, $targetExerciseId: String!, $relationType: ExerciseRelationType!) {
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
  mutation RemoveExerciseRelation($sourceExerciseId: String!, $relationType: ExerciseRelationType!) {
    removeExerciseRelation(sourceExerciseId: $sourceExerciseId, relationType: $relationType)
  }
`;
