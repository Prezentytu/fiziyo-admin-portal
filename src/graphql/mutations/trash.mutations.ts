import { gql } from '@apollo/client';

export const RESTORE_EXERCISE_SET_MUTATION = gql`
  mutation RestoreExerciseSet($exerciseSetId: String!) {
    restoreExerciseSet(exerciseSetId: $exerciseSetId)
  }
`;

export const PURGE_EXERCISE_SET_MUTATION = gql`
  mutation PurgeExerciseSet($exerciseSetId: String!) {
    purgeExerciseSet(exerciseSetId: $exerciseSetId)
  }
`;

export const RESTORE_EXERCISE_MUTATION = gql`
  mutation RestoreExercise($exerciseId: String!) {
    restoreExercise(exerciseId: $exerciseId)
  }
`;

export const PURGE_EXERCISE_MUTATION = gql`
  mutation PurgeExercise($exerciseId: String!) {
    purgeExercise(exerciseId: $exerciseId)
  }
`;
