'use client';

import { useMemo } from 'react';

/**
 * Priority levels for form fields
 * - critical: Required for basic functionality (blocks all saves)
 * - recommended: Improves quality (shown as amber suggestions)
 * - optional: Nice to have (almost invisible indicators)
 */
export type FieldPriority = 'critical' | 'recommended' | 'optional';

/**
 * Configuration for a single form field
 */
export interface FieldConfig {
  /** Unique identifier for the field */
  key: string;
  /** Display label for the field (used in missing lists) */
  label: string;
  /** Weight in percentage (all weights should sum to 100) */
  weight: number;
  /** Priority level determines visual treatment */
  priority: FieldPriority;
  /** Whether the field is currently filled */
  isFilled: boolean;
}

/**
 * Result of the completion calculation
 */
export interface CompletionResult {
  /** Overall completion percentage (0-100) */
  percentage: number;
  /** Can save as draft (>= 40%, meaning name is filled) */
  canSaveDraft: boolean;
  /** Can publish (100% completion) */
  canPublish: boolean;
  /** List of missing critical fields (blocks everything) */
  criticalMissing: string[];
  /** List of missing recommended fields (amber indicators) */
  recommendedMissing: string[];
  /** List of missing optional fields (subtle indicators) */
  optionalMissing: string[];
  /** Total count of missing fields by priority */
  missingCounts: {
    critical: number;
    recommended: number;
    optional: number;
  };
  /** Color indicator based on completion */
  colorStatus: 'critical' | 'draft' | 'ready';
}

/**
 * Thresholds for completion status
 */
const DRAFT_THRESHOLD = 40; // Name filled = can save draft
const PUBLISH_THRESHOLD = 100; // Everything filled = can publish

/**
 * Hook for calculating form completion with Draft/Publish logic
 *
 * @param fields - Array of field configurations
 * @returns CompletionResult with all completion data
 *
 * @example
 * ```tsx
 * const completion = useFormCompletion([
 *   { key: 'name', label: 'Nazwa', weight: 40, priority: 'critical', isFilled: !!data.name },
 *   { key: 'description', label: 'Opis', weight: 15, priority: 'recommended', isFilled: !!data.description },
 *   { key: 'media', label: 'Media', weight: 20, priority: 'recommended', isFilled: mediaFiles.length > 0 },
 *   { key: 'tags', label: 'Tagi', weight: 15, priority: 'recommended', isFilled: data.mainTags.length > 0 },
 *   { key: 'params', label: 'Parametry', weight: 10, priority: 'optional', isFilled: true }, // always filled with defaults
 * ]);
 *
 * // Use in UI:
 * // completion.percentage -> 55
 * // completion.canSaveDraft -> true
 * // completion.canPublish -> false
 * // completion.recommendedMissing -> ['Media', 'Tagi']
 * ```
 */
export function useFormCompletion(fields: FieldConfig[]): CompletionResult {
  return useMemo(() => {
    // Calculate percentage based on filled fields and their weights
    const filledWeight = fields
      .filter(f => f.isFilled)
      .reduce((sum, f) => sum + f.weight, 0);

    const percentage = Math.min(100, Math.max(0, Math.round(filledWeight)));

    // Group missing fields by priority
    const missingFields = fields.filter(f => !f.isFilled);

    const criticalMissing = missingFields
      .filter(f => f.priority === 'critical')
      .map(f => f.label);

    const recommendedMissing = missingFields
      .filter(f => f.priority === 'recommended')
      .map(f => f.label);

    const optionalMissing = missingFields
      .filter(f => f.priority === 'optional')
      .map(f => f.label);

    // Draft requires critical fields (name = 40%)
    const canSaveDraft = percentage >= DRAFT_THRESHOLD && criticalMissing.length === 0;

    // Publish requires 100%
    const canPublish = percentage >= PUBLISH_THRESHOLD;

    // Determine color status
    let colorStatus: 'critical' | 'draft' | 'ready';
    if (percentage < DRAFT_THRESHOLD) {
      colorStatus = 'critical';
    } else if (percentage < 80) {
      colorStatus = 'draft';
    } else {
      colorStatus = 'ready';
    }

    return {
      percentage,
      canSaveDraft,
      canPublish,
      criticalMissing,
      recommendedMissing,
      optionalMissing,
      missingCounts: {
        critical: criticalMissing.length,
        recommended: recommendedMissing.length,
        optional: optionalMissing.length,
      },
      colorStatus,
    };
  }, [fields]);
}

/**
 * Default field configuration for CreateExerciseWizard
 * Use this as a template and override isFilled based on form state
 */
export const EXERCISE_FORM_FIELDS: Omit<FieldConfig, 'isFilled'>[] = [
  { key: 'name', label: 'Nazwa', weight: 40, priority: 'critical' },
  { key: 'description', label: 'Opis', weight: 15, priority: 'recommended' },
  { key: 'media', label: 'Media', weight: 20, priority: 'recommended' },
  { key: 'tags', label: 'Tagi', weight: 15, priority: 'recommended' },
  { key: 'params', label: 'Parametry', weight: 10, priority: 'optional' },
];
