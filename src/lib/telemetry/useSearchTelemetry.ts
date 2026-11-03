'use client';

import { useEffect } from 'react';
import { trackEvent } from './client';
import type { TelemetryEventName } from './events';

const SETTLE_MS = 1500;

interface SearchTelemetryInput {
  event: Extract<TelemetryEventName, 'patient:search' | 'exercise_catalog:search'>;
  query: string;
  resultsCount: number | null;
  /** Only catalog phrases may be sent; patient searches can contain names, so only length goes out. */
  includeQuery: boolean;
}

/** Sends one event per settled search, so empty results show what therapists cannot find. */
export function useSearchTelemetry({ event, query, resultsCount, includeQuery }: SearchTelemetryInput) {
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || resultsCount === null) {
      return;
    }
    const timer = window.setTimeout(() => {
      trackEvent(event, {
        query: includeQuery ? trimmed.toLowerCase() : undefined,
        query_length: trimmed.length,
        results_count: resultsCount,
        is_empty: resultsCount === 0,
      });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [event, query, resultsCount, includeQuery]);
}
