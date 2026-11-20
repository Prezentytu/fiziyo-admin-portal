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
  }
`;

/**
 * Wątek uwag weryfikacji. Zespół FiziYo dostaje całość; autor ćwiczenia tylko rundy odesłane do niego
 * i własne odpowiedzi; każdy inny pustą listę.
 */
export const GET_EXERCISE_REVIEW_NOTES_QUERY = gql`
  query GetExerciseReviewNotes($exerciseId: String!) {
    exerciseReviewNotes(exerciseId: $exerciseId) {
      ...ExerciseReviewNoteFragment
    }
  }
  ${EXERCISE_REVIEW_NOTE_FRAGMENT}
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
