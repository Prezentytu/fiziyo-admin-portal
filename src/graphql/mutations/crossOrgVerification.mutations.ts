import { gql } from '@apollo/client';
import { ADMIN_EXERCISE_FRAGMENT } from '@/graphql/queries/adminExercises.queries';

export const APPROVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION = gql`
  mutation ApproveOrganizationExerciseAsAdmin($exerciseId: String!, $reviewNotes: String) {
    approveOrganizationExerciseAsAdmin(exerciseId: $exerciseId, reviewNotes: $reviewNotes) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
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
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;

export const ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION = gql`
  mutation ArchiveOrganizationExerciseAsAdmin($exerciseId: String!, $reason: String) {
    archiveOrganizationExerciseAsAdmin(exerciseId: $exerciseId, reason: $reason) {
      ...AdminExerciseFragment
    }
  }
  ${ADMIN_EXERCISE_FRAGMENT}
`;
