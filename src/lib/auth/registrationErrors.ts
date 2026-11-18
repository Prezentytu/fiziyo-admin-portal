import { parseClerkError } from '@/lib/clerkErrors';

/** Krok formularza rejestracji gabinetu, na którym poprawia się dane pole. */
export type RegistrationStep = 1 | 2 | 3;

export interface RegistrationErrorView {
  /** Prosty polski komunikat; surowy tekst Clerk nigdy nie trafia do użytkownika. */
  message: string;
  /** Link do kroku z polem, które trzeba poprawić; brak = błąd bez pola (limit, sieć). */
  fix?: { step: RegistrationStep; label: string };
}

const FIX_EMAIL = { step: 1, label: 'Zmień adres e-mail' } as const;
const FIX_PASSWORD = { step: 2, label: 'Zmień hasło' } as const;

const REGISTRATION_ERRORS: Record<string, RegistrationErrorView> = {
  form_identifier_exists: {
    message: 'Masz już konto z tym adresem. Zaloguj się albo użyj innego e-maila.',
    fix: FIX_EMAIL,
  },
  form_param_format_invalid: {
    message: 'Sprawdź adres e-mail. Powinien wyglądać tak: nazwa@poczta.pl.',
    fix: FIX_EMAIL,
  },
  form_password_pwned: { message: 'To hasło wyciekło kiedyś w internecie.', fix: FIX_PASSWORD },
  form_password_length_too_short: { message: 'Hasło musi mieć co najmniej 8 znaków.', fix: FIX_PASSWORD },
  form_password_not_strong_enough: {
    message: 'To hasło jest za proste. Dodaj cyfry, wielkie litery albo znaki specjalne.',
    fix: FIX_PASSWORD,
  },
  form_password_validation_failed: { message: 'To hasło nie spełnia wymagań. Wybierz inne.', fix: FIX_PASSWORD },
  too_many_requests: { message: 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.' },
};

const NETWORK_ERROR: RegistrationErrorView = {
  message: 'Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.',
};
const DEFAULT_ERROR: RegistrationErrorView = { message: 'Nie udało się założyć konta. Spróbuj ponownie.' };

/** Tłumaczy błąd Clerk z rejestracji na komunikat i krok do poprawki (decyzja 18.11: zawsze po polsku). */
export function parseRegistrationError(error: unknown): RegistrationErrorView {
  const { code, message } = parseClerkError(error);
  if (code && code in REGISTRATION_ERRORS) return REGISTRATION_ERRORS[code];

  const lower = message.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('network')) return NETWORK_ERROR;
  if (lower.includes('data breach') || lower.includes('pwned')) return REGISTRATION_ERRORS.form_password_pwned;
  if (lower.includes('already exists') || lower.includes('is taken')) return REGISTRATION_ERRORS.form_identifier_exists;
  return DEFAULT_ERROR;
}
