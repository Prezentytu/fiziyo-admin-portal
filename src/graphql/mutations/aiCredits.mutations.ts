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

// ============================================
// Bypass mutations (Early Access - bez Stripe)
// ============================================

/**
 * Dodanie kredytów AI z kodem Early Access (bypass Stripe)
 */
export const ADD_CREDITS_WITH_CODE = gql`
  mutation AddCreditsWithCode($organizationId: String!, $packageType: String!, $bypassCode: String!) {
    addCreditsWithCode(organizationId: $organizationId, packageType: $packageType, bypassCode: $bypassCode) {
      success
      message
      creditsAdded
    }
  }
`;

/**
 * Dodanie addonu zasobów z kodem Early Access (bypass Stripe)
 */
export const ADD_RESOURCE_ADDON_WITH_CODE = gql`
  mutation AddResourceAddonWithCode($organizationId: String!, $addonType: String!, $quantity: Int!, $bypassCode: String!) {
    addResourceAddonWithCode(organizationId: $organizationId, addonType: $addonType, quantity: $quantity, bypassCode: $bypassCode) {
      success
      message
      newLimit
      monthlyAddedCost
    }
  }
`;

/**
 * Dodanie wielu addonów naraz z kodem promocyjnym
 */
export const ADD_MULTIPLE_ADDONS_WITH_CODE = gql`
  mutation AddMultipleAddonsWithCode(
    $organizationId: String!
    $patients: Int!
    $therapists: Int!
    $clinics: Int!
    $promoCode: String!
  ) {
    addMultipleAddonsWithCode(
      organizationId: $organizationId
      patients: $patients
      therapists: $therapists
      clinics: $clinics
      promoCode: $promoCode
    ) {
      success
      message
      addedPatients
      addedTherapists
      addedClinics
    }
  }
`;