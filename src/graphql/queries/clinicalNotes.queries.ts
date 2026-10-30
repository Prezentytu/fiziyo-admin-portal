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

/** Visits of the signed-in therapist in a date range (chat home "Dziś"). */
export const GET_THERAPIST_VISIT_NOTES_QUERY = gql`
  query GetTherapistVisitNotes($therapistId: String!, $organizationId: String!, $from: DateTime!, $to: DateTime!) {
    therapistClinicalNotes(
      therapistId: $therapistId
      organizationId: $organizationId
      where: { visitDate: { gte: $from, lt: $to } }
      order: [{ visitDate: ASC }]
    ) {
      id
      patientId
      visitDate
      title
    }
  }
`;

/** Most recent visit of a patient in the organization (chat context panel). */
export const GET_PATIENT_LAST_VISIT_QUERY = gql`
  query GetPatientLastVisit($patientId: String!, $organizationId: String!) {
    patientClinicalNotes(patientId: $patientId, organizationId: $organizationId, take: 1, order: [{ visitDate: DESC }]) {
      id
      visitDate
      title
    }
  }
`;
