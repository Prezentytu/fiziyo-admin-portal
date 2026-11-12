import { isSchemaValidationError } from '@/lib/graphql/isSchemaValidationError';

export const IMPORT_MUTATION_UNKNOWN_MESSAGE = 'Import nie powiódł się. Backend musi znać mutację importExerciseBundle.';

export const IMPORT_UNCONFIRMED_MESSAGE =
  'Wynik importu niepotwierdzony. Sprawdź bibliotekę; ponowny import tej samej paczki jest bezpieczny.';

/**
 * Komunikat po błędzie mutacji importu. Tylko błąd walidacji schematu oznacza, że serwer odrzucił dokument przed
 * wykonaniem, więc tylko wtedy wiadomo, że nic nie zapisał. Przy HC0045, błędzie sieci po wysłaniu, 5xx albo
 * wyjątku resolvera zapis mógł się wykonać, więc nie twierdzimy, że backend nie zna mutacji.
 */
export function describeImportFailure(error: unknown): string {
  return isSchemaValidationError(error) ? IMPORT_MUTATION_UNKNOWN_MESSAGE : IMPORT_UNCONFIRMED_MESSAGE;
}
