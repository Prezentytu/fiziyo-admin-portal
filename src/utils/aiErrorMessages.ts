/**
 * Mapowanie odpowiedzi błędu z `/api/ai/*` na komunikat dla fizjoterapeuty.
 *
 * Backend (`AICreditsService`) daje każdej organizacji jedną miesięczną pulę kredytów AI
 * i odnawia ją pierwszego dnia następnego miesiąca (UTC). Gdy pula się wyczerpie, endpoint
 * zwraca 400 z `error: "insufficient_credits"`. Mówimy wtedy prawdę: pula się skończyła
 * i kiedy wróci, zamiast sugerować chwilową awarię.
 */

import { polishPlural } from './polishPlural';

export type AiErrorKind = 'insufficient_credits' | 'provider_failure' | 'forbidden';

export interface AiErrorMapping {
  kind: AiErrorKind;
  /** Kod błędu z backendu (np. `insufficient_credits`, `ai_provider_failure`). */
  code: string;
  message: string;
}

const PROVIDER_FAILURE_FALLBACK = 'Asystent AI jest chwilowo niedostępny. Spróbuj ponownie.';

/**
 * `AIController.CheckAndUseCredits` wpuszcza tylko personel aktywnego gabinetu (właściciel, admin,
 * fizjoterapeuta, personel). Inna rola albo token bez gabinetu dostaje 403 `forbidden`; ponowienie nic nie da.
 */
export const AI_FORBIDDEN_MESSAGE =
  'Asystent AI jest dostępny dla personelu gabinetu. Poproś właściciela gabinetu o dostęp.';

/** Pierwszy dzień następnego miesiąca w UTC, tak jak `AICreditsService.GetNextResetDate`. */
export function nextAiCreditsResetDate(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** „1 grudnia” z twardą spacją, żeby dzień nie odklejał się od miesiąca przy zawijaniu. */
function formatResetLabel(now: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Warsaw',
  })
    .format(nextAiCreditsResetDate(now))
    .replace(/\s/g, '\u00a0');
}

function creditsLabel(count: number): string {
  return `${count}\u00a0${polishPlural(count, 'kredytu', 'kredytów', 'kredytów')}`;
}

function remainingLabel(count: number): string {
  return `${polishPlural(count, 'został', 'zostały', 'zostało')} ${count}`;
}

/**
 * Backend odmawia, gdy w puli zostało mniej kredytów niż kosztuje akcja (obraz 5, wzbogacenie 3,
 * zestaw 2, reszta 1). Pula jest pusta tylko przy `remaining <= 0`; inaczej mówimy, ile brakuje.
 */
export function insufficientAiCreditsMessage(
  now: Date,
  credits: { remaining?: number; required?: number } = {}
): string {
  const resetLabel = formatResetLabel(now);
  const { remaining, required } = credits;
  if (remaining !== undefined && remaining > 0 && required !== undefined) {
    return `Ta akcja wymaga ${creditsLabel(required)} AI, w puli gabinetu ${remainingLabel(remaining)}. Pula odnowi się ${resetLabel}.`;
  }
  return `Miesięczna pula kredytów AI gabinetu się wyczerpała. Odnowi się ${resetLabel}.`;
}

interface AiErrorBody {
  error?: string;
  message?: string;
  remaining?: number;
  required?: number;
}

function parseErrorBody(bodyText: string): AiErrorBody | null {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { error, message, remaining, required } = parsed as Record<string, unknown>;
    return {
      error: typeof error === 'string' ? error : undefined,
      message: typeof message === 'string' ? message : undefined,
      remaining: typeof remaining === 'number' ? remaining : undefined,
      required: typeof required === 'number' ? required : undefined,
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
    return { kind: 'insufficient_credits', code: body.error, message: insufficientAiCreditsMessage(now, body) };
  }

  if (status === 403 && body.error === 'forbidden') {
    return { kind: 'forbidden', code: body.error, message: AI_FORBIDDEN_MESSAGE };
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
