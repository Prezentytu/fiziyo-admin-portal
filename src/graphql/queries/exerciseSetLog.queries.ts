import { gql } from '@apollo/client';

export const EXERCISE_SET_LOG_ENTRY_FRAGMENT = gql`
  fragment ExerciseSetLogEntryFragment on ExerciseSetLogEntryView {
    id
    exerciseSetId
    kind
    authorRole
    authorName
    isMine
    source
    body
    data
    visibility
    createdAt
    updatedAt
  }
`;

/**
 * Historia i notatki zestawu (SPEC-063). Backend zwraca tylko wpisy, które wywołujący może widzieć;
 * pacjent i ktoś bez dostępu do zestawu dostają pustą listę.
 */
export const GET_EXERCISE_SET_LOG_QUERY = gql`
  query GetExerciseSetLog($exerciseSetId: String!) {
    exerciseSetLog(exerciseSetId: $exerciseSetId) {
      ...ExerciseSetLogEntryFragment
    }
  }
  ${EXERCISE_SET_LOG_ENTRY_FRAGMENT}
`;
