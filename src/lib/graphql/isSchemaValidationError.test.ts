import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { describe, expect, it } from 'vitest';

import { isSchemaValidationError } from './isSchemaValidationError';

function serverError(status: number): ServerError {
  return new ServerError(`Response not successful: Received status code ${status}`, {
    response: new Response('{}', { status }),
    bodyText: '{}',
  });
}

describe('isSchemaValidationError', () => {
  it('HTTP 400 (HotChocolate odrzuca dokument przed wykonaniem) to błąd schematu', () => {
    expect(isSchemaValidationError(serverError(400))).toBe(true);
  });

  it('błędy GraphQL bez ścieżki (walidacja dokumentu) to błąd schematu', () => {
    const error = new CombinedGraphQLErrors({
      errors: [{ message: 'The field `availability` does not exist on the type `Exercise`.' }],
    });
    expect(isSchemaValidationError(error)).toBe(true);
  });

  it.each([
    ['brak odpowiedzi (błąd sieci)', new TypeError('Failed to fetch')],
    ['HTTP 500', serverError(500)],
    ['HTTP 503', serverError(503)],
    [
      'błąd wykonania ze ścieżką pola',
      new CombinedGraphQLErrors({ data: null, errors: [{ message: 'boom', path: ['exerciseById'] }] }),
    ],
    ['brak błędu', undefined],
  ])('%s to nie błąd schematu', (_name, error) => {
    expect(isSchemaValidationError(error)).toBe(false);
  });
});
