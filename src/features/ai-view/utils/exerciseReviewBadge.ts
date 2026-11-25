/**
 * Znaczek statusu weryfikacji ćwiczenia na kartach czatu. Asystent dostaje ćwiczenia gabinetu w każdym statusie
 * (decyzja B, 25.11.2026), więc fizjoterapeuta musi widzieć, które jeszcze nie są zaakceptowane. Ta sama reguła
 * co `ChatExerciseReviewStatus` w backendzie, z polami dostępnymi w liście pickera (bez kopii zgłoszonej do
 * katalogu: `globalSubmissionStatus` jest drogie dla całej biblioteki).
 */
export interface ExerciseReviewFields {
  scope?: string | null;
  status?: string | null;
  organizationVerificationStatus?: string | null;
}

export type ExerciseReviewBadge =
  { label: 'W weryfikacji'; tone: 'warning' } | { label: 'Do poprawy'; tone: 'destructive' };

export function exerciseReviewBadge(exercise: ExerciseReviewFields | undefined): ExerciseReviewBadge | null {
  if (!exercise || exercise.scope === 'GLOBAL') return null;
  if (exercise.status === 'CHANGES_REQUESTED' || exercise.organizationVerificationStatus === 'ORG_CHANGES_REQUESTED') {
    return { label: 'Do poprawy', tone: 'destructive' };
  }
  if (
    exercise.status === 'PENDING_REVIEW' ||
    exercise.status === 'UPDATE_PENDING' ||
    exercise.organizationVerificationStatus === 'PENDING_ORG_REVIEW'
  ) {
    return { label: 'W weryfikacji', tone: 'warning' };
  }
  return null;
}
