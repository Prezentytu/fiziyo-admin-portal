import { gql } from '@apollo/client';

import { EXERCISE_SET_LOG_ENTRY_FRAGMENT } from '../queries/exerciseSetLog.queries';

/** Bez `visibility` backend bierze zakres autora: gabinet dla personelu, zespół FiziYo dla zespołu. */
export const ADD_EXERCISE_SET_NOTE_MUTATION = gql`
  mutation AddExerciseSetNote($exerciseSetId: String!, $body: String!, $visibility: ExerciseSetLogVisibility) {
    addExerciseSetNote(exerciseSetId: $exerciseSetId, body: $body, visibility: $visibility) {
      ...ExerciseSetLogEntryFragment
    }
  }
  ${EXERCISE_SET_LOG_ENTRY_FRAGMENT}
`;

/** Zmienia tylko własną notatkę; zdarzeń systemowych nie edytuje nikt. */
export const UPDATE_EXERCISE_SET_NOTE_MUTATION = gql`
  mutation UpdateExerciseSetNote($id: String!, $body: String, $visibility: ExerciseSetLogVisibility) {
    updateExerciseSetNote(id: $id, body: $body, visibility: $visibility) {
      ...ExerciseSetLogEntryFragment
    }
  }
  ${EXERCISE_SET_LOG_ENTRY_FRAGMENT}
`;

export const DELETE_EXERCISE_SET_NOTE_MUTATION = gql`
  mutation DeleteExerciseSetNote($id: String!) {
    deleteExerciseSetNote(id: $id)
  }
`;
