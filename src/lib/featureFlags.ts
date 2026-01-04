// Feature Flags Configuration
// Set to true to enable experimental features

export const FEATURE_FLAGS = {
  /**
   * Professional Body Pain Map (NEW)
   * - 4 views (front, back, left, right)
   * - Clinical pain types (sharp, dull, radiating, etc.)
   * - Touch support for tablets
   * - Exercise suggestions based on pain regions
   * - Export to PNG/PDF
   * - Session history with comparison
   *
   * Set to true to enable, false to hide completely
   */
  BODY_PAIN_MAP: false,

  /**
   * AI-powered exercise set generator
   */
  AI_SET_GENERATOR: true,

  /**
   * Clinical notes integration
   */
  CLINICAL_NOTES: true,
} as const;

// Type-safe feature flag getter
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

// Legacy function for backwards compatibility
export function isFeedbackEnabled(): boolean {
  return true; // Feedback is always enabled
}
