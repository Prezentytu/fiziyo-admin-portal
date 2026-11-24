import { gql } from '@apollo/client';

export const EXERCISE_REVIEW_NOTE_FRAGMENT = gql`
  fragment ExerciseReviewNoteFragment on ExerciseReviewNoteView {
    id
    exerciseId
    kind
    authorRole
    authorName
    isMine
    body
    contextKey
    contextLabel
    replyToNoteId
    createdAt
    visibility
    isSentToAuthor
    canChangeVisibility
    changedFields
    sentNoteCount
  }
`;

/**
 * Log pracy z ćwiczeniem (BW-FZ-125): uwagi i zdarzenia, które pytający widzi według zakresu widoczności.
 * Filtruje backend. `organizationTrack` to widok weryfikacji organizacji: bez wpisów zespołu FiziYo.
 */
export const GET_EXERCISE_REVIEW_NOTES_QUERY = gql`
  query GetExerciseReviewNotes($exerciseId: String!, $organizationTrack: Boolean = false) {
    exerciseReviewNotes(exerciseId: $exerciseId, organizationTrack: $organizationTrack) {
      ...ExerciseReviewNoteFragment
    }
  }
  ${EXERCISE_REVIEW_NOTE_FRAGMENT}
`;

/** Co pytający może w logu: poziom, zakresy do nadania i czy ma czym odesłać ćwiczenie do autora. */
export const GET_EXERCISE_REVIEW_LOG_ACCESS_QUERY = gql`
  query GetExerciseReviewLogAccess($exerciseId: String!, $organizationTrack: Boolean = false) {
    exerciseReviewLogAccess(exerciseId: $exerciseId, organizationTrack: $organizationTrack) {
      level
      writableVisibilities
      defaultVisibility
      canSendToAuthor
    }
  }
`;

/** Stan pracy weryfikatorów dla jednego ćwiczenia; tylko zespół FiziYo. */
export const GET_EXERCISE_REVIEW_WORKFLOW_QUERY = gql`
  query GetExerciseReviewWorkflow($id: String!) {
    exerciseByIdForAdmin(id: $id) {
      id
      reviewWorkflow {
        assigneeId
        assigneeName
        assignedToMe
        internalFixStatus
        openNoteCount
      }
    }
  }
`;
