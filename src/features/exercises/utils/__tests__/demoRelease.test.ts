import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { describe, expect, it } from 'vitest';

import { canReleaseFromDemoPool, describeDemoReleaseError } from '../demoRelease';

function graphQLError(message: string, code?: string): CombinedGraphQLErrors {
  return new CombinedGraphQLErrors({ errors: [{ message, extensions: code ? { code } : undefined }] });
}

describe('canReleaseFromDemoPool', () => {
  it('pokazuje akcję tylko recenzentowi przy rekordzie demo', () => {
    expect(canReleaseFromDemoPool({ canReviewExercises: true, availability: 'DEMO' })).toBe(true);
    expect(canReleaseFromDemoPool({ canReviewExercises: false, availability: 'DEMO' })).toBe(false);
    expect(canReleaseFromDemoPool({ canReviewExercises: true, availability: 'STANDARD' })).toBe(false);
  });

  it('nie pokazuje akcji, gdy dostępność jest nieznana', () => {
    expect(canReleaseFromDemoPool({ canReviewExercises: true, availability: undefined })).toBe(false);
    expect(canReleaseFromDemoPool({ canReviewExercises: true, availability: null })).toBe(false);
  });
});

describe('describeDemoReleaseError', () => {
  it('oddaje powód odmowy od backendu', () => {
    const error = graphQLError('Ćwiczenie zostaje w puli demo: media tylko do demo.', 'EXERCISE_DEMO_STAYS');
    expect(describeDemoReleaseError(error)).toBe('Ćwiczenie zostaje w puli demo: media tylko do demo.');
  });

  it('nie pokazuje treści innych błędów', () => {
    const generic = 'Nie udało się przenieść ćwiczenia do zwykłej bazy. Spróbuj ponownie.';
    expect(describeDemoReleaseError(graphQLError('Unexpected Execution Error', 'INTERNAL'))).toBe(generic);
    expect(describeDemoReleaseError(new Error('Failed to fetch'))).toBe(generic);
    expect(describeDemoReleaseError(undefined)).toBe(generic);
  });
});
