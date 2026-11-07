/**
 * Mapowanie odpowiedzi błędu z `/api/ai/*` na komunikat dla fizjoterapeuty.
 *
 * Backend (`AICreditsService`) daje każdej organizacji jedną miesięczną pulę kredytów AI
 * i odnawia ją pierwszego dnia następnego miesiąca (UTC). Gdy pula się wyczerpie, endpoint
 * zwraca 400 z `error: "insufficient_credits"`. Mówimy wtedy prawdę: pula się skończyła
 * i kiedy wróci, zamiast sugerować chwilową awarię.
 */

export type AiErrorKind = 'insufficient_credits' | 'provider_failure';

export interface AiErrorMapping {
  kind: AiErrorKind;
  /** Kod błędu z backendu (np. `insufficient_credits`, `ai_provider_failure`). */
  code: string;
  message: string;
}

const PROVIDER_FAILURE_FALLBACK = 'Asystent AI jest chwilowo niedostępny. Spróbuj ponownie.';

/** Pierwszy dzień następnego miesiąca w UTC, tak jak `AICreditsService.GetNextResetDate`. */
export function nextAiCreditsResetDate(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function insufficientAiCreditsMessage(now: Date): string {
  const resetLabel = new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(nextAiCreditsResetDate(now));
  return `Miesięczna pula kredytów AI gabinetu się wyczerpała. Odnowi się ${resetLabel}.`;
}

function parseErrorBody(bodyText: string): { error?: string; message?: string } | null {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { error, message } = parsed as Record<string, unknown>;
    return {
      error: typeof error === 'string' ? error : undefined,
      message: typeof message === 'string' ? message : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Zwraca komunikat dla znanego błędu AI albo `null`, gdy błąd nie jest rozpoznany
 * (wtedy wołający rzuca ogólny błąd).
 */
export function mapAiErrorResponse(status: number, bodyText: string, now: Date = new Date()): AiErrorMapping | null {
  const body = parseErrorBody(bodyText);
  if (!body) return null;

  if ((status === 400 || status === 402 || status === 403) && body.error === 'insufficient_credits') {
    return { kind: 'insufficient_credits', code: body.error, message: insufficientAiCreditsMessage(now) };
  }

  if (status === 502 && (body.message || body.error)) {
    return {
      kind: 'provider_failure',
      code: body.error ?? 'provider_unavailable',
      message: body.message ?? PROVIDER_FAILURE_FALLBACK,
    };
  }

  return null;
}
