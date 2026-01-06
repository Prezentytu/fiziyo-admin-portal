import { gql } from "@apollo/client";

/**
 * Zakup pakietu kredytów AI
 */
export const PURCHASE_AI_CREDITS_PACKAGE = gql`
  mutation PurchaseAICreditsPackage($organizationId: String!, $packageType: String!) {
    purchaseAICreditsPackage(organizationId: $organizationId, packageType: $packageType) {
      success
      sessionId
      checkoutUrl
      message
    }
  }
`;

/**
 * Zakup addonu na zasoby
 */
export const PURCHASE_RESOURCE_ADDON = gql`
  mutation PurchaseResourceAddon($organizationId: String!, $addonType: String!, $quantity: Int!) {
    purchaseResourceAddon(organizationId: $organizationId, addonType: $addonType, quantity: $quantity) {
      success
      message
      newLimit
      monthlyAddedCost
    }
  }
`;

/**
 * Anulowanie addonu na zasoby
 */
export const CANCEL_RESOURCE_ADDON = gql`
  mutation CancelResourceAddon($organizationId: String!, $addonType: String!) {
    cancelResourceAddon(organizationId: $organizationId, addonType: $addonType) {
      success
      message
      newLimit
      monthlyAddedCost
    }
  }
`;

/**
 * Aktualizacja ilości addonu
 */
export const UPDATE_RESOURCE_ADDON = gql`
  mutation UpdateResourceAddon($organizationId: String!, $addonType: String!, $newQuantity: Int!) {
    updateResourceAddon(organizationId: $organizationId, addonType: $addonType, newQuantity: $newQuantity) {
      success
      message
      newLimit
      monthlyAddedCost
    }
  }
`;
