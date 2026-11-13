import { CombinedGraphQLErrors } from '@apollo/client/errors';

/**
 * Czy backend odrzucił dokument walidacją schematu (nieznane pole, argument, typ zmiennej). Walidacja HotChocolate
 * oznacza każdy swój błąd `extensions.specifiedBy` (odnośnik do specyfikacji GraphQL) i odpowiada bez `data`.
 * Nie wolno rozpoznawać jej po statusie HTTP ani po braku `path`: nieznane pole wraca z `path`, a przekroczony
 * limit wykonania (HC0045) jako HTTP 400 bez `path`, już po wykonaniu mutacji.
 *
 * Błąd sieci, HTTP 5xx, autoryzacja, wyjątek resolvera i HC0045 nie mają `specifiedBy`, więc to nie jest błąd schematu.
 */
export function isSchemaValidationError(error: unknown): boolean {
  if (!CombinedGraphQLErrors.is(error)) return false;
  return (
    error.data == null &&
    error.errors.length > 0 &&
    error.errors.every((graphQLError) => typeof graphQLError.extensions?.specifiedBy === 'string')
  );
}
