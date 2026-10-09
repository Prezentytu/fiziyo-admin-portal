import { gql } from '@apollo/client';

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
    allowPersonalExercises
    sharedExercisesByDefault
    requireOrganizationVerification
    autoSyncExampleExercises
    # Contact info for PDF/branding
    address
    contactPhone
    contactEmail
    website
  }
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

// Query do pobierania zaproszeń organizacji
export const GET_ORGANIZATION_INVITATIONS_QUERY = gql`
  query GetOrganizationInvitations($organizationId: String!) {
    organizationInvitations(organizationId: $organizationId) {
      id
      organizationId
      email
      role
      status
      message
      invitationToken
      createdAt
      expiresAt
      acceptedAt
      invitedBy {
        id
        fullname
        email
        image
      }
      acceptedBy {
        id
        fullname
        email
        image
      }
    }
  }
`;

// Query do pobierania statystyk zaproszeń
export const GET_ORGANIZATION_INVITATION_STATS_QUERY = gql`
  query GetOrganizationInvitationStats($organizationId: String!) {
    organizationInvitationStats(organizationId: $organizationId) {
      pending
      accepted
      expired
      revoked
      total
    }
  }
`;

// Query do pobierania zaproszenia po tokenie (publiczne API)
export const GET_INVITATION_BY_TOKEN_QUERY = gql`
  query GetInvitationByToken($token: String!) {
    invitationByToken(token: $token) {
      id
      organizationId
      email
      role
      status
      message
      invitationToken
      createdAt
      expiresAt
      acceptedAt
      invitedBy {
        id
        fullname
        email
        image
      }
      organization {
        id
        name
        logoUrl
      }
    }
  }
`;
