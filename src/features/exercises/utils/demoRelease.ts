import { CombinedGraphQLErrors } from '@apollo/client/errors';

/** Kod odmowy backendu: ćwiczenie nie spełnia warunków zdjęcia flagi demo, powód jest w treści błędu. */
export const DEMO_STAYS_CODE = 'EXERCISE_DEMO_STAYS';

const GENERIC_MESSAGE = 'Nie udało się przenieść ćwiczenia do zwykłej bazy. Spróbuj ponownie.';

/** „Przenieś do zwykłej bazy” widzi tylko recenzent katalogu i tylko przy rekordzie, o którym wiemy, że jest demo. */
export function canReleaseFromDemoPool(input: {
  canReviewExercises: boolean;
  availability: string | null | undefined;
}): boolean {
  return input.canReviewExercises && input.availability === 'DEMO';
}

/** Odmowa z powodem od backendu trafia do recenzenta w całości; każdy inny błąd dostaje komunikat ogólny. */
export function describeDemoReleaseError(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    const refusal = error.errors.find((entry) => entry.extensions?.code === DEMO_STAYS_CODE);
    if (refusal?.message) return refusal.message;
  }
  return GENERIC_MESSAGE;
}
