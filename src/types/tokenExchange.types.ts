/**
 * Typy dla Token Exchange API
 */

/**
 * Odpowiedź z backendu po wymianie tokenu Clerk na JWT backendu
 * (fizjo-app `backend/FizjoApp.Api/Models/TokenExchange/TokenExchangeResponse.cs`).
 * `expiration` to czas życia w sekundach.
 */
export interface TokenExchangeResponse {
  access_token: string;
  expiration: number;
}

/** Odpowiedź z backendu po zmianie organizacji: ten sam kształt co wymiana tokenu. */
export type ChangeOrganizationResponse = TokenExchangeResponse;

/**
 * Request do wymiany tokenu Clerk
 */
export interface ExchangeClerkTokenRequest {
  token: string;
}
