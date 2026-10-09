import { gql } from '@apollo/client';

/**
 * Mutacja do tworzenia nowego gabinetu
 */
export const CREATE_CLINIC_MUTATION = gql`
  mutation CreateClinic($organizationId: String!, $name: String!, $address: String!, $contactInfo: String) {
    createClinic(organizationId: $organizationId, name: $name, address: $address, contactInfo: $contactInfo) {
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
 * Mutacja do aktualizacji gabinetu
 */
export const UPDATE_CLINIC_MUTATION = gql`
  mutation UpdateClinic($clinicId: String!, $name: String, $address: String, $contactInfo: String, $isActive: Boolean) {
    updateClinic(clinicId: $clinicId, name: $name, address: $address, contactInfo: $contactInfo, isActive: $isActive) {
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
 * Mutacja do usuwania gabinetu (soft delete)
 */
export const DELETE_CLINIC_MUTATION = gql`
  mutation DeleteClinic($clinicId: String!) {
    deleteClinic(clinicId: $clinicId)
  }
`;

/**
 * Mutacja do przypisywania pacjentów do gabinetu
 */
export const ASSIGN_PATIENTS_TO_CLINIC_MUTATION = gql`
  mutation AssignPatientsToClinic($clinicId: String!, $patientIds: [String!]!) {
    assignPatientsToClinic(clinicId: $clinicId, patientIds: $patientIds) {
      assigned
    }
  }
`;

/**
 * Mutacja do przypisywania fizjoterapeutów do gabinetu
 */
export const ASSIGN_THERAPISTS_TO_CLINIC_MUTATION = gql`
  mutation AssignTherapistsToClinic($clinicId: String!, $therapistIds: [String!]!) {
    assignTherapistsToClinic(clinicId: $clinicId, therapistIds: $therapistIds) {
      assigned
    }
  }
`;
