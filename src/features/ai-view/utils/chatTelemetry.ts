import { getBackendToken } from '@/lib/tokenCache';
import type { FeedbackType } from '@/types/feedback.types';

export type ChatRatingValue = 'super' | 'ok' | 'bad';
export type ChatFeedbackSurface = 'inline_message' | 'session_modal';
export type ChatFeedbackReasonTag =
  | 'clinical_mismatch'
  | 'ignored_constraint'
  | 'too_slow'
  | 'data_error'
  | 'missing_feature'
  | 'unclear_ui';

export type ChatClientAnomalyCode =
  | 'deadlock_homonym_fallback'
  | 'anomaly_duration_jump'
  | 'anomaly_credit_mismatch'
  | 'ux_stop_or_repeat_loop';

export interface ChatFeedbackReasonOption {
  readonly code: ChatFeedbackReasonTag;
  readonly label: string;
}

/** 5 szybkich tagów przyczyny dla oceny Źle / komentarza (SPEC-074). */
export const CHAT_RATING_REASON_OPTIONS: readonly ChatFeedbackReasonOption[] = [
  { code: 'clinical_mismatch', label: 'Zły dobór ćwiczeń / przeciwwskazania' },
  { code: 'ignored_constraint', label: 'Zignorowany warunek (czas / sprzęt / pacjent)' },
  { code: 'too_slow', label: 'Zbyt długie oczekiwanie' },
  { code: 'data_error', label: 'Błąd danych lub niejasny interfejs' },
  { code: 'missing_feature', label: 'Brakuje funkcji, której potrzebuję' },
];

export const MAX_CHAT_FEEDBACK_COMMENT_LENGTH = 1000;
export const RATING_THROTTLE_STORAGE_KEY = 'fiziyo-chat-rating-throttle:v1';
export const RATING_INITIAL_ALWAYS_COUNT = 5;
export const RATING_REPEAT_CADENCE = 3;

export interface ChatFeedbackPayload {
  sessionId: string;
  turnIndex: number;
  surface: ChatFeedbackSurface;
  rating: ChatRatingValue;
  reasonTags?: ChatFeedbackReasonTag[];
  comment?: string;
  component?: string;
  latencyMs?: number;
  creditsUsed?: number;
  escalatedToFullReport?: boolean;
}

export interface ChatClientAnomalyPayload {
  code: ChatClientAnomalyCode;
  sessionId?: string;
  component?: string;
  latencyMs?: number;
  metadata?: Record<string, number | boolean>;
}

export interface FeedbackEscalationDraft {
  initialType: FeedbackType;
  initialDescription: string;
}

export interface RatingThrottleState {
  completedCount: number;
  countedConversationIds: string[];
  shownConversationIds: string[];
  lastShownAtCompletedCount: number;
}

const DEFAULT_THROTTLE_STATE: RatingThrottleState = {
  completedCount: 0,
  countedConversationIds: [],
  shownConversationIds: [],
  lastShownAtCompletedCount: 0,
};

const MAX_REMEMBERED_CONVERSATIONS = 50;

function getStorage(storage?: Pick<Storage, 'getItem' | 'setItem'>): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRatingThrottleState(storage?: Pick<Storage, 'getItem' | 'setItem'>): RatingThrottleState {
  const target = getStorage(storage);
  if (!target) return { ...DEFAULT_THROTTLE_STATE };
  try {
    const raw = target.getItem(RATING_THROTTLE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THROTTLE_STATE };
    const parsed = JSON.parse(raw) as Partial<RatingThrottleState>;
    return {
      completedCount: typeof parsed.completedCount === 'number' && parsed.completedCount >= 0 ? parsed.completedCount : 0,
      countedConversationIds: Array.isArray(parsed.countedConversationIds)
        ? parsed.countedConversationIds.filter((id): id is string => typeof id === 'string')
        : [],
      shownConversationIds: Array.isArray(parsed.shownConversationIds)
        ? parsed.shownConversationIds.filter((id): id is string => typeof id === 'string')
        : [],
      lastShownAtCompletedCount:
        typeof parsed.lastShownAtCompletedCount === 'number' && parsed.lastShownAtCompletedCount >= 0
          ? parsed.lastShownAtCompletedCount
          : 0,
    };
  } catch {
    return { ...DEFAULT_THROTTLE_STATE };
  }
}

