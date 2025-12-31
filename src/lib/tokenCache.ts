/**
 * Cache tokenów JWT backendu dla web (sessionStorage)
 * Odpowiednik SecureStore z aplikacji mobilnej
 */

const BACKEND_JWT_TOKEN_KEY = "BACKEND_JWT_TOKEN";
const isDev = process.env.NODE_ENV === "development";

/**
 * Pobiera token JWT backendu z sessionStorage
 * @returns Backend JWT token lub null jeśli brak
 */
export const getBackendToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return sessionStorage.getItem(BACKEND_JWT_TOKEN_KEY);
  } catch (error) {
    if (isDev) {
      console.error("[TokenCache] Błąd pobierania backend tokenu:", error);
    }
    return null;
  }
};

/**
 * Zapisuje token JWT backendu w sessionStorage
 * @param token - Backend JWT token do zapisania
 */
export const saveBackendToken = (token: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(BACKEND_JWT_TOKEN_KEY, token);
  } catch (error) {
    if (isDev) {
      console.error("[TokenCache] Błąd zapisywania backend tokenu:", error);
    }
    throw error;
  }
};

/**
 * Usuwa token JWT backendu z sessionStorage (np. przy wylogowaniu)
 */
export const clearBackendToken = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(BACKEND_JWT_TOKEN_KEY);
  } catch (error) {
    if (isDev) {
      console.error("[TokenCache] Błąd czyszczenia backend tokenu:", error);
    }
  }
};






