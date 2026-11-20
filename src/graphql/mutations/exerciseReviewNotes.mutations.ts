import { gql } from '@apollo/client';

import { EXERCISE_REVIEW_NOTE_FRAGMENT } from '../queries/exerciseReviewNotes.queries';

export const ADD_EXERCISE_REVIEW_NOTE_MUTATION = gql`
  mutation AddExerciseReviewNote(
    $exerciseId: String!
    $body: String!
    $contextKey: String
    $contextLabel: String
    $replyToNoteId: String
  ) {
    addExerciseReviewNote(
      exerciseId: $exerciseId
      body: $body
      contextKey: $contextKey
      contextLabel: $contextLabel
      replyToNoteId: $replyToNoteId
    ) {
      ...ExerciseReviewNoteFragment
    }
  }
  ${EXERCISE_REVIEW_NOTE_FRAGMENT}
`;

/** Odcina rundę: `INTERNAL_FIXES` zostawia ćwiczenie u zespołu, `AUTHOR` odsyła je autorowi z uwagami. */
export const SEND_EXERCISE_REVIEW_NOTES_MUTATION = gql`
  mutation SendExerciseReviewNotes($exerciseId: String!, $target: ExerciseReviewNotesTarget!) {
    sendExerciseReviewNotes(exerciseId: $exerciseId, target: $target) {
      id
      status
      organizationVerificationStatus
      adminReviewNotes
      orgReviewNotes
    }
  }
`;

export const COMPLETE_INTERNAL_EXERCISE_FIXES_MUTATION = gql`
  mutation CompleteInternalExerciseFixes($exerciseId: String!) {
    completeInternalExerciseFixes(exerciseId: $exerciseId) {
      id
    }
  }
`;

/** Bierze ćwiczenia do siebie (`assign: true`) albo zdejmuje z siebie; cudzych przypisań nie rusza. */
export const ASSIGN_EXERCISES_FOR_REVIEW_MUTATION = gql`
  mutation AssignExercisesForReview($exerciseIds: [String!]!, $assign: Boolean!) {
    assignExercisesForReview(exerciseIds: $exerciseIds, assign: $assign) {
      changedExerciseIds
      skippedExerciseIds
    }
  }
`;
