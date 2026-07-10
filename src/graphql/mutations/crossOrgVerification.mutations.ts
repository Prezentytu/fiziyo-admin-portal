import { gql } from '@apollo/client';
import { ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT } from '@/graphql/queries/adminExercises.queries';

export const APPROVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION = gql`
  mutation ApproveOrganizationExerciseAsAdmin($exerciseId: String!, $reviewNotes: String) {
    approveOrganizationExerciseAsAdmin(exerciseId: $exerciseId, reviewNotes: $reviewNotes) {
      ...OrgVerificationMutationResultFragment
    }
  }
  ${ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT}
`;

export const REQUEST_ORGANIZATION_EXERCISE_CHANGES_AS_ADMIN_MUTATION = gql`
  mutation RequestOrganizationExerciseChangesAsAdmin(
    $exerciseId: String!
    $reviewNotes: String!
    $rejectionReason: String!
  ) {
    requestOrganizationExerciseChangesAsAdmin(
      exerciseId: $exerciseId
      reviewNotes: $reviewNotes
      rejectionReason: $rejectionReason
    ) {
      ...OrgVerificationMutationResultFragment
    }
  }
  ${ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT}
`;

export const ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION = gql`
  mutation ArchiveOrganizationExerciseAsAdmin($exerciseId: String!, $reason: String) {
    archiveOrganizationExerciseAsAdmin(exerciseId: $exerciseId, reason: $reason) {
      ...OrgVerificationMutationResultFragment
    }
  }
  ${ORG_VERIFICATION_MUTATION_RESULT_FRAGMENT}
`;

export const BATCH_ARCHIVE_ORGANIZATION_EXERCISES_AS_ADMIN_MUTATION = gql`
  mutation BatchArchiveOrganizationExercisesAsAdmin(
    $organizationExercises: [OrganizationExerciseScopeInput!]!
    $reason: String
  ) {
    batchArchiveOrganizationExercisesAsAdmin(organizationExercises: $organizationExercises, reason: $reason) {
      totalRequested
      successCount
      failedIds
      errors
    }
  }
`;
