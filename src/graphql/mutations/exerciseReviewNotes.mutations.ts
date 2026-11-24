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

/**
 * Przydziela ćwiczenia osobie z zespołu (`assigneeId`, domyślnie sobie) albo zdejmuje przydział (`assign: false`).
 * Bez `takeOver` cudzych przydziałów nie rusza (wracają w `skippedExerciseIds`); z `takeOver` je przejmuje.
 */
export const ASSIGN_EXERCISES_FOR_REVIEW_MUTATION = gql`
  mutation AssignExercisesForReview(
    $exerciseIds: [String!]!
    $assign: Boolean!
    $assigneeId: String
    $takeOver: Boolean
  ) {
    assignExercisesForReview(exerciseIds: $exerciseIds, assign: $assign, assigneeId: $assigneeId, takeOver: $takeOver) {
      changedExerciseIds
      skippedExerciseIds
    }
  }
`;

/**
 * „Przydziel następne N”: daje osobie z zespołu (domyślnie sobie) następne niczyje ćwiczenia z „Do sprawdzenia”
 * w kolejności listy. Dwie osoby klikające naraz dostają rozłączne ćwiczenia (zapis warunkowy w backendzie).
 */
export const CLAIM_NEXT_EXERCISES_FOR_REVIEW_MUTATION = gql`
  mutation ClaimNextExercisesForReview(
    $count: Int!
    $sort: VerificationQueueSort
    $search: String
    $dateFrom: DateTime
    $dateTo: DateTime
    $assigneeId: String
  ) {
    claimNextExercisesForReview(
      count: $count
      sort: $sort
      search: $search
      dateFrom: $dateFrom
      dateTo: $dateTo
      assigneeId: $assigneeId
    ) {
      claimedExerciseIds
      assigneeTotal
    }
  }
`;
