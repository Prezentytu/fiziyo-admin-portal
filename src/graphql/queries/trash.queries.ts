import { gql } from '@apollo/client';

/** Zestawy w koszu organizacji z tokenu, które wywołujący może przywrócić. */
export const GET_TRASHED_EXERCISE_SETS_QUERY = gql`
  query GetTrashedExerciseSets {
    trashedExerciseSets {
      id
      name
      kind
      exerciseCount
      deletedAt
      purgeAt
      deletedByName
    }
  }
`;

/** Ćwiczenia w koszu organizacji z tokenu, które wywołujący może przywrócić. */
export const GET_TRASHED_EXERCISES_QUERY = gql`
  query GetTrashedExercises {
    trashedExercises {
      id
      name
      imageUrl
      deletedAt
      purgeAt
      deletedByName
    }
  }
`;
