import { gql } from '@apollo/client';

/**
 * Mutacja do aktualizacji nazwy organizacji
 */
export const UPDATE_ORGANIZATION_NAME_MUTATION = gql`
  mutation UpdateOrganizationName($organizationId: String!, $name: String!) {
    updateOrganizationName(organizationId: $organizationId, name: $name) {
      id
      name
      isActive
      logoUrl
      allowPersonalExercises
      sharedExercisesByDefault
    }
  }
`;

/**
 * Mutacja do dodawania użytkownika do organizacji bezpośrednio po userId
 */
export const ADD_DIRECT_MEMBER_MUTATION = gql`
  mutation AddDirectMember($organizationId: String!, $userId: String!, $role: String!) {
    addDirectMember(organizationId: $organizationId, userId: $userId, role: $role) {
      id
      organizationId
      userId
      role
      invitedBy
      joinedAt
      status
    }
  }
`;

/**
 * Mutacja do usuwania użytkownika z organizacji
 */
export const REMOVE_MEMBER_MUTATION = gql`
  mutation RemoveMember($memberId: String!) {
    removeMember(memberId: $memberId)
  }
`;

/**
 * Mutacja do aktualizacji roli użytkownika organizacji
 */
export const UPDATE_MEMBER_ROLE_MUTATION = gql`
  mutation UpdateMemberRole($memberId: String!, $role: String!) {
    updateMemberRole(memberId: $memberId, role: $role) {
      id
      organizationId
      userId
      role
      invitedBy
      joinedAt
      status
    }
  }
`;

/**
 * Mutacja do aktualizacji logo organizacji
 */
export const UPDATE_ORGANIZATION_LOGO_MUTATION = gql`
  mutation UpdateOrganizationLogo($organizationId: String!, $logoUrl: String!) {
    updateOrganizationLogo(organizationId: $organizationId, logoUrl: $logoUrl) {
      id
      name
      isActive
      logoUrl
    }
  }
`;

/**
 * Mutacja do usuwania logo organizacji
 */
export const REMOVE_ORGANIZATION_LOGO_MUTATION = gql`
  mutation RemoveOrganizationLogo($organizationId: String!) {
    removeOrganizationLogo(organizationId: $organizationId) {
      id
      name
      isActive
      logoUrl
    }
  }
`;

/**
 * Mutacja do tworzenia nowej organizacji
 */
export const CREATE_ORGANIZATION_MUTATION = gql`
  mutation CreateOrganization($name: String!, $description: String) {
    createOrganization(name: $name, description: $description) {
      id
      name
      description
      isActive
      logoUrl
      allowPersonalExercises
      sharedExercisesByDefault
      creationTime
    }
  }
`;

/**
 * Mutacja do aktualizacji ustawień widoczności ćwiczeń w organizacji
 * Kontroluje czy członkowie mogą tworzyć osobiste ćwiczenia
 */
export const UPDATE_EXERCISE_VISIBILITY_SETTINGS_MUTATION = gql`
  mutation UpdateExerciseVisibilitySettings(
    $organizationId: String!
    $allowPersonalExercises: Boolean!
    $sharedExercisesByDefault: Boolean!
    $requireOrganizationVerification: Boolean!
  ) {
    updateExerciseVisibilitySettings(
      organizationId: $organizationId
      allowPersonalExercises: $allowPersonalExercises
      sharedExercisesByDefault: $sharedExercisesByDefault
      requireOrganizationVerification: $requireOrganizationVerification
    ) {
      id
      name
      allowPersonalExercises
      sharedExercisesByDefault
      requireOrganizationVerification
    }
  }
`;

/**
 * Mutacja do wysyłania zaproszenia do organizacji
 */
export const SEND_INVITATION_MUTATION = gql`
  mutation SendInvitation($organizationId: String!, $email: String!, $role: OrganizationRole!, $message: String) {
    sendInvitation(organizationId: $organizationId, email: $email, role: $role, message: $message) {
      id
      organizationId
      email
      role
      invitationToken
      createdAt
      expiresAt
      invitedById
      status
      message
    }
  }
`;

/**
 * Mutacja do akceptacji zaproszenia do organizacji
 */
export const ACCEPT_INVITATION_MUTATION = gql`
  mutation AcceptInvitation($invitationToken: String!) {
    acceptInvitation(invitationToken: $invitationToken) {
      id
      organizationId
      userId
      role
      joinedAt
      status
      organization {
        id
        name
        logoUrl
      }
    }
  }
`;

/**
 * Mutacja do odwołania zaproszenia do organizacji
 */
export const REVOKE_INVITATION_MUTATION = gql`
  mutation RevokeInvitation($invitationId: String!) {
    revokeInvitation(invitationId: $invitationId)
  }
`;

/**
 * Mutacja do generowania linku zaproszenia (bez wysyłki email)
 * Link można ręcznie skopiować i udostępnić
 */
export const GENERATE_INVITE_LINK_MUTATION = gql`
  mutation GenerateInviteLink($organizationId: String!, $role: OrganizationRole!, $expirationDays: Int = 7) {
    generateInviteLink(organizationId: $organizationId, role: $role, expirationDays: $expirationDays) {
      id
      organizationId
      email
      role
      invitationToken
      createdAt
      expiresAt
      status
    }
  }
`;

/**
 * Mutacja do ponownego wysłania zaproszenia
 * Generuje nowy token i aktualizuje datę wygaśnięcia
 */
export const RESEND_INVITATION_MUTATION = gql`
  mutation ResendInvitation($invitationId: String!) {
    resendInvitation(invitationId: $invitationId) {
      id
      organizationId
      email
      role
      invitationToken
      createdAt
      expiresAt
      status
    }
  }
`;
