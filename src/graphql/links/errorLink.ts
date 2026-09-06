import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors, CombinedProtocolErrors } from '@apollo/client/errors';
import { toast } from 'sonner';
import { createModuleLogger } from '@/lib/logger';
import { isNetworkError, isUnauthenticatedError } from '@/graphql/links/authErrors';
import type { IAuthTokenProvider } from '@/graphql/links/authLink';

const log = createModuleLogger('ErrorLink');

export class ErrorLinkFactory {
  constructor(private tokenProvider?: IAuthTokenProvider) {}

  create(): ErrorLink {
    return new ErrorLink(({ error, operation, forward }) => {
      if (isUnauthenticatedError(error) && this.tokenProvider && !operation.getContext().authRetried) {
        this.tokenProvider.refreshToken();
        operation.setContext({ ...operation.getContext(), authRetried: true });
        return forward(operation);
      }

      if (CombinedGraphQLErrors.is(error)) {
        error.errors.forEach((graphError) => {
          log.error(graphError.message, undefined, {
            path: graphError.path,
            code: graphError.extensions?.code,
            operation: operation.operationName,
          });
        });
      } else if (CombinedProtocolErrors.is(error)) {
        error.errors.forEach((protocolError) => {
          log.error(protocolError.message, undefined, { operation: operation.operationName });
        });
      } else {
        log.error('Network error', error, { operation: operation.operationName });
      }

      if (isNetworkError(error) && typeof window !== 'undefined') {
        toast.error('Nie udało się połączyć z serwerem. Spróbuj ponownie.');
      }
    });
  }
}