function writeRatingThrottleState(state: RatingThrottleState, storage?: Pick<Storage, 'getItem' | 'setItem'>): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.setItem(
      RATING_THROTTLE_STORAGE_KEY,
      JSON.stringify({
        completedCount: state.completedCount,
        countedConversationIds: state.countedConversationIds.slice(-MAX_REMEMBERED_CONVERSATIONS),
        shownConversationIds: state.shownConversationIds.slice(-MAX_REMEMBERED_CONVERSATIONS),
        lastShownAtCompletedCount: state.lastShownAtCompletedCount,
      })
    );
  } catch {
    // Brak dostępu do localStorage nie może blokować czatu.
  }
}

/**
 * Zlicza ukończoną rozmowę raz dla danego `conversationId` i sprawdza reguły anty-spamowe (SPEC-074):
 * - najwyżej raz na rozmowę,
 * - zawsze dla pierwszych 5 ukończonych rozmów nowego użytkownika,
 * - później nie częściej niż co 3. ukończoną rozmowę.
 */
export function evaluateSessionRatingEligibility(
  conversationId: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): { eligible: boolean; state: RatingThrottleState } {
  const state = readRatingThrottleState(storage);
  if (state.shownConversationIds.includes(conversationId)) {
    return { eligible: false, state };
  }

  let nextState = state;
  if (!state.countedConversationIds.includes(conversationId)) {
    nextState = {
      ...state,
      completedCount: state.completedCount + 1,
      countedConversationIds: [...state.countedConversationIds, conversationId],
    };
    writeRatingThrottleState(nextState, storage);
  }

  const eligible =
    nextState.completedCount <= RATING_INITIAL_ALWAYS_COUNT ||
    nextState.completedCount - nextState.lastShownAtCompletedCount >= RATING_REPEAT_CADENCE;

  return { eligible, state: nextState };
}

export function markSessionRatingShown(
  conversationId: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): void {
  const state = readRatingThrottleState(storage);
  if (state.shownConversationIds.includes(conversationId)) return;
  writeRatingThrottleState(
    {
      ...state,
      shownConversationIds: [...state.shownConversationIds, conversationId],
      lastShownAtCompletedCount: state.completedCount,
    },
    storage
  );
}

/** Buduje prefill do pełnego FeedbackDialog na podstawie wybranych tagów i uwagi (zero danych pacjenta). */
export function buildFeedbackEscalation(
  tags: readonly ChatFeedbackReasonTag[],
  comment: string,
  component?: string
): FeedbackEscalationDraft {
  const initialType: FeedbackType = tags.includes('missing_feature') ? 'suggestion' : 'bug';
  const labels = tags
    .map((code) => CHAT_RATING_REASON_OPTIONS.find((opt) => opt.code === code)?.label ?? code)
    .filter(Boolean);

  const lines: string[] = ['[Ocena Fizjoasystenta]'];
  if (component) lines.push(`Karta: ${component}`);
  if (labels.length > 0) lines.push(`Powód: ${labels.join(', ')}`);
  const trimmed = comment.trim();
  if (trimmed) lines.push(`Uwaga: ${trimmed}`);
  if (lines.length === 1) lines.push('Szczegóły zgłoszenia dotyczącego odpowiedzi Asystenta:');

  return { initialType, initialDescription: lines.join('\n') };
}

/** Detektor kliencki: skok czasu zestawu o > 25% względem czasu bazowego przy tej samej liczbie ćwiczeń. */
export function detectDurationJump(
  baseMinutes: number,
  currentMinutes: number,
  sameExerciseCount: boolean
): boolean {
  if (!sameExerciseCount || baseMinutes <= 0 || currentMinutes < 0) return false;
  return Math.abs(currentMinutes - baseMinutes) / baseMinutes > 0.25;
}

/** Detektor kliencki: rozjazd między spadkiem salda kredytów w sidebarze a `creditsUsed` odpowiedzi. */
export function detectCreditMismatch(
  previousRemaining: number,
  currentRemaining: number,
  reportedCreditsUsed: number
): boolean {
  if (reportedCreditsUsed < 0 || previousRemaining < 0 || currentRemaining < 0) return false;
  const actualDelta = previousRemaining - currentRemaining;
  if (actualDelta < 0) return false; // doładowanie kredytów w międzyczasie
  return actualDelta !== reportedCreditsUsed;
}

