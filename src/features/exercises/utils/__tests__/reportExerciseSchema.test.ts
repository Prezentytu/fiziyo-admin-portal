import { describe, expect, it } from 'vitest';

import { reportExerciseSchema } from '../reportExerciseSchema';

describe('reportExerciseSchema', () => {
  it('accepts a short comment without attachments', () => {
    expect(reportExerciseSchema.safeParse({ reasonCategory: 'WRONG_MEDIA', description: 'zły obraz' }).success).toBe(
      true
    );
  });

  it('rejects an empty or whitespace-only comment', () => {
    expect(reportExerciseSchema.safeParse({ reasonCategory: 'OTHER', description: '   ' }).success).toBe(false);
  });

  it('rejects a comment over 2000 characters', () => {
    expect(reportExerciseSchema.safeParse({ reasonCategory: 'OTHER', description: 'a'.repeat(2001) }).success).toBe(
      false
    );
  });
});
