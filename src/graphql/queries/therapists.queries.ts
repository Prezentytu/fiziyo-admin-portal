import { gql } from '@apollo/client';

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
    therapistPatients(where: { therapistId: { eq: $therapistId }, organizationId: { eq: $organizationId } }) {
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
 * Query do pobierania raportu aktywności pacjenta
 */
export const GET_PATIENT_ACTIVITY_REPORT_QUERY = gql`
  query GetPatientActivityReport($patientId: String!, $periodStart: DateTime, $periodEnd: DateTime) {
    patientActivityReport(patientId: $patientId, periodStart: $periodStart, periodEnd: $periodEnd) {
      summary {
        completedExercises
        totalExercises
        overallCompletionPercentage
        totalCompletedSessions
        totalExerciseSets
      }
      exerciseSets {
        exerciseSetId
        name
        totalExercises
        completedExercises
        completionPercentage
        avgPainLevel
      }
    }
  }
`;

/**
 * Query do pobierania WSZYSTKICH pacjentów organizacji (Collaborative Care Model)
 * Zwraca pacjentów z informacją o przypisanym fizjoterapeucie (lub null jeśli brak)
 * oraz statusem Premium (Pay-as-you-go Billing)
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
      # Premium Access (Pay-as-you-go Billing)
      premiumValidUntil
      premiumActivatedAt
      premiumStatus
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
      # Activity Tracking
      lastActivity
    }
  }
`;
