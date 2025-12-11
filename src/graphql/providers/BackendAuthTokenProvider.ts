import { IAuthTokenProvider } from "../links/authLink";
import { tokenExchangeService } from "@/services/tokenExchangeService";
import {
  getBackendToken,
  saveBackendToken,
  clearBackendToken,
} from "@/lib/tokenCache";

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
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.error(
        "[BackendAuthTokenProvider] Błąd dekodowania tokena:",
        error
      );
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
    return (
      (payload.clerk_id as string) ||
      (payload.ClerkId as string) ||
      (payload.sub as string) ||
      null
    );
  }

  /**
   * Sprawdza czy cached token należy do aktualnego użytkownika Clerk
   * @param cachedToken - Backend JWT z cache
   * @param clerkToken - Aktualny Clerk JWT
   * @returns true jeśli tokeny należą do tego samego użytkownika
   */
  private isTokenForCurrentUser(
    cachedToken: string,
    clerkToken: string
  ): boolean {
    const cachedClerkId = this.getClerkIdFromToken(cachedToken);
    const currentClerkId = this.getClerkIdFromToken(clerkToken);

    if (!cachedClerkId || !currentClerkId) {
      console.warn(
        "[BackendAuthTokenProvider] ⚠️ Nie można porównać ClerkId - wymuszam refresh"
      );
      return false;
    }

    const isSameUser = cachedClerkId === currentClerkId;

    if (!isSameUser) {
      console.log(
        `[BackendAuthTokenProvider] 🔄 Zmiana użytkownika wykryta: ${cachedClerkId} → ${currentClerkId}`
      );
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
        console.warn(
          "[BackendAuthTokenProvider] Brak Clerk token - użytkownik niezalogowany"
        );
        // Wyczyść cache na wszelki wypadek
        clearBackendToken();
        return null;
      }

      // KROK 1: Sprawdź cache
      const cachedToken = getBackendToken();
      if (cachedToken) {
        // KRYTYCZNE: Sprawdź czy cached token należy do AKTUALNEGO użytkownika
        const isForCurrentUser = this.isTokenForCurrentUser(
          cachedToken,
          clerkToken
        );

        if (!isForCurrentUser) {
          console.log(
            "[BackendAuthTokenProvider] 🔄 Token należy do innego użytkownika - wymuszam wymianę"
          );
          clearBackendToken();
          // Kontynuuj do wymiany tokenu
        } else if (!this.isTokenExpired(cachedToken)) {
          // Token należy do aktualnego użytkownika i nie wygasł
          return cachedToken;
        } else {
          // Token wygasł - wyczyść cache
          console.log(
            "[BackendAuthTokenProvider] ⏰ Token wygasł - wymuszam wymianę"
          );
          clearBackendToken();
        }
      }

      // KROK 2: Brak w cache lub wygasł/inny user - wymień Clerk token na backend token
      const backendToken = await this.exchangeTokenWithProtection();

      return backendToken;
    } catch (error) {
      console.error("[BackendAuthTokenProvider] ❌ Krytyczny błąd:", error);
      // NIE zwracaj Clerk token - backend go nie akceptuje!
      return null;
    }
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
        console.warn(
          "[BackendAuthTokenProvider] Brak Clerk token - użytkownik niezalogowany"
        );
        return null;
      }

      // Wymień na backend token (z retry)
      const backendToken = await this.exchangeWithRetry(clerkToken);

      if (backendToken) {
        // Cache'uj backend token
        saveBackendToken(backendToken);
        return backendToken;
      }

      console.warn(
        "[BackendAuthTokenProvider] ⚠️ Nie udało się wymienić tokenu"
      );
      return null;
    } catch (error) {
      console.error("[BackendAuthTokenProvider] ❌ Błąd wymiany tokenu:", error);

      // Wyczyść cache jeśli błąd (może być invalid token)
      clearBackendToken();

      throw error;
    }
  }

  /**
   * Wymiana tokenu z retry logic
   * Próbuje 2 razy (initial + 1 retry) przy network errors
   */
  private async exchangeWithRetry(
    clerkToken: string,
    retryCount: number = 0
  ): Promise<string | null> {
    const MAX_RETRIES = 1;

    try {
      const response =
        await tokenExchangeService.exchangeClerkToken(clerkToken);
      return response.access_token;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Sprawdź czy to network error i czy możemy retry
      const isNetworkError =
        errorMessage.includes("fetch") || errorMessage.includes("network");
      const canRetry = retryCount < MAX_RETRIES && isNetworkError;

      if (canRetry) {
        console.warn(
          `[BackendAuthTokenProvider] Network error - retry ${retryCount + 1}/${MAX_RETRIES}`
        );
        await this.sleep(1000); // 1 sekunda delay przed retry
        return this.exchangeWithRetry(clerkToken, retryCount + 1);
      }

      // 401 = token invalid/expired - wyczyść cache
      if (errorMessage.includes("401")) {
        console.warn(
          "[BackendAuthTokenProvider] 401 - token invalid, czyszczę cache"
        );
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




