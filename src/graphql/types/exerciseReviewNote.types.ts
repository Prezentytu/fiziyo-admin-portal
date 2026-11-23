import type { ExerciseReviewWorkflow } from './adminExercise.types';

export type ExerciseReviewNoteKind = 'NOTE' | 'SENT_TO_INTERNAL_FIXES' | 'SENT_TO_AUTHOR' | 'INTERNAL_FIXES_DONE';
export type ExerciseReviewNoteAuthorRole = 'REVIEWER' | 'AUTHOR' | 'ASSISTANT';
export type ExerciseReviewNotesTarget = 'INTERNAL_FIXES' | 'AUTHOR';

export interface ExerciseReviewNote {
  id: string;
  exerciseId: string;
  kind: ExerciseReviewNoteKind;
  authorRole: ExerciseReviewNoteAuthorRole;
  authorName: string;
  isMine: boolean;
  body: string;
  contextKey: string | null;
  contextLabel: string | null;
  replyToNoteId: string | null;
  createdAt: string;
}

export interface GetExerciseReviewNotesResponse {
  exerciseReviewNotes: ExerciseReviewNote[];
}

export interface GetExerciseReviewWorkflowResponse {
  exerciseByIdForAdmin: { id: string; reviewWorkflow: ExerciseReviewWorkflow | null } | null;
}

export interface AddExerciseReviewNoteResponse {
  addExerciseReviewNote: ExerciseReviewNote;
}

export interface AssignExercisesForReviewResponse {
  assignExercisesForReview: { changedExerciseIds: string[]; skippedExerciseIds: string[] };
}

export interface ClaimNextExercisesForReviewResponse {
  claimNextExercisesForReview: { claimedExerciseIds: string[]; assignedToMe: number };
}
