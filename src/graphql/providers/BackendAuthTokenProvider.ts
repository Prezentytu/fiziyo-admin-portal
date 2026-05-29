import { IAuthTokenProvider } from '../links/authLink';
import { tokenExchangeService, type TokenExchangeError } from '@/services/tokenExchangeService';
import { getBackendToken, saveBackendToken, clearBackendToken } from '@/lib/tokenCache';
import { getUserRoleFromToken } from '@/lib/auth/jwtClaims';

const isDev = process.env.NODE_ENV === 'development';
const PATIENT_ROLE = 'patient';

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
 * Implementuje IAuthTokenProvider zgodnie z Dependency Inversion Principle
 *
 * Flow:
 * 1. Pobiera aktualny Clerk token
 * 2. Sprawdza cache - jeśli jest backend token:
 *    a) Weryfikuje czy należy do AKTUALNEGO użytkownika (porównuje ClerkId)
 *    b) Sprawdza czy nie wygasł
 * 3. Jeśli brak tokenu, wygasł, lub należy do INNEGO użytkownika - wymienia token
 * 4. Cache'uje backend token w sessionStorage
 * 5. Zwraca backend token
 *
 * Zabezpieczenia:
 * - User identity validation (porównanie ClerkId)
 * - Race condition protection (jedna wymiana na raz)
 * - Retry logic dla network errors
 * - Clear cache przy 401 (token wygasł)
 */
export class BackendAuthTokenProvider implements IAuthTokenProvider {
  private getClerkTokenFn: () => Promise<string | null>;
  private isExchanging: boolean = false;
  private exchangePromise: Promise<string | null> | null = null;

  constructor(getClerkTokenFn: () => Promise<string | null>) {
    this.getClerkTokenFn = getClerkTokenFn;
  }

