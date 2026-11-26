import { describe, expect, it } from 'vitest';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { starterSetErrorMessage, starterSetToastMessage } from './starterSet';

const result = (isStarterSet: boolean, assignedCount = 0, cancelledCount = 0) => ({
  exerciseSetId: 'set-1',
  isStarterSet,
  assignedCount,
  cancelledCount,
});

describe('starterSetToastMessage', () => {
  it('po włączeniu podaje liczbę nowych przypisań albo zapowiada nowych pacjentów', () => {
    expect(starterSetToastMessage(result(true, 4))).toContain('Nowe przypisania: 4');
    expect(starterSetToastMessage(result(true, 0))).toContain('Nowi pacjenci dostaną go automatycznie');
  });

  it('po wyłączeniu mówi o zakończonych przypisaniach automatycznych', () => {
    expect(starterSetToastMessage(result(false, 0, 3))).toContain('Zakończono automatyczne przypisania: 3');
    expect(starterSetToastMessage(result(false))).toBe('Zestaw nie jest już dla wszystkich pacjentów.');
  });
});

describe('starterSetErrorMessage', () => {
  const graphQLError = (code: string, message: string) =>
    new CombinedGraphQLErrors({ errors: [{ message, extensions: { code } }] });

  it('pokazuje treść odmowy z backendu, np. które ćwiczenia czekają na zatwierdzenie', () => {
    expect(
      starterSetErrorMessage(graphQLError('STARTER_SET_UNVERIFIED_EXERCISES', 'Najpierw zatwierdź ćwiczenia: Mostek.'))
    ).toBe('Najpierw zatwierdź ćwiczenia: Mostek.');
  });

  it('nie pokazuje surowych błędów spoza listy odmów', () => {
    const fallback = 'Nie udało się zmienić ustawienia zestawu. Spróbuj ponownie.';
    expect(starterSetErrorMessage(graphQLError('AUTH_NOT_AUTHORIZED', 'The current user is not authorized'))).toBe(
      fallback
    );
    expect(starterSetErrorMessage(new Error('Failed to fetch'))).toBe(fallback);
  });
});
