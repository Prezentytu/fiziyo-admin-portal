import type { OrganizationVerificationStatus } from '@/graphql/types/adminExercise.types';

export function canSubmitForOrganizationReview(status?: OrganizationVerificationStatus): boolean {
  return status === 'NOT_SUBMITTED' || status === 'ORG_CHANGES_REQUESTED';
}

export function canWithdrawFromOrganizationReview(status?: OrganizationVerificationStatus): boolean {
  return status === 'PENDING_ORG_REVIEW';
}

export function canApproveOrganizationExercise(status?: OrganizationVerificationStatus): boolean {
  return status === 'PENDING_ORG_REVIEW';
}

export function canRequestOrganizationChanges(status?: OrganizationVerificationStatus): boolean {
  return status === 'PENDING_ORG_REVIEW';
}

export function canArchiveOrganizationExercise(status?: OrganizationVerificationStatus): boolean {
  return status === 'ORG_VERIFIED';
}

export function canPromoteOrganizationExerciseToGlobal(status?: OrganizationVerificationStatus): boolean {
  return status === 'ORG_VERIFIED';
}
