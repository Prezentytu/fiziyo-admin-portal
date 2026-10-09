import { gql } from '@apollo/client';

// Fragment dla pełnych danych przypisania
export const PATIENT_ASSIGNMENT_FULL_FRAGMENT = gql`
  fragment PatientAssignmentFullFragment on PatientAssignment {
    id
    assignedAt
    assignedById
    assignedBy {
      id
      fullname
      email
      image
    }
    completionCount
    endDate
    exerciseId
    exerciseSetId
    exerciseOverrides
    lastCompletedAt
    currentCycleStartedAt
    notes
    startDate
    status
    userId
    assignedSets
    assignedReps
    assignedDuration
    assignedExecutionTime
    assignedRestBetweenSets
    assignedRestBetweenReps
    assignedTempo
    hasCustomization
    patientRPE
    patientPainLevel
    frequency {
      timesPerDay
      timesPerWeek
      breakBetweenSets
      isFlexible
      monday
      tuesday
      wednesday
      thursday
      friday
      saturday
      sunday
    }
    exerciseSet {
      id
      name
      description
      isActive
      creationTime
      organizationId
      exerciseMappings {
        id
        exerciseId
        exerciseSetId
        order
        sets
        reps
        duration
        restSets
        restReps
        preparationTime
        executionTime
        tempo
        notes
        customName
        customDescription
        overridesJson
        loadType
        loadValue
        loadUnit
        loadText
        load {
          loadWeightKg
          loadSource
          type
          value
          unit
          text
        }
        exercise {
          id
          name
          type
          side
          imageUrl
          images
          thumbnailUrl
          patientDescription
          clinicalDescription
          audioCue
          notes
          videoUrl
          preparationTime
          rangeOfMotion
          difficultyLevel
          tempo
          enrichmentData
          defaultExecutionTime
          defaultSets
          defaultReps
          defaultDuration
          defaultRestBetweenSets
          defaultRestBetweenReps
        }
      }
    }
    exercise {
      id
      name
      type
      side
      imageUrl
      images
      thumbnailUrl
      patientDescription
      clinicalDescription
      audioCue
      notes
      videoUrl
      preparationTime
      enrichmentData
      defaultExecutionTime
      defaultSets
      defaultReps
      defaultDuration
      defaultRestBetweenSets
      defaultRestBetweenReps
    }
  }
`;

// Query do pobierania przypisań z filtrem (np. dla konkretnego pacjenta)
export const GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY = gql`
  query GetPatientAssignmentsByUser($userId: String!) {
    patientAssignments(where: { userId: { eq: $userId } }) {
      ...PatientAssignmentFullFragment
    }
  }
  ${PATIENT_ASSIGNMENT_FULL_FRAGMENT}
`;

// Query do pobierania wszystkich przypisań ćwiczeń w organizacji
// Filtrowanie po organizationId odbywa się po stronie pacjenta przez therapistPatients
export const GET_ALL_PATIENT_ASSIGNMENTS_QUERY = gql`
  query GetAllPatientAssignments {
    patientAssignments(order: [{ assignedAt: DESC }]) {
      id
      userId
      exerciseSetId
      exerciseId
      assignedById
      status
      assignedAt
      startDate
      endDate
      completionCount
      lastCompletedAt
      notes
    }
  }
`;
