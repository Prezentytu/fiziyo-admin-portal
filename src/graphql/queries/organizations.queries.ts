import { gql } from "@apollo/client";

// Fragment dla podstawowych danych organizacji
export const ORGANIZATION_BASIC_FRAGMENT = gql`
  fragment OrganizationBasicFragment on Organization {
    id
    name
    isActive
  }
`;

// Fragment dla pełnych danych organizacji
// NAPRAWIONE: usunięto ownerId (nie istnieje w schema)
export const ORGANIZATION_FULL_FRAGMENT = gql`
  fragment OrganizationFullFragment on Organization {
    id
    creationTime
    name
    description
    updatedAt
    isActive
    logoUrl
    subscriptionPlan
    subscriptionExpiresAt
    allowPersonalExercises
    sharedExercisesByDefault
    autoSyncExampleExercises
    # Contact info for PDF/branding
    address
    contactPhone
    contactEmail
    website
  }
`;

// Query do pobierania listy organizacji
export const GET_ORGANIZATIONS_QUERY = gql`
  query GetOrganizations {
    organizations {
      id
      name
      isActive
    }
  }
`;

// Query do pobierania aktywnych organizacji
export const GET_ACTIVE_ORGANIZATIONS_QUERY = gql`
  query GetActiveOrganizations {
    organizations(where: { isActive: { eq: true } }) {
      ...OrganizationFullFragment
    }
  }
  ${ORGANIZATION_FULL_FRAGMENT}
`;

// Query do pobierania pojedynczej organizacji
export const GET_ORGANIZATION_BY_ID_QUERY = gql`
  query GetOrganizationById($id: String!) {
    organizationById(id: $id) {
      ...OrganizationFullFragment
    }
  }
  ${ORGANIZATION_FULL_FRAGMENT}
`;

// Query do pobierania szczegółów organizacji dla pacjenta (z terapeutą i rolą)
export const GET_PATIENT_ORGANIZATION_DETAILS_QUERY = gql`
  query GetPatientOrganizationDetails($patientId: String!, $organizationId: String!) {
    patientOrganizationDetails(patientId: $patientId, organizationId: $organizationId) {
      organization {
        id
        name
        description
        logoUrl
        isActive
      }
      membershipRole
      joinedAt
      therapist {
        id
        fullname
        email
        image
        personalData {
          firstName
          lastName
        }
      }
      clinics {
        id
        name
        address
        contactInfo
        isActive
      }
      admins {
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

// Query do pobierania członków organizacji
export const GET_ORGANIZATION_MEMBERS_QUERY = gql`
  query GetOrganizationMembers($organizationId: String!) {
    organizationMembers(organizationId: $organizationId) {
      id
      userId
      organizationId
      role
      status
      joinedAt
      clinicIds
      user {
        id
        fullname
        email
        image
      }
    }
  }
`;

// Query do pobierania członkostw użytkownika w organizacjach
export const GET_USER_ORGANIZATION_MEMBERSHIPS_QUERY = gql`
  query GetUserOrganizationMemberships($userId: String!) {
    userOrganizationMemberships(userId: $userId) {
      id
      organizationId
      userId
      role
      invitedBy
      status
      joinedAt
      organization {
        id
        name
        logoUrl
        isActive
      }
    }
  }
`;

// Query do pobierania szczegółów planu subskrypcyjnego organizacji
export const GET_CURRENT_ORGANIZATION_PLAN = gql`
  query GetCurrentOrganizationPlan($organizationId: String!) {
    currentOrganizationPlan(organizationId: $organizationId) {
      currentPlan
      expiresAt
      limits {
        maxExercises
        maxPatients
        maxTherapists
        maxClinics
        allowQRCodes
        allowReports
        allowCustomBranding
        allowSMSReminders
      }
      pricing {
        monthlyPrice
        annualPrice
      }
      currentUsage {
        exercises
        patients
        therapists
      }
    }
  }
`;

// Query do pobierania informacji o wszystkich dostępnych planach
export const GET_ALL_PLANS_INFO = gql`
  query GetAllPlansInfo {
    allPlansInfo {
      plan
      limits
      pricing {
        monthlyPrice
        annualPrice
      }
      features
    }
  }
`;
