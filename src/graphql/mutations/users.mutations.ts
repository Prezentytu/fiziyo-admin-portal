import { gql } from '@apollo/client';

/**
 * Mutacja do aktualizacji użytkownika
 */
export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser(
    $clerkId: String!
    $fullname: String
    $firstName: String
    $lastName: String
    $username: String
    $image: String
    $role: String
  ) {
    updateUser(
      clerkId: $clerkId
      fullname: $fullname
      firstName: $firstName
      lastName: $lastName
      username: $username
      image: $image
      role: $role
    ) {
      id
      clerkId
      username
      fullname
      email
      image
      organizationIds
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

/**
 * Mutacja do aktualizacji profilu użytkownika
 */
export const UPDATE_USER_PROFILE_MUTATION = gql`
  mutation UpdateUserProfile(
    $userId: String!
    $firstName: String
    $lastName: String
    $phone: String
    $address: String
  ) {
    updateUserProfile(userId: $userId, firstName: $firstName, lastName: $lastName, phone: $phone, address: $address) {
      id
      clerkId
      username
      fullname
      email
      image
      organizationIds
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

/**
 * Mutacja do ustawiania domyślnej organizacji użytkownika
 * Automatycznie przełącza kontekst na wybraną organizację
 */
export const SET_DEFAULT_ORGANIZATION_MUTATION = gql`
  mutation SetDefaultOrganization($organizationId: String!) {
    setDefaultOrganization(organizationId: $organizationId) {
      id
      clerkId
      username
      fullname
      email
      systemRole
      defaultOrganizationId
      organizationIds
    }
  }
`;

/**
 * Mutacja do tworzenia shadow patient (rozszerzona wersja shadow user)
 * Używana podczas dodawania pacjenta przed jego rejestracją w systemie
 * Tworzy usera + dodaje do organizacji + przypisuje do terapeuty w jednym kroku
 *
 * UWAGA: Backend wymaga phone jako wymagane, ale email jest opcjonalny.
 * Fizjoterapeuta musi podać przynajmniej jedno z nich.
 */
export const CREATE_SHADOW_PATIENT_MUTATION = gql`
  mutation CreateShadowPatient(
    $firstName: String!
    $lastName: String!
    $phone: String
    $email: String
    $organizationId: String!
    $clinicId: String
    $contextLabel: String
    $contextType: AssignmentContextType = PRIMARY
    $sendActivationSms: Boolean = false
  ) {
    createShadowPatient(
      firstName: $firstName
      lastName: $lastName
      phone: $phone
      email: $email
      organizationId: $organizationId
      clinicId: $clinicId
      contextLabel: $contextLabel
      contextType: $contextType
      sendActivationSms: $sendActivationSms
    ) {
      id
      clerkId
      username
      fullname
      email
      isShadowUser
      hasPassword
      activationToken
      activationTokenExpiry
      systemRole
      defaultOrganizationId
      organizationIds
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

/**
 * Mutacja do aktualizacji danych tymczasowego pacjenta (shadow user)
 * UWAGA: Edycja emaila dozwolona TYLKO dla shadow userów!
 * Dla użytkowników z prawdziwym kontem backend zwróci błąd.
 */
export const UPDATE_SHADOW_PATIENT_MUTATION = gql`
  mutation UpdateShadowPatient(
    $userId: String!
    $email: String
    $firstName: String
    $lastName: String
    $phone: String
  ) {
    updateShadowPatient(userId: $userId, email: $email, firstName: $firstName, lastName: $lastName, phone: $phone) {
      id
      fullname
      email
      isShadowUser
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

/**
 * Mutacja do pełnego zarządzania dostępem Premium pacjenta.
 * Umożliwia przedłużenie, ustawienie konkretnej daty końca lub natychmiastowe cofnięcie.
 */
export const UPDATE_PATIENT_PREMIUM_ACCESS_MUTATION = gql`
  mutation UpdatePatientPremiumAccess(
    $patientId: String!
    $organizationId: String!
    $action: PremiumAccessManagementAction!
    $durationDays: Int
    $targetExpiry: DateTime
    $reason: String
  ) {
    updatePatientPremiumAccess(
      patientId: $patientId
      organizationId: $organizationId
      action: $action
      durationDays: $durationDays
      targetExpiry: $targetExpiry
      reason: $reason
    ) {
      success
      patientId
      action
      previousPremiumValidUntil
      premiumValidUntil
      message
    }
  }
`;
