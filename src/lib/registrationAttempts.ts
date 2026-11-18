/**
 * Telemetria kroków rejestracji (kontrakt: fizjo-app docs/rejestracje-telemetria-kontrakt.md, sekcja 1).
 * Wystrzel i zapomnij: nie blokuje UI, połyka błędy, nic nie loguje.
 */

export type RegistrationStep =
  'code_sent' | 'code_resent' | 'code_error' | 'code_verified' | 'finalizing_timeout' | 'completed';

export type RegistrationAccountKind = 'patient' | 'company' | 'therapist';

export interface RegistrationStepReport {
  signUpId: string | null | undefined;
  step: RegistrationStep;
  accountKind?: RegistrationAccountKind | null;
  email?: string | null;
}

interface RememberedAttempt {
  signUpId: string;
  accountKind: RegistrationAccountKind | null;
}

const TIMEOUT_MS = 5000;
const SIGN_UP_ID_PATTERN = /^sua_[A-Za-z0-9]{10,64}$/;
const STORAGE_KEY = 'REGISTRATION_ATTEMPT';

export function reportRegistrationStep({
  signUpId,
  step,
  accountKind = null,
  email = null,
}: RegistrationStepReport): void {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!signUpId || !SIGN_UP_ID_PATTERN.test(signUpId) || !apiUrl || typeof fetch !== 'function') {
    return;
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

  try {
    fetch(`${apiUrl}/api/registration-attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signUpId, step, platform: 'web', accountKind, email }),
      keepalive: true,
      signal: controller?.signal,
    })
      .catch(() => undefined)
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
  } catch {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Zapamiętuje próbę po weryfikacji kodu, żeby ekran finalizacji mógł zgłosić dalsze kroki. */
export function rememberRegistrationAttempt(attempt: RememberedAttempt): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // brak sessionStorage: finalizacja po prostu nie zgłosi kroków
  }
}

export function getRememberedRegistrationAttempt(): RememberedAttempt | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedAttempt>;
    return typeof parsed.signUpId === 'string'
      ? { signUpId: parsed.signUpId, accountKind: parsed.accountKind ?? null }
      : null;
  } catch {
    return null;
  }
}

export function forgetRegistrationAttempt(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // nic do zrobienia
  }
}
