export interface ExerciseReviewFeedbackSource {
  status?: string | null;
  adminReviewNotes?: string | null;
  updatedAt?: string | null;
  organizationVerificationStatus?: string | null;
  orgReviewNotes?: string | null;
  orgReviewedAt?: string | null;
}

export interface ExerciseReviewFeedback {
  notes: string;
  updatedAt?: string;
}

/**
 * Uwagi weryfikatora do pokazania autorowi ćwiczenia: z weryfikacji globalnej
 * (CHANGES_REQUESTED) albo z weryfikacji w organizacji (ORG_CHANGES_REQUESTED).
 */
export function resolveExerciseReviewFeedback(exercise: ExerciseReviewFeedbackSource): ExerciseReviewFeedback | null {
  if (exercise.status === 'CHANGES_REQUESTED' && exercise.adminReviewNotes) {
    return { notes: exercise.adminReviewNotes, updatedAt: exercise.updatedAt ?? undefined };
  }
  if (exercise.organizationVerificationStatus === 'ORG_CHANGES_REQUESTED' && exercise.orgReviewNotes) {
    return { notes: exercise.orgReviewNotes, updatedAt: exercise.orgReviewedAt ?? exercise.updatedAt ?? undefined };
  }
  return null;
}
