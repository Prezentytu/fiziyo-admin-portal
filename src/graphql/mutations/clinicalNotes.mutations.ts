import { gql } from '@apollo/client';
import { CLINICAL_NOTE_FULL_FRAGMENT } from '../queries/clinicalNotes.queries';

// Mutation do tworzenia notatki
export const CREATE_CLINICAL_NOTE_MUTATION = gql`
  mutation CreateClinicalNote(
    $patientId: String!
    $organizationId: String!
    $visitType: VisitType!
    $visitDate: DateTime!
    $title: String
    $templateId: String
    $therapistPatientAssignmentId: String
    $sections: ClinicalNoteSectionsInput
  ) {
    createClinicalNote(
      patientId: $patientId
      organizationId: $organizationId
      visitType: $visitType
      visitDate: $visitDate
      title: $title
      templateId: $templateId
      therapistPatientAssignmentId: $therapistPatientAssignmentId
      sections: $sections
    ) {
      ...ClinicalNoteFullFragment
    }
  }
  ${CLINICAL_NOTE_FULL_FRAGMENT}
`;

// Mutation do aktualizacji notatki
export const UPDATE_CLINICAL_NOTE_MUTATION = gql`
  mutation UpdateClinicalNote(
    $id: String!
    $visitType: VisitType
    $visitDate: DateTime
    $title: String
    $status: ClinicalNoteStatus
    $linkedExerciseSetId: String
    $sections: ClinicalNoteSectionsInput
  ) {
    updateClinicalNote(
      id: $id
      visitType: $visitType
      visitDate: $visitDate
      title: $title
      status: $status
      linkedExerciseSetId: $linkedExerciseSetId
      sections: $sections
    ) {
      ...ClinicalNoteFullFragment
    }
  }
  ${CLINICAL_NOTE_FULL_FRAGMENT}
`;

// Mutation do usuwania notatki
export const DELETE_CLINICAL_NOTE_MUTATION = gql`
  mutation DeleteClinicalNote($id: String!) {
    deleteClinicalNote(id: $id)
  }
`;
