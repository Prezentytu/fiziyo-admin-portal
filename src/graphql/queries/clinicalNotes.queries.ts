import { gql } from '@apollo/client';

// Fragment dla podstawowych danych notatki
export const CLINICAL_NOTE_BASIC_FRAGMENT = gql`
  fragment ClinicalNoteBasicFragment on ClinicalNote {
    id
    patientId
    therapistId
    organizationId
    visitDate
    visitType
    status
    title
    createdAt
    updatedAt
  }
`;

// Fragment dla pełnych danych notatki
export const CLINICAL_NOTE_FULL_FRAGMENT = gql`
  fragment ClinicalNoteFullFragment on ClinicalNote {
    id
    patientId
    therapistId
    organizationId
    therapistPatientAssignmentId
    visitDate
    visitType
    templateId
    status
    title
    linkedExerciseSetId
    createdAt
    updatedAt
    signedAt
    signedById
    sections {
      interview {
        mainComplaint
        painLocation
        painDuration
        painCharacter
        painIntensity
        aggravatingFactors
        relievingFactors
        previousTreatment
        comorbidities
        medications
        occupation
        additionalNotes
      }
      examination {
        posture
        rangeOfMotion {
          movement
          value
          side
        }
        specialTests {
          name
          result
          notes
        }
        muscleStrength
        palpation
        sensation
        observations
        additionalNotes
      }
      diagnosis {
        icd10Codes {
          code
          description
          isPrimary
        }
        icfCodes {
          code
          description
          category
        }
        differentialDiagnosis
        clinicalReasoning
      }
      treatmentPlan {
        shortTermGoals
        longTermGoals
        interventions
        visitFrequency
        expectedDuration
        homeRecommendations
        additionalNotes
      }
      visitProgress {
        techniques
        patientResponse
        planModifications
        homeRecommendations
        currentPainLevel
        progressComparison
        nextSteps
      }
    }
    patient {
      id
      fullname
      email
      image
    }
    therapist {
      id
      fullname
      email
    }
    linkedExerciseSet {
      id
      name
    }
  }
`;

// Query do pobierania notatek pacjenta
export const GET_PATIENT_CLINICAL_NOTES_QUERY = gql`
  query GetPatientClinicalNotes($patientId: String!, $organizationId: String!) {
    patientClinicalNotes(patientId: $patientId, organizationId: $organizationId) {
      ...ClinicalNoteBasicFragment
      patient {
        id
        fullname
      }
      therapist {
        id
        fullname
      }
    }
  }
  ${CLINICAL_NOTE_BASIC_FRAGMENT}
`;

// Query do pobierania pojedynczej notatki
export const GET_CLINICAL_NOTE_BY_ID_QUERY = gql`
  query GetClinicalNoteById($id: String!) {
    clinicalNoteById(id: $id) {
      ...ClinicalNoteFullFragment
    }
  }
  ${CLINICAL_NOTE_FULL_FRAGMENT}
`;

// Query do pobierania ostatniej notatki (do kopiowania)
export const GET_LAST_CLINICAL_NOTE_QUERY = gql`
  query GetLastClinicalNote($patientId: String!, $therapistId: String!, $organizationId: String!) {
    lastClinicalNote(patientId: $patientId, therapistId: $therapistId, organizationId: $organizationId) {
      ...ClinicalNoteFullFragment
    }
  }
  ${CLINICAL_NOTE_FULL_FRAGMENT}
`;

// Query do pobierania notatek fizjoterapeuty
export const GET_THERAPIST_CLINICAL_NOTES_QUERY = gql`
  query GetTherapistClinicalNotes($therapistId: String!, $organizationId: String!, $limit: Int) {
    therapistClinicalNotes(therapistId: $therapistId, organizationId: $organizationId, limit: $limit) {
      ...ClinicalNoteBasicFragment
      patient {
        id
        fullname
        image
      }
    }
  }
  ${CLINICAL_NOTE_BASIC_FRAGMENT}
`;

// Query do pobierania wersji roboczych
export const GET_DRAFT_CLINICAL_NOTES_QUERY = gql`
  query GetDraftClinicalNotes($therapistId: String!, $organizationId: String!) {
    draftClinicalNotes(therapistId: $therapistId, organizationId: $organizationId) {
      ...ClinicalNoteBasicFragment
      patient {
        id
        fullname
        image
      }
    }
  }
  ${CLINICAL_NOTE_BASIC_FRAGMENT}
`;

// Query do pobierania liczby notatek
export const GET_PATIENT_CLINICAL_NOTES_COUNT_QUERY = gql`
  query GetPatientClinicalNotesCount($patientId: String!, $organizationId: String!) {
    patientClinicalNotesCount(patientId: $patientId, organizationId: $organizationId)
  }
`;

