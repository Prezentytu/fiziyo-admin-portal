import { gql } from '@apollo/client';

/**
 * Historia sesji treningowych pacjenta (care-team). Addytywny kontrakt SPEC-025.
 */
export const GET_PATIENT_WORKOUT_SESSIONS_QUERY = gql`
  query GetPatientWorkoutSessions($patientId: String!, $from: DateOnly, $to: DateOnly) {
    patientWorkoutSessions(patientId: $patientId, from: $from, to: $to) {
      sessionId
      assignmentId
      exerciseSetId
      type
      state
      localDate
      slotIndex
      timeZoneId
      startedAt
      completedAt
      events {
        eventId
        exerciseId
        occurredAt
        completedSets
        completedReps
        completedTime
        completionMethod
        completionQuality
        skippedSegments
      }
    }
  }
`;

/**
 * Adherence tygodniowa (flexible) pacjenta dla fizjoterapeuty.
 */
export const GET_PATIENT_WEEKLY_ADHERENCE_QUERY = gql`
  query GetPatientWeeklyAdherence($patientId: String!) {
    patientWeeklyAdherence(patientId: $patientId) {
      assignmentId
      targetSessions
      completedSessions
      weekStartDate
      weekEndDate
    }
  }
`;
