import { gql } from "@apollo/client";

/**
 * Status kredytów AI dla organizacji
 */
export const GET_AI_CREDITS_STATUS = gql`
  query GetAICreditsStatus($organizationId: String!) {
    aICreditsStatus(organizationId: $organizationId) {
      monthlyLimit
      monthlyUsed
      monthlyRemaining
      addonCredits
      totalRemaining
      resetDate
    }
  }
`;

/**
 * Historia zużycia kredytów AI
 */
export const GET_AI_CREDITS_HISTORY = gql`
  query GetAICreditsHistory($organizationId: String!, $days: Int) {
    aICreditsHistory(organizationId: $organizationId, days: $days) {
      id
      creditsUsed
      actionType
      description
      source
      createdAt
    }
  }
`;

/**
 * Ceny pakietów kredytów AI
 */
export const GET_AI_CREDITS_PACKAGE_PRICING = gql`
  query GetAICreditsPackagePricing {
    aICreditsPackagePricing {
      smallPackage {
        credits
        pricePLN
      }
      mediumPackage {
        credits
        pricePLN
      }
      largePackage {
        credits
        pricePLN
      }
    }
  }
`;

/**
 * Status addonów na zasoby dla organizacji
 */
export const GET_RESOURCE_ADDONS_STATUS = gql`
  query GetResourceAddonsStatus($organizationId: String!) {
    resourceAddonsStatus(organizationId: $organizationId) {
      additionalPatients
      additionalTherapists
      additionalClinics
      effectiveMaxPatients
      effectiveMaxTherapists
      effectiveMaxClinics
      monthlyAddonsCost
    }
  }
`;

/**
 * Ceny addonów na zasoby
 */
export const GET_ADDON_PRICING = gql`
  query GetAddonPricing {
    addonPricing {
      patients10
      therapist1
      clinic1
    }
  }
`;
