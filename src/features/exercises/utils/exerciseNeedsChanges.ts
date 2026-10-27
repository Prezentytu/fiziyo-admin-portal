export interface ExerciseReviewStatusSource {
  status?: string | null;
  organizationVerificationStatus?: string | null;
}

export function exerciseNeedsChanges(exercise: ExerciseReviewStatusSource): boolean {
  return (
    exercise.status === 'CHANGES_REQUESTED' ||
    exercise.status === 'REJECTED' ||
    exercise.organizationVerificationStatus === 'ORG_CHANGES_REQUESTED'
  );
}
