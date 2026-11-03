'use client';

import { useEffect } from 'react';
import { trackEvent } from './client';
import type { TelemetryEventName } from './events';

const SETTLE_MS = 1500;

interface SearchTelemetryInput {
  event: Extract<TelemetryEventName, 'patient:search' | 'exercise_catalog:search'>;
  query: string;
  resultsCount: number | null;
}

/**
 * Sends one event per settled search, so empty results show where therapists get stuck. The
 * phrase itself never leaves: any free-text field can hold a patient name or a clinical detail.
 */
export function useSearchTelemetry({ event, query, resultsCount }: SearchTelemetryInput) {
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || resultsCount === null) {
      return;
    }
    const timer = window.setTimeout(() => {
      trackEvent(event, {
        query_length: trimmed.length,
        results_count: resultsCount,
        is_empty: resultsCount === 0,
      });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [event, query, resultsCount]);
}
