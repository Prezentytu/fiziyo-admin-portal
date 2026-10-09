import { gql } from '@apollo/client';

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
