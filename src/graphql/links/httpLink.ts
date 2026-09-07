import { HttpLink } from '@apollo/client';
import { IUrlConfig } from '../config/urlConfig';
import { formatGraphqlHttpError, isJsonGraphqlContentType } from '@/graphql/links/httpError';
import { createModuleLogger } from '@/lib/logger';

const isDev = process.env.NODE_ENV === 'development';
const httpLog = createModuleLogger('HttpLink');

export interface IGraphQLLogger {
  logRequest(uri: RequestInfo | URL | string, options: RequestInit | undefined): void;
  logResponse(response: Response): void;
  logError(error: unknown): void;
}

export class ConsoleGraphQLLogger implements IGraphQLLogger {
  logRequest(_uri: RequestInfo | URL | string, _options: RequestInit | undefined): void {}

  logResponse(_response: Response): void {}

  logError(error: unknown): void {
    if (isDev) {
      httpLog.error('Fetch failed', error instanceof Error ? error.message : String(error));
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
      const isJsonResponse = isJsonGraphqlContentType(contentType);

      if (!isJsonResponse && response.ok && isDev) {
        httpLog.warn('Unexpected content-type, expected JSON', { contentType });
      }

      if (!response.ok && !isJsonResponse) {
        const bodyText = await response.text();
        throw new Error(formatGraphqlHttpError(response.status, response.statusText, contentType, bodyText));
      }

      return response;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
