import { gql } from "@apollo/client";

// Fragment dla podstawowych danych przypisania pacjenta
export const PATIENT_ASSIGNMENT_BASIC_FRAGMENT = gql`
  fragment PatientAssignmentBasicFragment on PatientAssignment {
    id
    assignedAt
    assignedById
    userId
    status
    notes
  }
`;

// Fragment dla pełnych danych przypisania
export const PATIENT_ASSIGNMENT_FULL_FRAGMENT = gql`
  fragment PatientAssignmentFullFragment on PatientAssignment {
    id
    assignedAt
    assignedById
    completionCount
    endDate
    exerciseId
    exerciseSetId
    exerciseOverrides
    lastCompletedAt
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
        executionTime
        tempo
        notes
        customName
        customDescription
        exercise {
          id
          name
          type
          side
          imageUrl
          images
          thumbnailUrl
          patientDescription
          notes
          videoUrl
          preparationTime
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
      notes
      videoUrl
      preparationTime
      defaultExecutionTime
      defaultSets
      defaultReps
      defaultDuration
      defaultRestBetweenSets
      defaultRestBetweenReps
    }
  }
`;

// Query do pobierania listy przypisań pacjentów
export const GET_PATIENT_ASSIGNMENTS_QUERY = gql`
  query GetPatientAssignments {
    patientAssignments {
      id
      userId
      assignedById
      status
      assignedAt
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

// Query do pobierania aktywnych przypisań pacjenta
export const GET_ACTIVE_PATIENT_ASSIGNMENTS_QUERY = gql`
  query GetActivePatientAssignments($userId: String!) {
    patientAssignments(where: { userId: { eq: $userId }, status: { eq: "active" } }) {
      ...PatientAssignmentFullFragment
    }
  }
  ${PATIENT_ASSIGNMENT_FULL_FRAGMENT}
`;

// Query do pobierania pojedynczego przypisania
export const GET_PATIENT_ASSIGNMENT_BY_ID_QUERY = gql`
  query GetPatientAssignmentById($id: String!) {
    patientAssignmentById(id: $id) {
      ...PatientAssignmentFullFragment
    }
  }
  ${PATIENT_ASSIGNMENT_FULL_FRAGMENT}
`;

// Fragment dla przypisania z danymi użytkownika
export const PATIENT_ASSIGNMENT_WITH_USER_FRAGMENT = gql`
  fragment PatientAssignmentWithUserFragment on PatientAssignment {
    id
    assignedAt
    notes
    status
    user {
      id
      fullname
      email
      image
    }
  }
`;

// Query reużywalne - pobieranie przypisań z filtrowaniem
export const GET_ASSIGNMENTS_WITH_USERS_QUERY = gql`
  query GetAssignmentsWithUsers($assignedById: String, $userId: String, $status: String) {
    patientAssignments(
      where: { assignedById: { eq: $assignedById }, userId: { eq: $userId }, status: { eq: $status } }
      order: [{ assignedAt: DESC }]
    ) {
      ...PatientAssignmentFullFragment
      user {
        id
        fullname
        email
        image
      }
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

// Fragment dla pełnych danych przypisania z zagnieżdżonymi danymi
export const PATIENT_ASSIGNMENT_DETAILS_FRAGMENT = gql`
  fragment PatientAssignmentDetailsFragment on PatientAssignment {
    id
    assignedAt
    assignedById
    completionCount
    endDate
    exerciseId
    exerciseSetId
    exerciseOverrides
    lastCompletedAt
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
      monday
      tuesday
      wednesday
      thursday
      friday
      saturday
      sunday
    }
    user {
      id
      fullname
      email
      image
    }
    assignedBy {
      id
      fullname
      email
      image
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
        executionTime
        tempo
        notes
        customName
        customDescription
        exercise {
          id
          name
          type
          side
          imageUrl
          images
          thumbnailUrl
          patientDescription
          notes
          videoUrl
          preparationTime
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
      notes
      videoUrl
      preparationTime
      defaultExecutionTime
      defaultSets
      defaultReps
      defaultDuration
      defaultRestBetweenSets
      defaultRestBetweenReps
    }
  }
`;

// Query do pobierania szczegółów przypisania (dla assignment lub exercise)
export const GET_PATIENT_ASSIGNMENT_DETAILS_QUERY = gql`
  query GetPatientAssignmentDetails($id: String!) {
    patientAssignmentById(id: $id) {
      ...PatientAssignmentDetailsFragment
    }
  }
  ${PATIENT_ASSIGNMENT_DETAILS_FRAGMENT}
`;
