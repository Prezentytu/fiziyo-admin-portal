import { CombinedGraphQLErrors, CombinedProtocolErrors } from '@apollo/client/errors';

export function isUnauthenticatedError(error: unknown): boolean {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.some((graphError) => {
      const code = graphError.extensions?.code;
      return code === 'UNAUTHENTICATED' || code === 'AUTH_NOT_AUTHENTICATED' || graphError.message.includes('401');
    });
  }

  if (CombinedProtocolErrors.is(error)) {
    return error.errors.some((protocolError) => protocolError.extensions?.code === 'UNAUTHENTICATED');
  }

  if (error && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode === 401;
  }

  return false;
}

export function isNetworkError(error: unknown): boolean {
  return Boolean(error) && !CombinedGraphQLErrors.is(error) && !CombinedProtocolErrors.is(error);
}
