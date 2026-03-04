import { gql } from '@apollo/client';

/**
 * Mutation do aktualizacji danych rozliczeniowych organizacji
 */
export const UPDATE_BILLING_DETAILS_MUTATION = gql`
  mutation UpdateBillingDetails($organizationId: String!, $input: BillingDetailsInput!) {
    updateBillingDetails(organizationId: $organizationId, input: $input) {
      success
      message
      billingDetails {
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
  }
`;
