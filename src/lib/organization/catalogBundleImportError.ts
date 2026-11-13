import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

import { isSchemaValidationError } from '@/lib/graphql/isSchemaValidationError';

export const IMPORT_MUTATION_UNKNOWN_MESSAGE = 'Import nie powiódł się. Backend musi znać mutację importExerciseBundle.';

export const IMPORT_NOT_AUTHORIZED_MESSAGE =
  'Brak sesji lub uprawnień do importu; nic nie zostało zapisane. Zaloguj się ponownie albo poproś o dostęp.';

export const IMPORT_UNCONFIRMED_MESSAGE =
  'Wynik importu niepotwierdzony. Sprawdź bibliotekę; ponowny import tej samej paczki jest bezpieczny.';

/** Odmowa autoryzacji (kod `AUTH_*` albo HTTP 401) zapada przed resolverem, więc zapisu na pewno nie było. */
function isAuthorizationFailure(error: unknown): boolean {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.some((graphQLError) => {
      const code = graphQLError.extensions?.code;
      return typeof code === 'string' && code.startsWith('AUTH_');
    });
  }
  return ServerError.is(error) && error.statusCode === 401;
}

/**
 * Komunikat po błędzie mutacji importu. Tylko błąd walidacji schematu oznacza, że serwer odrzucił dokument przed
 * wykonaniem, więc tylko wtedy wiadomo, że nic nie zapisał. Przy HC0045, błędzie sieci po wysłaniu, 5xx albo
 * wyjątku resolvera zapis mógł się wykonać, więc nie twierdzimy, że backend nie zna mutacji.
 */
export function describeImportFailure(error: unknown): string {
  if (isSchemaValidationError(error)) return IMPORT_MUTATION_UNKNOWN_MESSAGE;
  if (isAuthorizationFailure(error)) return IMPORT_NOT_AUTHORIZED_MESSAGE;
  return IMPORT_UNCONFIRMED_MESSAGE;
}
