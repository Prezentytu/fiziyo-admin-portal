import { gql } from "@apollo/client";

/**
 * Query do pobierania pacjentów przypisanych do fizjoterapeuty
 * NAPRAWIONE: therapistPatients zwraca TherapistPatientAssignment z relacjami patient/therapist
 * Backend NIE filtruje automatycznie - frontend używa where clause
 * UWAGA: Filtruje tylko aktywnych - użyj GET_ALL_THERAPIST_PATIENTS_QUERY dla wszystkich
 */
export const GET_THERAPIST_PATIENTS_QUERY = gql`
  query GetTherapistPatients($therapistId: String!, $organizationId: String!) {
    therapistPatients(
      where: { therapistId: { eq: $therapistId }, organizationId: { eq: $organizationId }, status: { eq: "active" } }
    ) {
      id
      therapistId
      patientId
      organizationId
      assignedAt
      status
      notes
      contextType
      contextLabel
      contextColor
      relationType
      startDate
      endDate
      patient {
        id
        clerkId
        fullname
        email
        image
        isShadowUser
        organizationIds
        personalData {
          firstName
          lastName
        }
        contactData {
          phone
          address
        }
      }
      therapist {
        id
        fullname
      }
    }
  }
`;

/**
 * Query do pobierania wszystkich pacjentów przypisanych do fizjoterapeuty (włącznie z nieaktywnymi)
 * Używane do filtrowania po stronie klienta
 */
export const GET_ALL_THERAPIST_PATIENTS_QUERY = gql`
  query GetAllTherapistPatients($therapistId: String!, $organizationId: String!) {
    therapistPatients(
      where: { therapistId: { eq: $therapistId }, organizationId: { eq: $organizationId } }
    ) {
      id
      therapistId
      patientId
      organizationId
      assignedAt
      status
      notes
      contextType
      contextLabel
      contextColor
      relationType
      startDate
      endDate
      patient {
        id
        clerkId
        fullname
        email
        image
        isShadowUser
        organizationIds
        personalData {
          firstName
          lastName
        }
        contactData {
          phone
          address
        }
      }
      therapist {
        id
        fullname
      }
    }
  }
`;

/**
 * Query do pobierania fizjoterapeutów przypisanych do pacjenta
 * NAPRAWIONE: Używa where clause zamiast argumentów, zwraca TherapistPatientAssignment
 */
export const GET_PATIENT_THERAPISTS_QUERY = gql`
  query GetPatientTherapists($patientId: String!, $organizationId: String!) {
    patientTherapists(
      where: { patientId: { eq: $patientId }, organizationId: { eq: $organizationId }, status: { eq: "active" } }
    ) {
      id
      therapistId
      patientId
      organizationId
      assignedAt
      status
      contextType
      contextLabel
      contextColor
      relationType
      startDate
      endDate
      therapist {
        id
        clerkId
        fullname
        email
        image
        personalData {
          firstName
          lastName
        }
        contactData {
          phone
          address
        }
      }
      organization {
        id
        name
      }
    }
  }
`;

/**
 * Query do pobierania głównego fizjoterapeuty pacjenta

* NAPRAWIONE: Używa patientTherapists z where clause (zgodnie ze schema)
 */
export const GET_PATIENT_THERAPIST_QUERY = gql`
  query GetPatientTherapist($patientId: String!, $organizationId: String!) {
    patientTherapists(
      where: { patientId: { eq: $patientId }, organizationId: { eq: $organizationId }, status: { eq: "active" } }
    ) {
      therapist {
        id
        clerkId
        fullname
        email
        image
        personalData {
          firstName
          lastName
        }
        contactData {
          phone
          address
        }
      }
    }
  }
`;

/**
 * Query do pobierania przypisań zestawów ćwiczeń dla pacjenta
 * Zwraca PatientAssignment z informacjami o przypisaniu (kto, kiedy, status)
 */
export const GET_PATIENT_EXERCISE_SET_ASSIGNMENTS_QUERY = gql`
  query GetPatientExerciseSetAssignments($patientId: String!) {
    patientExerciseSets(patientId: $patientId) {
      id
      userId
      exerciseSetId
      assignedAt
      startDate
      endDate
      status
      notes
    }
  }
`;

/**
 * Query do pobierania raportu aktywności pacjenta
 */
export const GET_PATIENT_ACTIVITY_REPORT_QUERY = gql`
  query GetPatientActivityReport($patientId: String!, $therapistId: String!, $startDate: DateTime, $endDate: DateTime) {
    patientActivityReport(patientId: $patientId, therapistId: $therapistId, startDate: $startDate, endDate: $endDate) {
      patientId
      therapistId
      startDate
      endDate
      totalAssignments
      totalExerciseSets
      totalExercises
      completedExercises
      completionRate
      lastActivity
    }
  }
`;

/**
 * Query do pobierania wszystkich przypisań pacjentów do fizjoterapeutów w organizacji
 * NAPRAWIONE: Używa therapistPatients z where clause (zgodnie ze schema)
 */
export const GET_THERAPIST_PATIENT_ASSIGNMENTS_QUERY = gql`
  query GetTherapistPatientAssignments($organizationId: String!) {
    therapistPatients(where: { organizationId: { eq: $organizationId } }) {
      id
      therapistId
      patientId
      organizationId
      assignedAt
      assignedById
      status
      notes
    }
  }
`;

/**
 * Query do pobierania WSZYSTKICH pacjentów organizacji (Collaborative Care Model)
 * Zwraca pacjentów z informacją o przypisanym fizjoterapeucie (lub null jeśli brak)
 * Filter: "all" | "my" | "unassigned"
 */
export const GET_ORGANIZATION_PATIENTS_QUERY = gql`
  query GetOrganizationPatients($organizationId: String!, $filter: String) {
    organizationPatients(organizationId: $organizationId, filter: $filter) {
      patient {
        id
        clerkId
        fullname
        email
        image
        isShadowUser
        organizationIds
        personalData {
          firstName
          lastName
        }
        contactData {
          phone
          address
        }
      }
      therapist {
        id
        fullname
        email
        image
      }
      assignmentId
      assignmentStatus
      assignedAt
      contextLabel
      contextColor
    }
  }
`;
