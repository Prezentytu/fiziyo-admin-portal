import { gql } from "@apollo/client";

/**
 * Mutacja do przypisywania pacjentów do fizjoterapeuty
 * NAPRAWIONE: Zwraca pełny obiekt patient dla cache update
 */
export const ASSIGN_PATIENTS_TO_THERAPIST_MUTATION = gql`
  mutation AssignPatientsToTherapist(
    $therapistId: String!
    $patientIds: [String!]!
    $organizationId: String!
    $notes: String
  ) {
    assignPatientsToTherapist(
      therapistId: $therapistId
      patientIds: $patientIds
      organizationId: $organizationId
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
      startDate
      endDate
      contextType
      contextLabel
      contextColor
      relationType
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
    }
  }
`;

/**
 * Mutacja do usuwania przypisania pacjenta z fizjoterapeuty
 */
export const REMOVE_PATIENT_FROM_THERAPIST_MUTATION = gql`
  mutation RemovePatientFromTherapist($therapistId: String!, $patientId: String!, $organizationId: String!) {
    removePatientFromTherapist(therapistId: $therapistId, patientId: $patientId, organizationId: $organizationId)
  }
`;

/**
 * Mutacja do aktualizacji statusu pacjenta u fizjoterapeuty
 */
export const UPDATE_PATIENT_STATUS_MUTATION = gql`
  mutation UpdatePatientStatus($therapistId: String!, $patientId: String!, $organizationId: String!, $status: String!) {
    updatePatientStatus(
      therapistId: $therapistId
      patientId: $patientId
      organizationId: $organizationId
      status: $status
    )
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
 * Mutacja do transferu pacjenta do innego fizjoterapeuty
 */
export const TRANSFER_PATIENT_TO_THERAPIST_MUTATION = gql`
  mutation TransferPatientToTherapist($assignmentId: String!, $newTherapistId: String!, $transferNotes: String) {
    transferpatientToTherapist(
      assignmentId: $assignmentId
      newTherapistId: $newTherapistId
      transferNotes: $transferNotes
    ) {
      id
      therapistId
      patientId
      organizationId
      status
      notes
      startDate
      endDate
      contextType
      contextLabel
      contextColor
      therapist {
        id
        fullname
        email
      }
    }
  }
`;

/**
 * Mutacja do zakończenia leczenia pacjenta
 */
export const COMPLETE_PATIENT_TREATMENT_MUTATION = gql`
  mutation CompletePatientTreatment($assignmentId: String!, $completionNotes: String) {
    completepatientTreatment(assignmentId: $assignmentId, completionNotes: $completionNotes) {
      id
      therapistId
      patientId
      organizationId
      status
      notes
      endDate
      contextType
      contextLabel
      contextColor
    }
  }
`;

/**
 * Mutacja do reaktywacji leczenia pacjenta
 * Przywraca zakończone leczenie do statusu "active"
 */
export const REACTIVATE_PATIENT_TREATMENT_MUTATION = gql`
  mutation ReactivatePatientTreatment($assignmentId: String!) {
    reactivatepatientTreatment(assignmentId: $assignmentId) {
      id
      therapistId
      patientId
      organizationId
      status
      notes
      startDate
      endDate
      contextType
      contextLabel
      contextColor
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
 * Mutacja do aktualizacji notatek przy pacjencie
 * Pozwala na dodawanie/edycję notatek klinicznych
 */
export const UPDATE_PATIENT_NOTES_MUTATION = gql`
  mutation UpdatePatientNotes(
    $therapistId: String!
    $patientId: String!
    $organizationId: String!
    $notes: String!
  ) {
    updatePatientNotes(
      therapistId: $therapistId
      patientId: $patientId
      organizationId: $organizationId
      notes: $notes
    ) {
      id
      therapistId
      patientId
      organizationId
      notes
      status
    }
  }
`;