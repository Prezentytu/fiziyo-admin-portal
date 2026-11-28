import { describe, expect, it } from 'vitest';

import {
  buildFeedbackEscalation,
  detectCreditMismatch,
  detectDurationJump,
  evaluateSessionRatingEligibility,
  isRepeatedPromptWithinWindow,
  markSessionRatingShown,
  stepCreditMismatchCheck,
} from '../chatTelemetry';

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

describe('chatTelemetry detectors and rating throttling (SPEC-074)', () => {
  it('detects > 25% duration jump at the same exercise count', () => {
    expect(detectDurationJump(10, 14, true)).toBe(true); // +40%
    expect(detectDurationJump(10, 7, true)).toBe(true); // -30%
    expect(detectDurationJump(10, 12, true)).toBe(false); // +20%
    expect(detectDurationJump(10, 16, false)).toBe(false); // different count
    expect(detectDurationJump(0, 10, true)).toBe(false);
  });

  it('detects credit balance mismatch against reported creditsUsed', () => {
    expect(detectCreditMismatch(50, 48, 1)).toBe(true); // dropped by 2 instead of 1
    expect(detectCreditMismatch(50, 49, 1)).toBe(false); // matches
    expect(detectCreditMismatch(50, 70, 1)).toBe(false); // credits refilled
  });

  it('compares credits only after the balance refreshes, not when the paid reply lands', () => {
    const paid = { id: 'a1', source: 'ai', creditsUsed: 1 };
    let step = stepCreditMismatchCheck({}, { conversationId: 'c1', remaining: 50 });

    // Odpowiedź trafia do wątku, refetch salda jeszcze nie wrócił.
    step = stepCreditMismatchCheck(step.state, { conversationId: 'c1', remaining: 50, lastAssistant: paid });
    expect(step.mismatch).toBeUndefined();

    // Refetch wraca z poprawnym saldem.
    step = stepCreditMismatchCheck(step.state, { conversationId: 'c1', remaining: 49, lastAssistant: paid });
    expect(step.mismatch).toBeUndefined();

    // Kolejna płatna odpowiedź, saldo spada o 2 zamiast o 1.
    const next = { id: 'a2', source: 'ai', creditsUsed: 1 };
    step = stepCreditMismatchCheck(step.state, { conversationId: 'c1', remaining: 49, lastAssistant: next });
    expect(step.mismatch).toBeUndefined();
    step = stepCreditMismatchCheck(step.state, { conversationId: 'c1', remaining: 47, lastAssistant: next });
    expect(step.mismatch).toEqual({ reported: 1, delta: 2 });
  });

  it('treats the last paid reply of a conversation opened from history as already settled', () => {
    const paid = { id: 'a1', source: 'ai', creditsUsed: 1 };
    let step = stepCreditMismatchCheck({}, { conversationId: 'c1', remaining: 50 });
    step = stepCreditMismatchCheck(step.state, { conversationId: 'c2', remaining: 50, lastAssistant: paid });
    expect(step.mismatch).toBeUndefined();
    step = stepCreditMismatchCheck(step.state, { conversationId: 'c2', remaining: 48, lastAssistant: paid });
    expect(step.mismatch).toBeUndefined();
  });

  it('detects repeated prompt sent within 60 seconds', () => {
    expect(isRepeatedPromptWithinWindow('Zestaw na kolano', '  zestaw  na KOLANO ', 12_000)).toBe(true);
    expect(isRepeatedPromptWithinWindow('Zestaw na kolano', 'Zestaw na kolano', 61_000)).toBe(false);
    expect(isRepeatedPromptWithinWindow('Zestaw na kolano', 'Zestaw na bark', 5_000)).toBe(false);
  });

  it('shows rating always for first 5 conversations, never twice in the same one, then every 3rd', () => {
    const storage = createMemoryStorage();

    // Pierwsze 5 rozmów — zawsze kwalifikują się (raz na rozmowę).
    for (let i = 1; i <= 5; i += 1) {
      const id = `conv-${i}`;
      expect(evaluateSessionRatingEligibility(id, storage).eligible).toBe(true);
      markSessionRatingShown(id, storage);
      expect(evaluateSessionRatingEligibility(id, storage).eligible).toBe(false);
    }

    // Rozmowa 6 i 7 — wyciszone (throttling co 3 rozmowy).
    expect(evaluateSessionRatingEligibility('conv-6', storage).eligible).toBe(false);
    expect(evaluateSessionRatingEligibility('conv-7', storage).eligible).toBe(false);

    // Rozmowa 8 (5 + 3) — znowu się pojawia.
    expect(evaluateSessionRatingEligibility('conv-8', storage).eligible).toBe(true);
    markSessionRatingShown('conv-8', storage);
    expect(evaluateSessionRatingEligibility('conv-8', storage).eligible).toBe(false);

    // Rozmowa 9 i 10 wyciszone, 11 znowu aktywna.
    expect(evaluateSessionRatingEligibility('conv-9', storage).eligible).toBe(false);
    expect(evaluateSessionRatingEligibility('conv-10', storage).eligible).toBe(false);
    expect(evaluateSessionRatingEligibility('conv-11', storage).eligible).toBe(true);
  });

  it('maps missing_feature tag to suggestion and others to bug in escalation prefill', () => {
    const suggestion = buildFeedbackEscalation(['missing_feature'], 'Brakuje wysyłki SMS', 'Message');
    expect(suggestion.initialType).toBe('suggestion');
    expect(suggestion.initialDescription).toContain('Brakuje funkcji, której potrzebuję');
    expect(suggestion.initialDescription).toContain('Brakuje wysyłki SMS');

    const bug = buildFeedbackEscalation(['ignored_constraint', 'too_slow'], '50 sekund i odrzucił krzesło', 'SetDraft');
    expect(bug.initialType).toBe('bug');
    expect(bug.initialDescription).toContain('Karta: SetDraft');
    expect(bug.initialDescription).toContain('50 sekund i odrzucił krzesło');
  });
});
