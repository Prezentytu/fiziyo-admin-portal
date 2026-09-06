import { ApolloLink, Observable, Operation, FetchResult } from '@apollo/client';
import { createModuleLogger } from '@/lib/logger';

type NextLink = (operation: Operation) => Observable<FetchResult>;

const log = createModuleLogger('AuthLink');

export interface IAuthTokenProvider {
  getToken(): Promise<string | null>;
  refreshToken(): void;
}

export class AuthLinkFactory {
  constructor(private tokenProvider: IAuthTokenProvider) {}

  create(): ApolloLink {
    return new ApolloLink((operation: Operation, forward: NextLink): Observable<FetchResult> => {
      return new Observable<FetchResult>((observer) => {
        let innerUnsubscribe: (() => void) | undefined;
        let cancelled = false;

        const handleRequest = async () => {
          try {
            const skipAuth = operation.getContext().skipAuth === true;
            if (!skipAuth) {
              const token = await this.tokenProvider.getToken();
              if (!token) {
                observer.error(new Error('Brak tokenu autoryzacji'));
                return;
              }

              operation.setContext({
                headers: {
                  ...operation.getContext().headers,
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
            }
          } catch (error) {
            log.error('Token fetch failed', error);
            observer.error(error instanceof Error ? error : new Error('Token fetch failed'));
            return;
          }

          if (cancelled) {
            return;
          }

          const subscription = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
          innerUnsubscribe = () => subscription.unsubscribe();
        };

        void handleRequest();

        return () => {
          cancelled = true;
          innerUnsubscribe?.();
        };
      });
    });
  }
}
