import { IAuthTokenProvider } from '../links/authLink';
import { tokenExchangeService, type TokenExchangeError } from '@/services/tokenExchangeService';
import { getBackendToken, saveBackendToken, clearBackendToken } from '@/lib/tokenCache';
import { decodeJwtPayload, getClerkIdFromToken, getUserRoleFromToken } from '@/lib/auth/jwtClaims';

const isDev = process.env.NODE_ENV === 'development';
const PATIENT_ROLE = 'patient';

let processWideGetTokenFlight: Promise<string | null> | null = null;

export function resetBackendAuthTokenProviderForTests(): void {
  processWideGetTokenFlight = null;
}

/**
 * Pacjent nie ma dostępu do panelu webowego (physio-only). Token z rolą "patient"
 * nigdy nie może być cache'owany ani wysyłany w zapytaniach GraphQL — w przeciwnym razie
 * pacjent bombarduje backend zapytaniami terapeutycznymi (które i tak są odrzucane).
 * To defense-in-depth wobec autorytatywnej bramki 403 PATIENT_NOT_ALLOWED_ON_ADMIN w backendzie.
 */
function isPatientToken(token: string): boolean {
  return getUserRoleFromToken(token)?.trim().toLowerCase() === PATIENT_ROLE;
}

/**
 * Provider tokenów dla backendu (wersja Web/Next.js)
 * Single-flight obejmuje całą ścieżkę cache miss, w tym odczyt Clerk.
 */
export class BackendAuthTokenProvider implements IAuthTokenProvider {
  private getClerkTokenFn: () => Promise<string | null>;

  constructor(getClerkTokenFn: () => Promise<string | null>) {
    this.getClerkTokenFn = getClerkTokenFn;
  }

  private resolveCachedIdentity(cachedToken: string, clerkToken: string): 'same' | 'different' | 'unknown' {
    const cachedPayload = decodeJwtPayload(cachedToken);
    const clerkPayload = decodeJwtPayload(clerkToken);
    if (!cachedPayload || !clerkPayload) {
      return 'unknown';
    }

    const cachedClerkId = getClerkIdFromToken(cachedToken);
    const currentClerkId = getClerkIdFromToken(clerkToken);
    if (!cachedClerkId || !currentClerkId) {
      return 'unknown';
    }

    return cachedClerkId === currentClerkId ? 'same' : 'different';
  }

  private isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now < 300;
  }

  async getToken(): Promise<string | null> {
    if (processWideGetTokenFlight) {
      return processWideGetTokenFlight;
    }

    processWideGetTokenFlight = this.resolveToken().finally(() => {
      processWideGetTokenFlight = null;
    });

    return processWideGetTokenFlight;
  }

  private async resolveToken(): Promise<string | null> {
    try {
      const cachedBeforeClerk = getBackendToken();
      const clerkToken = await this.getClerkTokenFn();
      const cachedToken = getBackendToken() ?? cachedBeforeClerk;

      if (!clerkToken) {
        clearBackendToken();
        return null;
      }

      if (cachedToken) {
        const identity = this.resolveCachedIdentity(cachedToken, clerkToken);
        if (identity === 'different') {
          clearBackendToken();
        } else if (identity === 'same' && isPatientToken(cachedToken)) {
          clearBackendToken();
          return null;
        } else if (identity === 'same' && !this.isTokenExpired(cachedToken)) {
          return cachedToken;
        } else if (identity === 'unknown' && decodeJwtPayload(cachedToken) && !this.isTokenExpired(cachedToken)) {
          if (isPatientToken(cachedToken)) {
            clearBackendToken();
            return null;
          }
          return cachedToken;
        } else if (identity === 'same' && this.isTokenExpired(cachedToken)) {
          clearBackendToken();
        }
      }

      return await this.performTokenExchange();
    } catch (error) {
      if (this.hasHttpStatus(error)) {
        throw error;
      }
      if (isDev) {
        console.warn('[BackendAuthTokenProvider] Network error while resolving backend token');
      }
      return null;
    }
  }

  private hasHttpStatus(error: unknown): boolean {
    return typeof (error as TokenExchangeError)?.status === 'number';
  }

  private async performTokenExchange(): Promise<string | null> {
    try {
      const clerkToken = await this.getClerkTokenFn();
      const cachedDuringExchange = getBackendToken();
      if (
        clerkToken &&
        cachedDuringExchange &&
        !this.isTokenExpired(cachedDuringExchange) &&
        !isPatientToken(cachedDuringExchange)
      ) {
        const identity = this.resolveCachedIdentity(cachedDuringExchange, clerkToken);
        if (identity === 'same') {
          return cachedDuringExchange;
        }
        if (identity === 'unknown' && decodeJwtPayload(cachedDuringExchange)) {
          return cachedDuringExchange;
        }
        clearBackendToken();
      }

      if (!clerkToken) {
        return null;
      }

      const backendToken = await this.exchangeWithRetry(clerkToken);
      if (backendToken) {
        if (isPatientToken(backendToken)) {
          clearBackendToken();
          return null;
        }

        saveBackendToken(backendToken);
        return backendToken;
      }

      return null;
    } catch (error) {
      if (isDev && !this.hasHttpStatus(error)) {
        console.warn('[BackendAuthTokenProvider] Network error during token exchange');
      }

      clearBackendToken();
      throw error;
    }
  }

  private async exchangeWithRetry(clerkToken: string, retryCount: number = 0): Promise<string | null> {
    const MAX_RETRIES = 1;

    try {
      const response = await tokenExchangeService.exchangeClerkToken(clerkToken);
      return response.access_token;
    } catch (error: unknown) {
      const typedError = error as TokenExchangeError;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = typeof typedError.status === 'number' ? typedError.status : null;
      const errorCode = typeof typedError.code === 'string' ? typedError.code : null;
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
      const canRetry = retryCount < MAX_RETRIES && isNetworkError;

      if (canRetry) {
        await this.sleep(1000);
        return this.exchangeWithRetry(clerkToken, retryCount + 1);
      }

      if (statusCode === 403 && errorCode === 'PATIENT_NOT_ALLOWED_ON_ADMIN') {
        clearBackendToken();
      }

      if (errorMessage.includes('401') || statusCode === 401) {
        clearBackendToken();
      }

      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  refreshToken(): void {
    clearBackendToken();
  }
}
