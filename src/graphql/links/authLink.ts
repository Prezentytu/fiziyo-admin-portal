import { ApolloLink, Observable, Operation, FetchResult } from "@apollo/client";

type NextLink = (operation: Operation) => Observable<FetchResult>;

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
        const handleRequest = async () => {
          try {
            const token = await this.tokenProvider.getToken();

            // Dodaj token do nagłówków jeśli istnieje
            operation.setContext({
              headers: {
                ...operation.getContext().headers,
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
          } catch (error) {
            console.error("[AuthLink] Token fetch failed:", error);
            // Kontynuuj bez autoryzacji
          }

          // Przekaż operację dalej
          const subscription = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });

          return () => subscription.unsubscribe();
        };

        handleRequest();
      });
    });
  }
}
