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
