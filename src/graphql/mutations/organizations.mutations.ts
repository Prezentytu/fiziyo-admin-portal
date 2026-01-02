import { gql } from "@apollo/client";

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
      subscriptionPlan
      allowPersonalExercises
      sharedExercisesByDefault
    }
  }
`;

/**
 * Mutacja do dodawania użytkownika do organizacji po emailu
 */
export const ADD_MEMBER_MUTATION = gql`
  mutation AddMember(
    $organizationId: String!
    $userEmail: String!
    $role: String!
  ) {
    addMember(
      organizationId: $organizationId
      userEmail: $userEmail
      role: $role
    ) {
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
 * Mutacja do dodawania użytkownika do organizacji bezpośrednio po userId
 */
export const ADD_DIRECT_MEMBER_MUTATION = gql`
  mutation AddDirectMember(
    $organizationId: String!
    $userId: String!
    $role: String!
  ) {
    addDirectMember(
      organizationId: $organizationId
      userId: $userId
      role: $role
    ) {
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
 * Mutacja do tworzenia gabinetu w organizacji
 */
export const CREATE_CLINIC_IN_ORGANIZATION_MUTATION = gql`
  mutation CreateClinicInOrganization(
    $organizationId: String!
    $name: String!
    $address: String!
    $contactInfo: String
  ) {
    createClinic(
      organizationId: $organizationId
      name: $name
      address: $address
      contactInfo: $contactInfo
    ) {
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
export const UPDATE_CLINIC_IN_ORGANIZATION_MUTATION = gql`
  mutation UpdateClinicInOrganization(
    $clinicId: String!
    $name: String
    $address: String
    $contactInfo: String
    $isActive: Boolean
  ) {
    updateClinic(
      clinicId: $clinicId
      name: $name
      address: $address
      contactInfo: $contactInfo
      isActive: $isActive
    ) {
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
 * Mutacja do usuwania gabinetu
 */
export const DELETE_CLINIC_IN_ORGANIZATION_MUTATION = gql`
  mutation DeleteClinicInOrganization($clinicId: String!) {
    deleteClinic(clinicId: $clinicId)
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
      subscriptionPlan
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
      subscriptionPlan
    }
  }
`;

/**
 * Mutacja do tworzenia nowej organizacji
 */
export const CREATE_ORGANIZATION_MUTATION = gql`
  mutation CreateOrganization(
    $name: String!
    $description: String
    $plan: SubscriptionPlan! = FREE
  ) {
    createOrganization(name: $name, description: $description, plan: $plan) {
      id
      name
      description
      isActive
      logoUrl
      subscriptionPlan
      subscriptionExpiresAt
      allowPersonalExercises
      sharedExercisesByDefault
      maxTherapists
      maxPatients
      maxClinics
      creationTime
    }
  }
`;

/**
 * Mutacja do dodawania właściciela organizacji
 * Wymaga uprawnień OWNER lub SITE_ADMIN
 */
export const ADD_OWNER_MUTATION = gql`
  mutation AddOwner($organizationId: String!, $userId: String!) {
    addOwner(organizationId: $organizationId, userId: $userId) {
      id
      organizationId
      userId
      role
      joinedAt
      status
      user {
        id
        fullname
        email
      }
    }
  }
`;

/**
 * Mutacja do usuwania właściciela organizacji
 * Wymaga uprawnień OWNER lub SITE_ADMIN
 */
export const REMOVE_OWNER_MUTATION = gql`
  mutation RemoveOwner($organizationId: String!, $userIdToRemove: String!) {
    removeOwner(
      organizationId: $organizationId
      userIdToRemove: $userIdToRemove
    )
  }
`;

/**
 * Mutacja do aktualizacji planu subskrypcji organizacji
 * Wymaga uprawnień OWNER lub SITE_ADMIN
 */
export const UPDATE_SUBSCRIPTION_MUTATION = gql`
  mutation UpdateSubscription(
    $organizationId: String!
    $newPlan: SubscriptionPlan!
    $expiresAt: DateTime
  ) {
    updateSubscription(
      organizationId: $organizationId
      newPlan: $newPlan
      expiresAt: $expiresAt
    ) {
      id
      name
      subscriptionPlan
      subscriptionExpiresAt
      maxTherapists
      maxPatients
      maxClinics
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
  ) {
    updateExerciseVisibilitySettings(
      organizationId: $organizationId
      allowPersonalExercises: $allowPersonalExercises
      sharedExercisesByDefault: $sharedExercisesByDefault
    ) {
      id
      name
      allowPersonalExercises
      sharedExercisesByDefault
    }
  }
`;

/**
 * Mutacja do wysyłania zaproszenia do organizacji
 */
export const SEND_INVITATION_MUTATION = gql`
  mutation SendInvitation(
    $organizationId: String!
    $email: String!
    $role: OrganizationRole!
    $message: String
  ) {
    sendInvitation(
      organizationId: $organizationId
      email: $email
      role: $role
      message: $message
    ) {
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
 * Mutacja do walidacji tokenu zaproszenia
 * Zwraca informacje o zaproszeniu lub null jeśli nieważne/wygasłe
 */
export const VALIDATE_INVITATION_MUTATION = gql`
  mutation ValidateInvitation($invitationToken: String!) {
    validateInvitation(invitationToken: $invitationToken) {
      id
      organizationId
      email
      role
      invitationToken
      createdAt
      expiresAt
      status
      message
      organization {
        id
        name
        logoUrl
      }
    }
  }
`;

/**
 * Mutacja do włączania/wyłączania automatycznej synchronizacji ćwiczeń z GitHub
 * Gdy włączone, nowe ćwiczenia z repozytorium fiziyo-exercises będą automatycznie importowane
 */
export const SET_AUTO_SYNC_EXERCISES_MUTATION = gql`
  mutation SetAutoSyncExampleExercises($organizationId: String!, $enabled: Boolean!) {
    setAutoSyncExampleExercises(organizationId: $organizationId, enabled: $enabled) {
      id
      name
      autoSyncExampleExercises
    }
  }
`;
