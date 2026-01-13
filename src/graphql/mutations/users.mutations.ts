import { gql } from "@apollo/client";

/**
 * Mutacja do tworzenia nowego użytkownika
 * Automatycznie konwertuje shadow user jeśli istnieje
 */
export const CREATE_USER_MUTATION = gql`
  mutation CreateUser(
    $clerkId: String!
    $email: String!
    $username: String
    $fullname: String
    $firstName: String
    $lastName: String
    $phone: String
    $image: String
    $role: String
    $isCompanyAccount: Boolean
    $companyName: String
  ) {
    createUser(
      clerkId: $clerkId
      email: $email
      username: $username
      fullname: $fullname
      firstName: $firstName
      lastName: $lastName
      phone: $phone
      image: $image
      role: $role
      isCompanyAccount: $isCompanyAccount
      companyName: $companyName
    ) {
      id
      clerkId
      username
      fullname
      email
      image
      organizationIds
      isShadowUser
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
 * Mutacja do tworzenia shadow user (użytkownika tymczasowego)
 * Używana gdy dodajemy pacjenta do systemu przed jego rejestracją
 */
export const CREATE_SHADOW_USER_MUTATION = gql`
  mutation CreateShadowUser($fullname: String!, $email: String, $phone: String) {
    createShadowUser(fullname: $fullname, email: $email, phone: $phone) {
      id
      clerkId
      username
      fullname
      email
      isShadowUser
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
 * Mutacja do konwersji shadow user na normalnego użytkownika
 * Automatycznie wywoływana podczas rejestracji
 */
export const CONVERT_SHADOW_USER_MUTATION = gql`
  mutation ConvertShadowUser(
    $clerkId: String!
    $email: String!
    $phone: String
    $firstName: String
    $lastName: String
  ) {
    convertShadowUser(clerkId: $clerkId, email: $email, phone: $phone, firstName: $firstName, lastName: $lastName) {
      id
      clerkId
      username
      fullname
      email
      isShadowUser
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
 * Mutacja do promowania użytkownika do SITE_ADMIN
 * Wymaga uprawnień SITE_SUPER_ADMIN
 */
export const PROMOTE_TO_SITE_ADMIN_MUTATION = gql`
  mutation PromoteToSiteAdmin($targetUserId: String!) {
    promoteToSiteAdmin(targetUserId: $targetUserId) {
      id
      clerkId
      username
      fullname
      email
      systemRole
      organizationIds
      defaultOrganizationId
    }
  }
`;

/**
 * Mutacja do degradacji użytkownika z SITE_ADMIN
 * Wymaga uprawnień SITE_SUPER_ADMIN
 */
export const DEMOTE_FROM_SITE_ADMIN_MUTATION = gql`
  mutation DemoteFromSiteAdmin($targetUserId: String!) {
    demoteFromSiteAdmin(targetUserId: $targetUserId) {
      id
      clerkId
      username
      fullname
      email
      systemRole
      organizationIds
      defaultOrganizationId
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
 * Mutacja do aktywacji shadow patient przez token
 * Konwertuje shadow patient na pełnego użytkownika po kliknięciu w link aktywacyjny
 */
export const ACTIVATE_SHADOW_PATIENT_MUTATION = gql`
  mutation ActivateShadowPatient($activationToken: String!, $email: String, $clerkId: String!) {
    activateShadowPatient(activationToken: $activationToken, email: $email, clerkId: $clerkId) {
      id
      clerkId
      username
      fullname
      email
      isShadowUser
      hasPassword
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
    updateShadowPatient(
      userId: $userId
      email: $email
      firstName: $firstName
      lastName: $lastName
      phone: $phone
    ) {
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
 * Mutacja do aktywacji dostępu Premium dla pacjenta
 * Aktywuje dostęp do aplikacji mobilnej na określoną liczbę dni (domyślnie 30)
 * Model Pay-as-you-go: Gabinet płaci za każdego aktywnego pacjenta w cyklu rozliczeniowym
 */
export const ACTIVATE_PATIENT_PREMIUM_MUTATION = gql`
  mutation ActivatePatientPremium(
    $patientId: String!
    $organizationId: String!
    $durationDays: Int = 30
  ) {
    activatePatientPremium(
      patientId: $patientId
      organizationId: $organizationId
      durationDays: $durationDays
    ) {
      id
      premiumActiveUntil
    }
  }
`;
