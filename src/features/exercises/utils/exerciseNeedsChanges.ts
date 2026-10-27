export interface ExerciseReviewStatusSource {
  status?: string | null;
  globalSubmissionStatus?: string | null;
  organizationVerificationStatus?: string | null;
}

export function exerciseNeedsChanges(exercise: ExerciseReviewStatusSource): boolean {
  return (
    exercise.status === 'CHANGES_REQUESTED' ||
    exercise.globalSubmissionStatus === 'CHANGES_REQUESTED' ||
    exercise.organizationVerificationStatus === 'ORG_CHANGES_REQUESTED'
  );
}
