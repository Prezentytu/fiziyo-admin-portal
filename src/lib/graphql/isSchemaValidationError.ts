import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

/**
 * Czy backend odrzucił dokument, bo nie zna jego pól (walidacja schematu przed wykonaniem; nic nie zostało
 * wykonane ani zapisane). HotChocolate odpowiada wtedy HTTP 400 albo błędami GraphQL bez ścieżki pola.
 *
 * Brak odpowiedzi (błąd sieci), HTTP 5xx i błędy wykonania ze ścieżką pola to NIE jest błąd schematu:
 * nie wolno z nich wnioskować, że backend nie zna pola.
 */
export function isSchemaValidationError(error: unknown): boolean {
  if (ServerError.is(error)) return error.statusCode === 400;
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.length > 0 && error.errors.every((graphQLError) => !graphQLError.path?.length);
  }
  return false;
}
