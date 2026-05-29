import {
  TokenExchangeResponse,
  ChangeOrganizationResponse,
  ExchangeClerkTokenRequest,
} from '@/types/tokenExchange.types';

const isDev = process.env.NODE_ENV === 'development';
const CLIENT_TYPE_HEADER_KEY = 'X-Client-Type';
const ADMIN_PORTAL_CLIENT_TYPE = 'admin-portal';

export interface TokenExchangeError extends Error {
  status?: number;
  code?: string;
}

/**
 * Serwis do wymiany tokenów z backendem
 * Komunikuje się z REST API backendu (/api/token-exchange/*)
 */
export class TokenExchangeService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Wymienia token Clerk na JWT backendu
   * @param clerkToken - Token JWT z Clerk
   * @returns Backend JWT token
   */
  async exchangeClerkToken(clerkToken: string): Promise<TokenExchangeResponse> {
    const url = `${this.baseUrl}/api/token-exchange/clerk`;

    try {
      const request: ExchangeClerkTokenRequest = {
        token: clerkToken,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CLIENT_TYPE_HEADER_KEY]: ADMIN_PORTAL_CLIENT_TYPE,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedCode: string | undefined;

        try {
          const parsedBody = JSON.parse(errorText) as { code?: unknown };
          if (typeof parsedBody.code === 'string') {
            parsedCode = parsedBody.code;
          }
        } catch {
          // Plain text response - keep default undefined code.
        }

        const responseError = new Error(
          `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`
        ) as TokenExchangeError;
        responseError.status = response.status;
        responseError.code = parsedCode;
        // Expected flow-control responses (e.g. 404 USER_NOT_FOUND while the account
        // is still syncing) are handled by callers - do not log them as errors here.
        throw responseError;
      }

      const data: TokenExchangeResponse = await response.json();

      return data;
    } catch (error) {
      // Only genuine network failures reach here without a status code. Log them at
      // warn level (never console.error with an Error) so the Next.js dev overlay
      // does not surface a handled flow-control state as a crash.
      const hasHttpStatus = typeof (error as TokenExchangeError)?.status === 'number';
      if (isDev && !hasHttpStatus) {
        console.warn('[TokenExchange] Network error during token exchange');
      }
      throw error;
    }
  }

  /**
   * Zmienia organizację w tokenie (wymienia token na nowy z inną organizacją)
   * @param backendToken - Obecny JWT backendu
   * @param organizationId - ID nowej organizacji
   * @returns Nowy backend JWT token z nową organizacją
   */
  async changeOrganization(backendToken: string, organizationId: string): Promise<ChangeOrganizationResponse> {
    const url = `${this.baseUrl}/api/token-exchange/change-organization/${organizationId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`,
          'Content-Type': 'application/json',
          [CLIENT_TYPE_HEADER_KEY]: ADMIN_PORTAL_CLIENT_TYPE,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Change organization failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: ChangeOrganizationResponse = await response.json();

      return data;
    } catch (error) {
      if (isDev) {
        console.error('[TokenExchange] Błąd zmiany organizacji:', error);
      }
      throw error;
    }
  }
}

// Singleton instance
export const tokenExchangeService = new TokenExchangeService();
