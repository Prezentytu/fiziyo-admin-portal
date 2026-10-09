import { gql } from '@apollo/client';

/**
 * Mutacja do usuwania przypisania pacjenta z fizjoterapeuty
 */
export const REMOVE_PATIENT_FROM_THERAPIST_MUTATION = gql`
  mutation RemovePatientFromTherapist($therapistId: String!, $patientId: String!, $organizationId: String!) {
    removePatientFromTherapist(therapistId: $therapistId, patientId: $patientId, organizationId: $organizationId)
  }
`;

/**
 * Mutacja do przypisywania pojedynczego pacjenta do fizjoterapeuty
 * Rozszerzona wersja z contextType, contextLabel i contextColor
 */
export const ASSIGN_PATIENT_TO_THERAPIST_MUTATION = gql`
  mutation AssignPatientToTherapist(
    $patientId: String!
    $therapistId: String!
    $organizationId: String!
    $clinicId: String
    $contextType: AssignmentContextType!
    $contextLabel: String
    $contextColor: String
    $notes: String
  ) {
    assignPatientToTherapist(
      patientId: $patientId
      therapistId: $therapistId
      organizationId: $organizationId
      clinicId: $clinicId
      contextType: $contextType
      contextLabel: $contextLabel
      contextColor: $contextColor
      notes: $notes
    ) {
      id
      therapistId
      patientId
      organizationId
      assignedAt
      assignedById
      status
      notes
      clinicId
      startDate
      endDate
      contextType
      contextLabel
      contextColor
      relationType
      patient {
        id
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
 * Mutacja do aktualizacji kontekstu leczenia
 * Pozwala na zmianę contextType, contextLabel i contextColor
 */
export const UPDATE_TREATMENT_CONTEXT_MUTATION = gql`
  mutation UpdateTreatmentContext(
    $assignmentId: String!
    $contextType: AssignmentContextType
    $contextLabel: String
    $contextColor: String
  ) {
    updateTreatmentContext(
      assignmentId: $assignmentId
      contextType: $contextType
      contextLabel: $contextLabel
      contextColor: $contextColor
    ) {
      id
      therapistId
      patientId
      organizationId
      status
      contextType
      contextLabel
      contextColor
      notes
    }
  }
`;

/**
 * Mutacja do przejęcia opieki nad pacjentem (Collaborative Care Model)
 * - Jeśli pacjent nie ma fizjo → przypisz od razu
 * - Jeśli pacjent ma fizjo → zwróć info o poprzednim (requiresConfirmation=true)
 * - Po potwierdzeniu (confirmed=true) → przenieś pacjenta
 */
export const TAKE_OVER_PATIENT_MUTATION = gql`
  mutation TakeOverPatient($patientId: String!, $organizationId: String!, $confirmed: Boolean) {
    takeOverPatient(patientId: $patientId, organizationId: $organizationId, confirmed: $confirmed) {
      success
      requiresConfirmation
      previousTherapist {
        id
        fullname
        email
        image
      }
      assignmentId
      message
    }
  }
`;

/**
 * Mutacja do trwałego usunięcia pacjenta z organizacji
 * Tylko dla Admin/Owner
 * Usuwa wszystkie przypisania i relacje pacjenta z organizacją
 */
export const REMOVE_PATIENT_FROM_ORGANIZATION_MUTATION = gql`
  mutation RemovePatientFromOrganization($patientId: String!, $organizationId: String!) {
    removePatientFromOrganization(patientId: $patientId, organizationId: $organizationId)
  }
`;
