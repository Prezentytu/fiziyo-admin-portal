/**
 * Typy dla Token Exchange API
 */

/**
 * Odpowiedź z backendu po wymianie tokenu Clerk na JWT backendu
 */
export interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Odpowiedź z backendu po zmianie organizacji
 */
export interface ChangeOrganizationResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Request do wymiany tokenu Clerk
 */
export interface ExchangeClerkTokenRequest {
  token: string;
}










