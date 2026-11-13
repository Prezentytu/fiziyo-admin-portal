import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';

import { HOTCHOCOLATE_RESPONSES } from './hotChocolateResponses.fixture';
import { isSchemaValidationError } from './isSchemaValidationError';

type Recorded = keyof typeof HOTCHOCOLATE_RESPONSES;

/** Błąd, który prawdziwy Apollo HttpLink oddaje dla zapisanej prawdziwej odpowiedzi HotChocolate. */
async function errorFor(name: Recorded): Promise<unknown> {
  const { status, body } = HOTCHOCOLATE_RESPONSES[name];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: 'http://backend.test/graphql',
      fetch: async () =>
        new Response(body, { status, headers: { 'Content-Type': 'application/graphql-response+json; charset=utf-8' } }),
    }),
  });
  try {
    await client.query({
      query: gql`
        query {
          exerciseById(id: "1") {
            id
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
  } catch (error) {
    return error;
  }
  throw new Error('zapytanie nie zwróciło błędu');
}

describe('isSchemaValidationError na prawdziwych odpowiedziach HotChocolate 15.1.14', () => {
  it.each<[string, Recorded]>([
    ['nieznane pole (HTTP 400, błąd ma path)', 'unknownField'],
    ['nieznany argument (HTTP 400, bez path)', 'unknownArg'],
    ['zmienna niezgodna z typem (HTTP 400)', 'unknownVarType'],
  ])('%s to błąd schematu', async (_name, recorded) => {
    expect(isSchemaValidationError(await errorFor(recorded))).toBe(true);
  });

  it.each<[string, Recorded]>([
    ['przekroczony limit wykonania HC0045 (HTTP 400, po zapisie)', 'timeout'],
    ['brak autoryzacji (200, path)', 'unauth'],
    ['wyjątek resolvera (200, path, data)', 'resolver'],
  ])('%s to nie błąd schematu', async (_name, recorded) => {
    expect(isSchemaValidationError(await errorFor(recorded))).toBe(false);
  });

  it('błąd sieci, HTTP 5xx bez treści GraphQL i brak błędu to nie błąd schematu', async () => {
    expect(isSchemaValidationError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isSchemaValidationError(undefined)).toBe(false);
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: 'http://backend.test/graphql',
        fetch: async () => new Response('oops', { status: 503 }),
      }),
    });
    const error = await client
      .query({
        query: gql`
          query {
            __typename
          }
        `,
      })
      .catch((caught: unknown) => caught);
    expect(isSchemaValidationError(error)).toBe(false);
  });
});
