import { gql } from '@apollo/client';

// ========================================
// Billing Queries - Pay-as-you-go Model
// ========================================

/**
 * Query do pobierania bieżącego statusu rozliczeń organizacji
 * Zwraca liczbę aktywnych pacjentów Premium i estymowaną należność
 */
export const GET_CURRENT_BILLING_STATUS_QUERY = gql`
  query GetCurrentBillingStatus($organizationId: String!) {
    currentBillingStatus(organizationId: $organizationId) {
      organizationId
      month
      year
      activePatientsInMonth
      currentlyActivePremium
      pricePerPatient
      estimatedTotal
      currency
      partnerCode
      isPilotMode
      therapistBreakdown {
        therapistId
        therapistName
        therapistEmail
        therapistImage
        activePatientsCount
        estimatedAmount
      }
    }
  }
`;

/**
 * Query do pobierania danych rozliczeniowych organizacji
 * (NIP, adres, IBAN, email do faktur)
 */
export const GET_BILLING_DETAILS_QUERY = gql`
  query GetBillingDetails($organizationId: String!) {
    billingDetails(organizationId: $organizationId) {
      companyName
      nip
      address
      postalCode
      city
      iban
      billingEmail
      isComplete
    }
  }
`;

/** AI credits left this month (chat sidebar footer). */
export const GET_AI_CREDITS_STATUS_QUERY = gql`
  query GetAICreditsStatus($organizationId: String!) {
    aiCreditsStatus(organizationId: $organizationId) {
      monthlyLimit
      monthlyUsed
      monthlyRemaining
      addonCredits
      totalRemaining
      resetDate
    }
  }
`;

/** Prośby gabinetu o więcej kredytów AI (tylko Owner i Admin; inne role: `skip`). */
export const GET_AI_CREDIT_REQUESTS_QUERY = gql`
  query GetAICreditRequests($organizationId: String!) {
    aiCreditRequests(organizationId: $organizationId) {
      id
      requestedCredits
      message
      status
      createdAt
      resolvedAt
      grantedCredits
      resolutionNote
    }
  }
`;

/** Historia kredytów AI do podziału zużycia (tylko Owner i Admin; inne role: `skip`). Bez `description`: to wolny tekst. */
export const GET_AI_CREDITS_HISTORY_QUERY = gql`
  query GetAICreditsHistory($organizationId: String!, $days: Int) {
    aiCreditsHistory(organizationId: $organizationId, days: $days) {
      id
      kind
      creditsUsed
      actionType
      createdAt
    }
  }
`;
