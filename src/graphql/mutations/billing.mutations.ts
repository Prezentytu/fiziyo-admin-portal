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

/**
 * Prośba o więcej kredytów AI (tylko Owner i Admin). Odmowy biznesowe wracają jako `success: false`
 * z polskim `message`, więc sukces jest dopiero po `data.requestAICredits.success`.
 */
export const REQUEST_AI_CREDITS_MUTATION = gql`
  mutation RequestAICredits($organizationId: String!, $requestedCredits: Int!, $message: String) {
    requestAICredits(organizationId: $organizationId, requestedCredits: $requestedCredits, message: $message) {
      success
      message
      request {
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
  }
`;
