import { gql } from "@apollo/client";

// Fragment dla podstawowych danych użytkownika
export const USER_BASIC_FRAGMENT = gql`
  fragment UserBasicFragment on User {
    clerkId
    creationTime
    email
    fullname
    id
    image
    isActive
    organizationIds
    username
    systemRole
    defaultOrganizationId
    personalData {
      firstName
      lastName
    }
    contactData {
      phone
      address
    }
  }
`;

// Fragment dla pełnych danych użytkownika (wszystkie dostępne pola)
export const USER_FULL_FRAGMENT = gql`
  fragment UserFullFragment on User {
    clerkId
    creationTime
    email
    fullname
    id
    image
    isActive
    organizationIds
    username
    systemRole
    defaultOrganizationId
    isShadowUser
    hasPassword
    personalData {
      firstName
      lastName
    }
    contactData {
      phone
      address
    }
  }
`;

// Query do pobierania listy użytkowników - podstawowe pola
export const GET_USERS_QUERY = gql`
  query GetUsers {
    users {
      id
      email
      isActive
    }
  }
`;

// Query rozszerzone dla użytkowników
export const GET_USERS_FULL_QUERY = gql`
  query GetUsersFull {
    users {
      id
      email
      fullname
      username
      isActive
      clerkId
      organizationIds
      creationTime
      image
      systemRole
      defaultOrganizationId
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
`;

// Query do pobierania pojedynczego użytkownika
export const GET_USER_BY_ID_QUERY = gql`
  query GetUserById($id: String!) {
    userById(id: $id) {
      ...UserFullFragment
    }
  }
  ${USER_FULL_FRAGMENT}
`;

// Query do pobierania użytkownika po ClerkId (dedykowany endpoint)
// Zwraca pojedynczego użytkownika, nie array
export const GET_USER_BY_CLERK_ID_QUERY = gql`
  query GetUserByClerkId($clerkId: String!) {
    userByClerkId(clerkId: $clerkId) {
      ...UserFullFragment
    }
  }
  ${USER_FULL_FRAGMENT}
`;

// Query do pobierania terapeutów w organizacji
// Uwaga: organizationIds to computed field, więc filtrujemy po isActive
// i później filtrujemy po stronie pacjenta
export const GET_ORGANIZATION_THERAPISTS_QUERY = gql`
  query GetOrganizationTherapists($organizationId: String!) {
    users(where: { isActive: { eq: true } }) {
      clerkId
      creationTime
      email
      fullname
      id
      image
      isActive
      organizationIds
      username
      systemRole
      defaultOrganizationId
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
`;

// Query do pobierania organizacji użytkownika wraz z rolami
// Backend zwraca UserOrganizationWithRole (nie OrganizationMember!)
export const GET_USER_ORGANIZATIONS_QUERY = gql`
  query GetUserOrganizations {
    userOrganizations {
      organizationId
      organizationName
      logoUrl
      role
      joinedAt
    }
  }
`;

// Query do pobierania listy site adminów
// Wymaga uprawnień SITE_SUPER_ADMIN
export const GET_SITE_ADMINS_QUERY = gql`
  query GetSiteAdmins {
    siteAdmins {
      ...UserFullFragment
    }
  }
  ${USER_FULL_FRAGMENT}
`;
