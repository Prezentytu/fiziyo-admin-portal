import { describe, expect, it } from 'vitest';
import { resolveExerciseReviewFeedback } from '../resolveExerciseReviewFeedback';

describe('resolveExerciseReviewFeedback', () => {
  it('returns org reviewer notes after the exercise is returned from organization verification', () => {
    expect(
      resolveExerciseReviewFeedback({
        status: 'DRAFT',
        organizationVerificationStatus: 'ORG_CHANGES_REQUESTED',
        orgReviewNotes: 'Popraw opis fazy 2',
        orgReviewedAt: '2026-10-26T10:00:00Z',
      })
    ).toEqual({ notes: 'Popraw opis fazy 2', updatedAt: '2026-10-26T10:00:00Z' });
  });

  it('returns global reviewer notes when changes were requested globally', () => {
    expect(
      resolveExerciseReviewFeedback({
        status: 'CHANGES_REQUESTED',
        adminReviewNotes: 'Brak zdjęcia',
        updatedAt: '2026-10-25T10:00:00Z',
      })
    ).toEqual({ notes: 'Brak zdjęcia', updatedAt: '2026-10-25T10:00:00Z' });
  });

  it('returns null when nothing was returned for changes', () => {
    expect(
      resolveExerciseReviewFeedback({
        status: 'ACTIVE',
        organizationVerificationStatus: 'APPROVED',
        orgReviewNotes: 'stara notatka',
      })
    ).toBeNull();
  });
});
