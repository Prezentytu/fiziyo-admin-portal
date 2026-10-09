import { gql } from '@apollo/client';

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
