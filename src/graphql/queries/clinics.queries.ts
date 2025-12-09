import { gql } from "@apollo/client";

/**
 * Query do pobierania gabinetów organizacji
 * Używa dedykowanego query endpoint organizationClinics
 */
export const GET_ORGANIZATION_CLINICS_QUERY = gql`
  query GetOrganizationClinics($organizationId: String!) {
    organizationClinics(organizationId: $organizationId) {
      id
      organizationId
      name
      address
      contactInfo
      isActive
      createdById
    }
  }
`;

/**
 * Query do pobierania gabinetów z filtering/sorting
 * Używa dedykowanego query endpoint z UseProjection/UseFiltering/UseSorting
 */
export const GET_CLINICS_QUERY = gql`
  query GetClinics($where: ClinicFilterInput, $order: [ClinicSortInput!]) {
    clinics(where: $where, order: $order) {
      id
      organizationId
      name
      address
      contactInfo
      isActive
      createdById
    }
  }
`;

/**
 * Query do pobierania pojedynczego gabinetu po ID
 */
export const GET_CLINIC_BY_ID_QUERY = gql`
  query GetClinicById($id: String!) {
    clinicById(id: $id) {
      id
      organizationId
      name
      address
      contactInfo
      isActive
      createdById
    }
  }
`;

/**
 * Query do pobierania pacjentów przypisanych do gabinetu
 */
export const GET_CLINIC_PATIENTS_QUERY = gql`
  query GetClinicPatients($clinicId: String!) {
    clinicPatients(clinicId: $clinicId) {
      id
      fullname
      email
    }
  }
`;

/**
 * Query do pobierania liczby pacjentów w gabinecie
 * WAŻNE: To jest Query, nie Mutation (fix z poprzedniej implementacji)
 */
export const GET_CLINIC_PATIENTS_COUNT_QUERY = gql`
  query GetClinicPatientsCount($clinicId: String!) {
    clinicPatientsCount(clinicId: $clinicId)
  }
`;

/**
 * Query do pobierania fizjoterapeutów pracujących w gabinecie
 */
export const GET_CLINIC_THERAPISTS_QUERY = gql`
  query GetClinicTherapists($clinicId: String!) {
    clinicTherapists(clinicId: $clinicId) {
      id
      fullname
      email
    }
  }
`;

/**
 * Query do pobierania liczby fizjoterapeutów w gabinecie
 */
export const GET_CLINIC_THERAPISTS_COUNT_QUERY = gql`
  query GetClinicTherapistsCount($clinicId: String!) {
    clinicTherapistsCount(clinicId: $clinicId)
  }
`;

/**
 * Query do pobierania gabinetów fizjoterapeuty
 */
export const GET_THERAPIST_CLINICS_QUERY = gql`
  query GetTherapistClinics($therapistId: String!) {
    therapistClinics(therapistId: $therapistId) {
      id
      organizationId
      name
      address
      contactInfo
      isActive
    }
  }
`;

/**
 * Query do pobierania gabinetów pacjenta
 */
export const GET_PATIENT_CLINICS_QUERY = gql`
  query GetPatientClinics($patientId: String!, $organizationId: String!) {
    patientClinics(patientId: $patientId, organizationId: $organizationId) {
      id
      organizationId
      name
      address
      contactInfo
      isActive
    }
  }
`;
