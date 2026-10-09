import { gql } from '@apollo/client';

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
    exercise {
      id
      name
      type
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

// Query do pobierania podsumowania postępu wszystkich zestawów ćwiczeń użytkownika
// NAPRAWIONE: allExerciseSetsProgress zamiast getAllExerciseSetsProgress
export const GET_ALL_EXERCISE_SETS_PROGRESS_QUERY = gql`
  query GetAllExerciseSetsProgress($userId: String!) {
    allExerciseSetsProgress(userId: $userId) {
      assignmentId
      exerciseSetId
      exerciseSetName
      totalExercises
      completedExercises
      lastCompletedAt
    }
  }
`;
