import { gql } from "@apollo/client";

// Fragment dla podstawowych danych postępu ćwiczenia
export const EXERCISE_PROGRESS_BASIC_FRAGMENT = gql`
  fragment ExerciseProgressBasicFragment on ExerciseProgress {
    id
    userId
    exerciseId
    status
    completedAt
  }
`;

// Fragment dla pełnych danych postępu
export const EXERCISE_PROGRESS_FULL_FRAGMENT = gql`
  fragment ExerciseProgressFullFragment on ExerciseProgress {
    id
    userId
    assignmentId
    exerciseId
    exerciseSetId
    completedAt
    status
    completedReps
    completedSets
    completedTime
    difficultyLevel
    notes
    patientNotes
    rating
    painLevel
    realDuration
  }
`;

// Query do pobierania listy postępów
export const GET_EXERCISE_PROGRESS_QUERY = gql`
  query GetExerciseProgress {
    exerciseProgress {
      id
      userId
      exerciseId
      status
      completedAt
    }
  }
`;

// Query do pobierania postępów dla konkretnego użytkownika
export const GET_EXERCISE_PROGRESS_BY_USER_QUERY = gql`
  query GetExerciseProgressByUser($userId: String!) {
    exerciseProgress(where: { userId: { eq: $userId } }) {
      ...ExerciseProgressFullFragment
    }
  }
  ${EXERCISE_PROGRESS_FULL_FRAGMENT}
`;

// Query do pobierania postępów dla konkretnego ćwiczenia
export const GET_EXERCISE_PROGRESS_BY_EXERCISE_QUERY = gql`
  query GetExerciseProgressByExercise($exerciseId: String!) {
    exerciseProgress(where: { exerciseId: { eq: $exerciseId } }) {
      ...ExerciseProgressFullFragment
    }
  }
  ${EXERCISE_PROGRESS_FULL_FRAGMENT}
`;

// Query do pobierania pojedynczego postępu
export const GET_EXERCISE_PROGRESS_BY_ID_QUERY = gql`
  query GetExerciseProgressById($id: String!) {
    exerciseProgressById(id: $id) {
      ...ExerciseProgressFullFragment
    }
  }
  ${EXERCISE_PROGRESS_FULL_FRAGMENT}
`;

// Query do pobierania podsumowania postępu wszystkich zestawów ćwiczeń użytkownika
// NAPRAWIONE: allExerciseSetsProgress zamiast getAllExerciseSetsProgress
export const GET_ALL_EXERCISE_SETS_PROGRESS_QUERY = gql`
  query GetAllExerciseSetsProgress($userId: String!) {
    allExerciseSetsProgress(userId: $userId) {
      assignmentId
      totalExercises
      completedExercises
    }
  }
`;
