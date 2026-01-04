import {
  TokenExchangeResponse,
  ChangeOrganizationResponse,
  ExchangeClerkTokenRequest,
} from "@/types/tokenExchange.types";

const isDev = process.env.NODE_ENV === "development";

/**
 * Serwis do wymiany tokenów z backendem
 * Komunikuje się z REST API backendu (/api/token-exchange/*)
 */
export class TokenExchangeService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data: TokenExchangeResponse = await response.json();

      return data;
    } catch (error) {
      if (isDev) {
        console.error("[TokenExchange] Błąd wymiany tokenu:", error);
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
  async changeOrganization(
    backendToken: string,
    organizationId: string
  ): Promise<ChangeOrganizationResponse> {
    const url = `${this.baseUrl}/api/token-exchange/change-organization/${organizationId}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${backendToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Change organization failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data: ChangeOrganizationResponse = await response.json();

      return data;
    } catch (error) {
      if (isDev) {
        console.error("[TokenExchange] Błąd zmiany organizacji:", error);
      }
      throw error;
    }
  }
}

// Singleton instance
export const tokenExchangeService = new TokenExchangeService();














