import { gql } from "@apollo/client";

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