export interface CreditCheckState {
  conversationId?: string;
  /** Saldo, gdy żadna płatna odpowiedź nie czeka na odświeżenie. */
  settledRemaining?: number;
  lastMessageId?: string;
  pending?: { creditsUsed: number; before: number };
}

export interface CreditCheckInput {
  conversationId: string;
  remaining: number | undefined;
  lastAssistant?: { id: string; source: string; creditsUsed: number };
}

export interface CreditCheckStep {
  state: CreditCheckState;
  mismatch?: { reported: number; delta: number };
}

/**
 * Krok detektora `anomaly_credit_mismatch`. Odpowiedź trafia do wątku, zanim wróci refetch salda,
 * więc porównanie czeka na pierwszą zmianę salda po płatnej odpowiedzi. Zmiana rozmowy (także
 * otwarcie z historii) traktuje jej ostatnią odpowiedź jako już rozliczoną.
 */
export function stepCreditMismatchCheck(state: CreditCheckState, input: CreditCheckInput): CreditCheckStep {
  const { conversationId, remaining, lastAssistant } = input;
  if (state.conversationId !== conversationId) {
    return { state: { conversationId, settledRemaining: remaining, lastMessageId: lastAssistant?.id } };
  }

  let next = state;
  if (lastAssistant && lastAssistant.id !== state.lastMessageId) {
    const paid = lastAssistant.source === 'ai' && lastAssistant.creditsUsed > 0;
    next = {
      ...state,
      lastMessageId: lastAssistant.id,
      pending:
        paid && state.settledRemaining !== undefined
          ? { creditsUsed: lastAssistant.creditsUsed, before: state.settledRemaining }
          : undefined,
    };
  }

  if (remaining === undefined) return { state: next };
  if (!next.pending) return { state: { ...next, settledRemaining: remaining } };
  if (remaining === next.pending.before) return { state: next }; // saldo jeszcze nieodświeżone

  const { before, creditsUsed } = next.pending;
  const settled: CreditCheckState = { ...next, pending: undefined, settledRemaining: remaining };
  return detectCreditMismatch(before, remaining, creditsUsed)
    ? { state: settled, mismatch: { reported: creditsUsed, delta: before - remaining } }
    : { state: settled };
}

/** Detektor kliencki: powtórzona wiadomość użytkownika wysłana w oknie < 60 s. */
export function isRepeatedPromptWithinWindow(
  previousText: string | undefined,
  currentText: string,
  elapsedMs: number,
  windowMs = 60_000
): boolean {
  if (!previousText || elapsedMs < 0 || elapsedMs >= windowMs) return false;
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  const prev = normalize(previousText);
  const curr = normalize(currentText);
  return prev.length > 0 && prev === curr;
}

function sanitizeNumericMetadata(
  metadata?: Record<string, number | boolean>
): Record<string, number | boolean> | undefined {
  if (!metadata) return undefined;
  const clean: Record<string, number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

/** Wysyła ocenę odpowiedzi/sesji do `POST /api/chat/feedback` bez blokowania interfejsu. */
export async function submitChatFeedback(payload: ChatFeedbackPayload): Promise<boolean> {
  const token = getBackendToken();
  if (!token) return false;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/chat/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId: payload.sessionId,
        turnIndex: payload.turnIndex,
        surface: payload.surface,
        rating: payload.rating,
        reasonTags: payload.reasonTags,
        comment: payload.comment?.trim().slice(0, MAX_CHAT_FEEDBACK_COMMENT_LENGTH) || undefined,
        component: payload.component,
        latencyMs: payload.latencyMs,
        creditsUsed: payload.creditsUsed,
        escalatedToFullReport: payload.escalatedToFullReport ?? false,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Wysyła bez-PII beacon anomalii UX do `POST /api/chat/telemetry-anomaly` (`keepalive: true`). */
export function sendChatAnomalyBeacon(payload: ChatClientAnomalyPayload): void {
  const token = getBackendToken();
  if (!token) return;
  const body = JSON.stringify({
    code: payload.code,
    sessionId: payload.sessionId,
    component: payload.component,
    latencyMs: payload.latencyMs,
    metadata: sanitizeNumericMetadata(payload.metadata),
  });
  void fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/chat/telemetry-anomaly`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
