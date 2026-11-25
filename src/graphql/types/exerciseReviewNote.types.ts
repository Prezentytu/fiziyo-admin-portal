import type { ExerciseReviewWorkflow } from './adminExercise.types';

/** `NOTE` to uwaga człowieka; reszta to zdarzenia systemowe logu pracy z ćwiczeniem (BW-FZ-125). */
export type ExerciseReviewNoteKind =
  | 'NOTE'
  | 'SENT_TO_INTERNAL_FIXES'
  | 'SENT_TO_AUTHOR'
  | 'INTERNAL_FIXES_DONE'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'REOPENED'
  | 'CONTENT_CHANGED';
export type ExerciseReviewNoteAuthorRole = 'REVIEWER' | 'AUTHOR' | 'ASSISTANT' | 'SYSTEM';
export type ExerciseReviewNotesTarget = 'INTERNAL_FIXES' | 'AUTHOR';
/** Od najwęższego: każdy poziom widzi swój zakres i szersze; zmienić wolno tylko na węższy. */
export type ExerciseReviewNoteVisibility = 'FIZIYO_ADMINS' | 'ORG_REVIEWERS' | 'AUTHOR' | 'THERAPIST';
export type ReviewNotesAccessLevel = 'NONE' | 'THERAPIST' | 'AUTHOR' | 'ORG_REVIEWER' | 'TEAM';

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
  visibility: ExerciseReviewNoteVisibility;
  isSentToAuthor: boolean;
  canChangeVisibility: boolean;
  changedFields: string[];
  sentNoteCount: number | null;
}

export interface ExerciseReviewLogAccess {
  level: ReviewNotesAccessLevel;
  writableVisibilities: ExerciseReviewNoteVisibility[];
  defaultVisibility: ExerciseReviewNoteVisibility | null;
  canSendToAuthor: boolean;
}

export interface GetExerciseReviewNotesResponse {
  exerciseReviewNotes: ExerciseReviewNote[];
}

export interface GetExerciseReviewLogAccessResponse {
  exerciseReviewLogAccess: ExerciseReviewLogAccess;
}

export interface GetExerciseReviewWorkflowResponse {
  exerciseByIdForAdmin: { id: string; reviewWorkflow: ExerciseReviewWorkflow | null } | null;
}

export interface AddExerciseReviewNoteResponse {
  addExerciseReviewNote: ExerciseReviewNote;
}

export interface ChangeExerciseReviewNoteVisibilityResponse {
  changeExerciseReviewNoteVisibility: ExerciseReviewNote;
}

export interface AssignExercisesForReviewResponse {
  assignExercisesForReview: { changedExerciseIds: string[]; skippedExerciseIds: string[] };
}
