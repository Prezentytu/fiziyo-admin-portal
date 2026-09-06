import { HttpLink } from '@apollo/client';
import { IUrlConfig } from '../config/urlConfig';

const isDev = process.env.NODE_ENV === 'development';

// Logger interface zgodny z Dependency Inversion Principle
export interface IGraphQLLogger {
  logRequest(uri: RequestInfo | URL | string, options: RequestInit | undefined): void;
  logResponse(response: Response): void;
  logError(error: unknown): void;
}

// Domyślna implementacja loggera
export class ConsoleGraphQLLogger implements IGraphQLLogger {
  logRequest(_uri: RequestInfo | URL | string, _options: RequestInit | undefined): void {
    // Logowanie wyłączone dla lepszej wydajności
  }

  logResponse(_response: Response): void {
    // Logowanie wyłączone dla lepszej wydajności
  }

  logError(error: unknown): void {
    if (isDev) {
      const err = error as Error;
      console.error('GraphQL Fetch Error:', {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n')[0],
      });
    }
  }
}

// Factory do tworzenia HTTP Link zgodna z Single Responsibility Principle
export class HttpLinkFactory {
  private readonly TIMEOUT_MS = 60000;

  constructor(
    private urlConfig: IUrlConfig,
    private logger: IGraphQLLogger = new ConsoleGraphQLLogger()
  ) {}

  create(): HttpLink {
    return new HttpLink({
      uri: this.urlConfig.getGraphQLEndpoint(),
      headers: {
        'Content-Type': 'application/json',
      },
      fetch: this.createFetchWithLogging.bind(this),
    });
  }

  private async createFetchWithLogging(uri: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
    const signal = options?.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;

    try {
      const response = await fetch(uri, { ...options, signal });

      // Podstawowe logowanie response (bez parsowania body)
      this.logger.logResponse(response);

      // ✅ Sprawdź content-type PRZED przekazaniem do Apollo
      // Zapobiega błędom "JSON Parse error: Unexpected character: <" gdy serwer zwraca HTML
      const contentType = response.headers.get('content-type') || '';
      const isJsonResponse = contentType.includes('application/json') || contentType.includes('application/graphql');

      if (!isJsonResponse && response.ok && isDev) {
        // Serwer zwrócił 200, ale nie JSON - prawdopodobnie strona błędu lub redirect
        console.warn(`[GraphQL] Unexpected content-type: ${contentType}. Expected application/json.`);
      }

      if (!response.ok) {
        // Serwer zwrócił błąd HTTP (4xx, 5xx)
        const isHtmlError = contentType.includes('text/html');

        if (isHtmlError) {
          // Serwer zwrócił stronę HTML błędu - nie próbuj parsować jako JSON
          if (isDev) {
            console.error(
              `[GraphQL] Server returned HTML error page instead of JSON`,
              `\nStatus: ${response.status} ${response.statusText}`
            );
          }

          // Rzuć czytelny błąd zamiast pozwolić Apollo na próbę parsowania HTML
          throw new Error(
            `GraphQL server error: ${response.status} ${response.statusText}. ` +
              `Server returned HTML instead of JSON. Check if backend is running.`
          );
        }
      }

      // Zwróć response - Apollo HttpLink sam zajmie się parsowaniem
      return response;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
