import { describe, expect, it } from 'vitest';
import { summarizeCompletionQuality } from './completionQualitySummary';

describe('summarizeCompletionQuality', () => {
  it('counts a tracked session below 80% of the plan as shortened, not missing', () => {
    const summary = summarizeCompletionQuality([
      { completionQuality: 'full' },
      { completionQuality: 'partial_evidence' },
      { completionQuality: 'manual_only' },
    ]);

    expect(summary).toEqual({ total: 3, full: 1, partial: 1, manualOnly: 1 });
  });

  it('returns null when there are no events', () => {
    expect(summarizeCompletionQuality([])).toBeNull();
  });
});
