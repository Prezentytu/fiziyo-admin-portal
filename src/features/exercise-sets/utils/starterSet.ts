import { CombinedGraphQLErrors } from '@apollo/client/errors';

/** Flaga konta z `GET /api/me/features`, która odsłania przełącznik. */
export const STARTER_SET_FEATURE_FLAG = 'starterSet';

export interface StarterSetToggleResult {
  readonly exerciseSetId: string;
  readonly isStarterSet: boolean;
  readonly assignedCount: number;
  readonly cancelledCount: number;
}

/** Kody odmów z backendu, których treść jest pisana dla terapeuty (StarterSetRefusedException). */
const READABLE_REFUSAL_CODES = new Set([
  'STARTER_SET_FEATURE_DISABLED',
  'STARTER_SET_UNVERIFIED_EXERCISES',
  'STARTER_SET_TEMPLATE_NOT_FOUND',
  'STARTER_SET_INACTIVE',
]);

export function starterSetToastMessage(result: StarterSetToggleResult): string {
  if (result.isStarterSet) {
    return result.assignedCount > 0
      ? `Zestaw dla wszystkich pacjentów. Nowe przypisania: ${result.assignedCount}.`
      : 'Zestaw dla wszystkich pacjentów. Nowi pacjenci dostaną go automatycznie.';
  }
  return result.cancelledCount > 0
    ? `Zestaw nie jest już dla wszystkich. Zakończono automatyczne przypisania: ${result.cancelledCount}.`
    : 'Zestaw nie jest już dla wszystkich pacjentów.';
}

/** Treść odmowy z backendu, gdy jest jednym z naszych kodów; inaczej ogólny komunikat bez surowego błędu. */
export function starterSetErrorMessage(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    const refusal = error.errors.find((item) => {
      const code = item.extensions?.code;
      return typeof code === 'string' && READABLE_REFUSAL_CODES.has(code);
    });
    if (refusal?.message) return refusal.message;
  }
  return 'Nie udało się zmienić ustawienia zestawu. Spróbuj ponownie.';
}
