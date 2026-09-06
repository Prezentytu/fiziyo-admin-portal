import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { isNetworkError, isUnauthenticatedError } from '@/graphql/links/authErrors';

describe('isUnauthenticatedError', () => {
  it('detects GraphQL UNAUTHENTICATED code', () => {
    const error = new CombinedGraphQLErrors({
      errors: [new GraphQLError('Auth required', { extensions: { code: 'UNAUTHENTICATED' } })],
    });
    expect(isUnauthenticatedError(error)).toBe(true);
  });

  it('detects HTTP 401 statusCode', () => {
    expect(isUnauthenticatedError({ statusCode: 401 })).toBe(true);
  });

  it('returns false for ordinary GraphQL errors', () => {
    const error = new CombinedGraphQLErrors({
      errors: [new GraphQLError('Not found')],
    });
    expect(isUnauthenticatedError(error)).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('treats generic Error as network', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
  });
});
