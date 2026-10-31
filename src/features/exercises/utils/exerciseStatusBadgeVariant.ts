export type ExerciseStatusBadgeVariant = 'overlay-info' | 'overlay-success' | 'overlay-warning' | 'overlay-danger';

export interface ExerciseStatusFlags {
  isSubmittedToGlobal: boolean;
  isPendingReview: boolean;
  isChangesRequested: boolean;
  isPendingOrganizationReview: boolean;
  isOrganizationChangesRequested: boolean;
  isOrganizationVerified: boolean;
}

/** Overlay badge tone for the exercise card; the organization track wins over the global one. `null` = no status tone. */
export function exerciseStatusBadgeVariant(flags: ExerciseStatusFlags): ExerciseStatusBadgeVariant | null {
  if (flags.isOrganizationVerified) return 'overlay-success';
  if (flags.isOrganizationChangesRequested) return 'overlay-danger';
  if (flags.isPendingOrganizationReview) return 'overlay-warning';
  if (flags.isChangesRequested) return 'overlay-danger';
  if (flags.isPendingReview) return 'overlay-warning';
  if (flags.isSubmittedToGlobal) return 'overlay-info';
  return null;
}
