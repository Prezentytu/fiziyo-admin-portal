// Feature Flags Configuration
// Set to true to enable experimental features

export const FEATURE_FLAGS = {
  /**
   * AI-powered exercise set generator
   */
  AI_SET_GENERATOR: true,

  /**
   * Clinical notes integration
   */
  CLINICAL_NOTES: true,

  /**
   * Billing details GraphQL API (billingDetails / updateBillingDetails)
   * Enable only after backend migration and schema deployment.
   */
  BILLING_DETAILS_API: process.env.NEXT_PUBLIC_BILLING_DETAILS_ENABLED !== 'false',

  /**
   * Stripe Connect rollout in Finances module.
   * TODO: Set to true when payout onboarding flow is enabled for customers.
   */
  STRIPE_CONNECT_ROLLOUT: process.env.NEXT_PUBLIC_STRIPE_CONNECT_ENABLED === 'true',
} as const;

// Type-safe feature flag getter
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

// Legacy function for backwards compatibility
export function isFeedbackEnabled(): boolean {
  return true; // Feedback is always enabled
}
