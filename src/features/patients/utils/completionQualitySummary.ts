interface CompletionQualityEvent {
  completionQuality?: string | null;
}

export interface CompletionQualitySummary {
  total: number;
  full: number;
  partial: number;
  manualOnly: number;
}

/** Buckets match the patient app's getCompletionEvidenceLabel: full, partial_evidence, manual_only. */
export function summarizeCompletionQuality(events: readonly CompletionQualityEvent[]): CompletionQualitySummary | null {
  if (events.length === 0) return null;
  return {
    total: events.length,
    full: events.filter((event) => event.completionQuality === 'full').length,
    partial: events.filter((event) => event.completionQuality === 'partial_evidence').length,
    manualOnly: events.filter((event) => event.completionQuality === 'manual_only').length,
  };
}
