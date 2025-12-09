import { gql } from "@apollo/client";

/**
 * Mutacja do oznaczania ćwiczenia jako wykonanego przez pacjenta
 * Aktualizuje status przypisania oraz licznik ukończonych ćwiczeń
 */
export const MARK_EXERCISE_COMPLETED_MUTATION = gql`
  mutation MarkExerciseCompleted(
    $assignmentId: String!
    $exerciseId: String!
    $userId: String!
    $painLevel: Decimal
    $difficultyLevel: Decimal
    $completedSets: Decimal
    $completedReps: Decimal
    $completedTime: Decimal
    $notes: String
    $patientNotes: String
  ) {
    markExerciseCompleted(
      assignmentId: $assignmentId
      exerciseId: $exerciseId
      userId: $userId
      painLevel: $painLevel
      difficultyLevel: $difficultyLevel
      completedSets: $completedSets
      completedReps: $completedReps
      completedTime: $completedTime
      notes: $notes
      patientNotes: $patientNotes
    ) {
      id
      userId
      assignmentId
      exerciseId
      completedAt
      status
      painLevel
      difficultyLevel
      completedSets
      completedReps
      completedTime
      notes
      patientNotes
      rating
      realDuration
    }
  }
`;

/**
 * Mutacja do rozpoczynania sesji wykonywania ćwiczenia przez pacjenta
 */
export const START_EXERCISE_SESSION_MUTATION = gql`
  mutation StartExerciseSession($userId: String!, $assignmentId: String!, $exerciseId: String!) {
    startExerciseSession(userId: $userId, assignmentId: $assignmentId, exerciseId: $exerciseId)
  }
`;

/**
 * Mutacja do aktualizacji postępu sesji ćwiczenia
 */
export const UPDATE_EXERCISE_PROGRESS_MUTATION = gql`
  mutation UpdateExerciseProgress(
    $progressId: String!
    $completedSets: Decimal
    $completedReps: Decimal
    $completedTime: Decimal
    $notes: String
    $patientNotes: String
    $painLevel: Decimal
    $difficultyLevel: Decimal
    $realDuration: Decimal
    $status: String
  ) {
    updateExerciseProgress(
      progressId: $progressId
      completedSets: $completedSets
      completedReps: $completedReps
      completedTime: $completedTime
      notes: $notes
      patientNotes: $patientNotes
      painLevel: $painLevel
      difficultyLevel: $difficultyLevel
      realDuration: $realDuration
      status: $status
    )
  }
`;

/**
 * Mutacja do zapisywania feedbacku po ukończeniu ćwiczenia
 * Aktualizuje istniejący rekord postępu o dodatkowe informacje z ankiety
 */
export const SAVE_EXERCISE_FEEDBACK_MUTATION = gql`
  mutation SaveExerciseFeedback(
    $userId: String!
    $assignmentId: String!
    $exerciseId: String!
    $difficultyLevel: Decimal!
    $painLevel: Decimal!
    $overallFeeling: Decimal!
    $notes: String
    $sessionDuration: Decimal!
    $completedSets: Decimal!
    $totalSets: Decimal!
  ) {
    saveExerciseFeedback(
      userId: $userId
      assignmentId: $assignmentId
      exerciseId: $exerciseId
      difficultyLevel: $difficultyLevel
      painLevel: $painLevel
      overallFeeling: $overallFeeling
      notes: $notes
      sessionDuration: $sessionDuration
      completedSets: $completedSets
      totalSets: $totalSets
    ) {
      success
      progressId
      updatedAt
    }
  }
`;
