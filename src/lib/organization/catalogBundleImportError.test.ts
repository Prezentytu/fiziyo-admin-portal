import { ServerError } from '@apollo/client/errors';
import { describe, expect, it } from 'vitest';

import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client';

import { HOTCHOCOLATE_RESPONSES } from '@/lib/graphql/hotChocolateResponses.fixture';

import {
  describeImportFailure,
  IMPORT_MUTATION_UNKNOWN_MESSAGE,
  IMPORT_NOT_AUTHORIZED_MESSAGE,
  IMPORT_UNCONFIRMED_MESSAGE,
} from './catalogBundleImportError';

/** Błąd z prawdziwego klienta Apollo i zapisanej odpowiedzi HotChocolate 15.1.14. */
async function failureOf(response: { status: number; body: string }): Promise<unknown> {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: 'http://api.test/graphql',
      fetch: async () =>
        new Response(response.body, {
          status: response.status,
          headers: { 'content-type': 'application/graphql-response+json; charset=utf-8' },
        }),
    }),
  });
  return client.mutate({ mutation: gql`mutation M { __typename }` }).then(
    () => null,
    (error: unknown) => error
  );
}

describe('describeImportFailure', () => {
  it.each(['unknownField', 'unknownArg', 'unknownVarType'] as const)(
    'błąd walidacji (%s): serwer odrzucił dokument przed zapisem, komunikat o nieznanej mutacji',
    async (name) => {
      expect(describeImportFailure(await failureOf(HOTCHOCOLATE_RESPONSES[name]))).toBe(IMPORT_MUTATION_UNKNOWN_MESSAGE);
    }
  );

  it.each(['timeout', 'resolver'] as const)(
    'błąd %s: zapis mógł się wykonać, komunikat bez twierdzenia o nieznanej mutacji',
    async (name) => {
      expect(describeImportFailure(await failureOf(HOTCHOCOLATE_RESPONSES[name]))).toBe(IMPORT_UNCONFIRMED_MESSAGE);
    }
  );

  it('błąd autoryzacji (AUTH_*): zapis na pewno się nie wykonał, komunikat o sesji lub uprawnieniach', async () => {
    expect(describeImportFailure(await failureOf(HOTCHOCOLATE_RESPONSES.unauth))).toBe(IMPORT_NOT_AUTHORIZED_MESSAGE);
    expect(IMPORT_NOT_AUTHORIZED_MESSAGE).toContain('nic nie zostało zapisane');
  });

  it('HTTP 401 bez ciała GraphQL: ten sam komunikat o braku sesji', async () => {
    expect(describeImportFailure(await failureOf({ status: 401, body: '{}' }))).toBe(IMPORT_NOT_AUTHORIZED_MESSAGE);
  });

  it('"Unexpected Execution Error" (wyjątek resolvera bez kodu): niepotwierdzony', async () => {
    const body = '{"errors":[{"message":"Unexpected Execution Error","path":["importExerciseBundle"]}],"data":null}';
    expect(describeImportFailure(await failureOf({ status: 200, body }))).toBe(IMPORT_UNCONFIRMED_MESSAGE);
  });

  it.each([
    ['błąd sieci po wysłaniu', new TypeError('Failed to fetch')],
    [
      'HTTP 500',
      new ServerError('Response not successful: Received status code 500', {
        response: new Response('{}', { status: 500 }),
        bodyText: '{}',
      }),
    ],
    ['przerwane żądanie', new DOMException('The operation was aborted.', 'AbortError')],
  ])('%s: komunikat o niepotwierdzonym wyniku', (_name, error) => {
    expect(describeImportFailure(error)).toBe(IMPORT_UNCONFIRMED_MESSAGE);
  });

  it('komunikat o niepotwierdzonym wyniku mówi, że ponowny import jest bezpieczny, i nie obwinia backendu', () => {
    expect(IMPORT_UNCONFIRMED_MESSAGE).toBe(
      'Wynik importu niepotwierdzony. Sprawdź bibliotekę; ponowny import tej samej paczki jest bezpieczny.'
    );
    expect(IMPORT_UNCONFIRMED_MESSAGE).not.toContain('Backend musi znać');
  });
});
