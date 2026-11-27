import { gql } from '@apollo/client';

/** SPEC-066 (fizjo-app): zestaw na start, czyli szablon przypisywany samoczynnie każdemu pacjentowi gabinetu. */
export const SET_STARTER_EXERCISE_SET_MUTATION = gql`
  mutation SetStarterExerciseSet($exerciseSetId: String!, $enabled: Boolean!) {
    setStarterExerciseSet(exerciseSetId: $exerciseSetId, enabled: $enabled) {
      exerciseSetId
      isStarterSet
      assignedCount
      cancelledCount
    }
  }
`;
