import { ApolloLink, Observable, Operation, FetchResult } from '@apollo/client';

type NextLink = (operation: Operation) => Observable<FetchResult>;

const isDev = process.env.NODE_ENV === 'development';

// Interfejs zgodny z Dependency Inversion Principle
export interface IAuthTokenProvider {
  getToken(): Promise<string | null>;
}

// Factory do tworzenia Auth Link zgodna z Single Responsibility Principle
export class AuthLinkFactory {
  constructor(private tokenProvider: IAuthTokenProvider) {}

  create(): ApolloLink {
    return new ApolloLink((operation: Operation, forward: NextLink): Observable<FetchResult> => {
      return new Observable<FetchResult>((observer) => {
        let subscription: { unsubscribe(): void } | undefined;
        let closed = false;

        const handleRequest = async () => {
          try {
            const token = await this.tokenProvider.getToken();

            // Dodaj token do nagłówków jeśli istnieje
            operation.setContext({
              headers: {
                ...operation.getContext().headers,
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
          } catch (error) {
            if (isDev) {
              console.error('[AuthLink] Token fetch failed:', error);
            }
            // Kontynuuj bez autoryzacji
          }

          // Operacja anulowana w trakcie pobierania tokenu - nie wysyłaj requestu
          if (closed) return;

          // Przekaż operację dalej
          subscription = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        };

        handleRequest();

        // Cleanup musi wrócić z subscribera, a nie z funkcji async - inaczej unsubscribe nie anuluje requestu
        return () => {
          closed = true;
          subscription?.unsubscribe();
        };
      });
    });
  }
}
