import { gql } from "@apollo/client";

// ========================================
// Revenue Share Mutations - Stripe Connect & Patient Invites
// ========================================

/**
 * Mutation do inicjalizacji onboardingu Stripe Connect
 * Zwraca URL do przekierowania użytkownika na Stripe
 */
export const INITIATE_STRIPE_CONNECT_ONBOARDING_MUTATION = gql`
  mutation InitiateStripeConnectOnboarding($organizationId: String!) {
    initiateStripeConnectOnboarding(organizationId: $organizationId) {
      success
      onboardingUrl
      accountId
      message
    }
  }
`;

/**
 * Mutation do odświeżenia linku onboardingowego Stripe Connect
 */
export const REFRESH_STRIPE_CONNECT_LINK_MUTATION = gql`
  mutation RefreshStripeConnectOnboardingLink($organizationId: String!) {
    refreshStripeConnectOnboardingLink(organizationId: $organizationId) {
      success
      onboardingUrl
      accountId
      message
    }
  }
`;

/**
 * Mutation do tworzenia linku zaproszeniowego dla pacjenta (Web-First flow)
 */
export const CREATE_PATIENT_INVITE_LINK_MUTATION = gql`
  mutation CreatePatientInviteLink(
    $organizationId: String!
    $patientEmail: String
    $patientPhone: String
    $patientName: String
    $linkType: String
    $expirationDays: Int
  ) {
    createPatientInviteLink(
      organizationId: $organizationId
      patientEmail: $patientEmail
      patientPhone: $patientPhone
      patientName: $patientName
      linkType: $linkType
      expirationDays: $expirationDays
    ) {
      success
      fullUrl
      token
      inviteLink {
        id
        token
        organizationId
        invitedById
        patientEmail
        patientPhone
        patientName
        status
        createdAt
        expiresAt
        linkType
      }
    }
  }
`;

/**
 * Mutation do anulowania linku zaproszeniowego
 */
export const CANCEL_PATIENT_INVITE_LINK_MUTATION = gql`
  mutation CancelPatientInviteLink($inviteLinkId: String!) {
    cancelPatientInviteLink(inviteLinkId: $inviteLinkId)
  }
`;

/**
 * Mutation do aktywacji kodu partnerskiego
 */
export const REDEEM_PARTNERSHIP_CODE_MUTATION = gql`
  mutation RedeemPartnershipCode($organizationId: String!, $code: String!) {
    redeemPartnershipCode(organizationId: $organizationId, code: $code) {
      success
      message
      commissionRate
    }
  }
`;

/**
 * Mutation do anulowania subskrypcji pacjenta
 */
export const CANCEL_PATIENT_SUBSCRIPTION_MUTATION = gql`
  mutation CancelPatientSubscription(
    $subscriptionId: String!
    $immediately: Boolean
    $reason: String
  ) {
    cancelPatientSubscription(
      subscriptionId: $subscriptionId
      immediately: $immediately
      reason: $reason
    ) {
      success
      message
    }
  }
`;

/**
 * Mutation do ustawienia prowizji organizacji (Site Admin)
 */
export const SET_ORGANIZATION_COMMISSION_RATE_MUTATION = gql`
  mutation SetOrganizationCommissionRate(
    $organizationId: String!
    $commissionRate: Decimal
  ) {
    setOrganizationCommissionRate(
      organizationId: $organizationId
      commissionRate: $commissionRate
    ) {
      success
      organizationId
      commissionRate
      message
    }
  }
`;

/**
 * Mutation do tworzenia kodu partnerskiego (Site Admin)
 */
export const CREATE_PARTNERSHIP_CODE_MUTATION = gql`
  mutation CreatePartnershipCode(
    $code: String!
    $commissionRate: Decimal!
    $description: String
    $maxUses: Int
    $expiresAt: DateTime
  ) {
    createPartnershipCode(
      code: $code
      commissionRate: $commissionRate
      description: $description
      maxUses: $maxUses
      expiresAt: $expiresAt
    ) {
      id
      code
      commissionRate
      isActive
      maxUses
      usedCount
      description
      createdAt
      expiresAt
    }
  }
`;

/**
 * Mutation do dezaktywacji kodu partnerskiego (Site Admin)
 */
export const DEACTIVATE_PARTNERSHIP_CODE_MUTATION = gql`
  mutation DeactivatePartnershipCode($codeId: String!) {
    deactivatePartnershipCode(codeId: $codeId)
  }
`;