  /**
   * Dekoduje payload z JWT tokenu
   * @param token - JWT token string
   * @returns payload object lub null przy błędzie
   */
  private decodeTokenPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      if (isDev) {
        console.error('[BackendAuthTokenProvider] Błąd dekodowania tokena:', error);
      }
      return null;
    }
  }

  /**
   * Sprawdza czy JWT token wygasł
   * @param token - JWT token string
   * @returns true jeśli token wygasł lub jest nieprawidłowy
   */
  private isTokenExpired(token: string): boolean {
    const payload = this.decodeTokenPayload(token);
    if (!payload || !payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = (payload.exp as number) - now;

    // Token wygasł lub wygasa za < 5 minut (buffer)
    return expiresIn < 300;
  }

  /**
   * Wyciąga ClerkId z tokenu (backend token ma claim "clerk_id" lub "ClerkId")
   * @param token - JWT token string
   * @returns ClerkId lub null
   */
  private getClerkIdFromToken(token: string): string | null {
    const payload = this.decodeTokenPayload(token);
    if (!payload) return null;

    // Backend token ma clerk_id, Clerk token ma sub (który jest ClerkId)
    return (payload.clerk_id as string) || (payload.ClerkId as string) || (payload.sub as string) || null;
  }

  /**
   * Sprawdza czy cached token należy do aktualnego użytkownika Clerk
   * @param cachedToken - Backend JWT z cache
   * @param clerkToken - Aktualny Clerk JWT
   * @returns true jeśli tokeny należą do tego samego użytkownika
   */
  private isTokenForCurrentUser(cachedToken: string, clerkToken: string): boolean {
    const cachedClerkId = this.getClerkIdFromToken(cachedToken);
    const currentClerkId = this.getClerkIdFromToken(clerkToken);

    if (!cachedClerkId || !currentClerkId) {
      if (isDev) {
        console.warn('[BackendAuthTokenProvider] Nie można porównać ClerkId - wymuszam refresh');
      }
      return false;
    }

    const isSameUser = cachedClerkId === currentClerkId;

    if (!isSameUser && isDev) {
      console.log('[BackendAuthTokenProvider] Zmiana użytkownika wykryta');
    }

    return isSameUser;
  }

  /**
   * Główna metoda - zwraca backend JWT token
   * Implementacja interfejsu IAuthTokenProvider
   */
  async getToken(): Promise<string | null> {
    try {
      // KROK 0: Pobierz aktualny Clerk token (potrzebny do walidacji)
      const clerkToken = await this.getClerkTokenFn();

      if (!clerkToken) {
        // Wyczyść cache na wszelki wypadek
        clearBackendToken();
        return null;
      }

      // KROK 1: Sprawdź cache
      const cachedToken = getBackendToken();
      if (cachedToken) {
        // KRYTYCZNE: Sprawdź czy cached token należy do AKTUALNEGO użytkownika
        const isForCurrentUser = this.isTokenForCurrentUser(cachedToken, clerkToken);

        if (!isForCurrentUser) {
          clearBackendToken();
          // Kontynuuj do wymiany tokenu
        } else if (isPatientToken(cachedToken)) {
          // Pacjent nie ma dostępu do panelu — nie serwuj tokenu, wyczyść cache.
          clearBackendToken();
          return null;
        } else if (!this.isTokenExpired(cachedToken)) {
          // Token należy do aktualnego użytkownika i nie wygasł
          return cachedToken;
        } else {
          // Token wygasł - wyczyść cache
          clearBackendToken();
        }
      }

      // KROK 2: Brak w cache lub wygasł/inny user - wymień Clerk token na backend token
      const backendToken = await this.exchangeTokenWithProtection();

      return backendToken;
    } catch (error) {
      // Token exchange can legitimately fail while the account is still syncing
      // (404 USER_NOT_FOUND) or for access reasons (401/403). These are handled by
      // higher-level guards; log at warn level (dev-only) to avoid the dev overlay.
      if (isDev && !this.hasHttpStatus(error)) {
        console.warn('[BackendAuthTokenProvider] Network error while resolving backend token');
      }
      // NIE zwracaj Clerk token - backend go nie akceptuje!
      return null;
    }
  }

  /**
   * Sprawdza czy błąd niesie status HTTP (czyli to obsłużona odpowiedź backendu,
   * a nie nieoczekiwany błąd sieci)
   */
  private hasHttpStatus(error: unknown): boolean {
    return typeof (error as TokenExchangeError)?.status === 'number';
  }

  /**
   * Wymiana tokenu z ochroną przed race conditions
   * Jeśli wymiana już trwa, czeka na jej zakończenie
   */
  private async exchangeTokenWithProtection(): Promise<string | null> {
    // Race condition protection - jeśli wymiana już trwa, czekaj na nią
    if (this.isExchanging && this.exchangePromise) {
      return this.exchangePromise;
    }

    // Ustaw flagę i rozpocznij wymianę
    this.isExchanging = true;
    this.exchangePromise = this.performTokenExchange();

    try {
      const token = await this.exchangePromise;
      return token;
    } finally {
      // Reset flagi po zakończeniu (sukces lub błąd)
      this.isExchanging = false;
      this.exchangePromise = null;
    }
  }

  /**
   * Wykonuje faktyczną wymianę tokenu
   * Obsługuje retry i cache
   */
  private async performTokenExchange(): Promise<string | null> {
    try {
      // Pobierz Clerk token
      const clerkToken = await this.getClerkTokenFn();

      if (!clerkToken) {
        return null;
      }

      // Wymień na backend token (z retry)
      const backendToken = await this.exchangeWithRetry(clerkToken);

      if (backendToken) {
        // Pacjent nie ma dostępu do panelu webowego — nie cache'uj ani nie zwracaj tokenu.
        // Backend powinien zwrócić 403, ale to dodatkowa warstwa, gdyby wydał token role=patient.
        if (isPatientToken(backendToken)) {
          clearBackendToken();
          return null;
        }

        // Cache'uj backend token
        saveBackendToken(backendToken);
        return backendToken;
      }

      return null;
    } catch (error) {
      // Expected flow-control errors (account still syncing / access denied) carry an
      // HTTP status and are handled upstream. Only log unexpected network failures.
      if (isDev && !this.hasHttpStatus(error)) {
        console.warn('[BackendAuthTokenProvider] Network error during token exchange');
      }

      // Wyczyść cache jeśli błąd (może być invalid token)
      clearBackendToken();

      throw error;
    }
  }

  /**
   * Wymiana tokenu z retry logic
   * Próbuje 2 razy (initial + 1 retry) przy network errors
   */
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

      // Sprawdź czy to network error i czy możemy retry
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
      const canRetry = retryCount < MAX_RETRIES && isNetworkError;

      if (canRetry) {
        await this.sleep(1000); // 1 sekunda delay przed retry
        return this.exchangeWithRetry(clerkToken, retryCount + 1);
      }

      if (statusCode === 403 && errorCode === 'PATIENT_NOT_ALLOWED_ON_ADMIN') {
        clearBackendToken();
      }

      // 401 = token invalid/expired - wyczyść cache
      if (errorMessage.includes('401') || statusCode === 401) {
        clearBackendToken();
      }

      // Nie udało się - rzuć error dalej
      throw error;
    }
  }

  /**
   * Helper - sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Publiczna metoda do wymuszenia refresh tokenu
   * Używana np. przy zmianie organizacji
   */
  refreshToken(): void {
    clearBackendToken();
  }
}
