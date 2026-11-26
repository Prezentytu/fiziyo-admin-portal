'use client';

import { useEffect, useState } from 'react';

import { aiService } from '@/services/aiService';
import {
  NAME_SUGGESTIONS_DELAY_MS,
  NAME_SUGGESTIONS_MIN_LENGTH,
  nameSuggestionsKey,
  suggestedNames,
} from '../utils/nameSuggestions';

// One answer per text for the whole page session: typing the same name again costs no second credit.
const answered = new Map<string, readonly { name: string }[]>();
// An ask still on its way: a second card (search → „Utwórz”) waits for it instead of paying again.
const pending = new Map<string, Promise<readonly { name: string }[] | null>>();
// After a failed ask (no credits, provider down) the rest of the session does not ask again on every pause.
let unavailable = false;

/**
 * A name picked from „Czy chodziło Ci o” is itself an AI answer: it keeps the other names of that answer
 * and asks no second time (no second credit for a text AI wrote).
 */
export function rememberPickedName(name: string, names: readonly string[]): void {
  answered.set(
    nameSuggestionsKey(name),
    names.map((candidate) => ({ name: candidate }))
  );
}

export interface NameSuggestions {
  /** `loading`: AI is asked for this text; `ready`: `names` hold its answer (may be empty). */
  readonly status: 'idle' | 'loading' | 'ready';
  readonly names: readonly string[];
}

const IDLE: NameSuggestions = { status: 'idle', names: [] };

/**
 * „Czy chodziło Ci o”: once the therapist stops typing a name (`NAME_SUGGESTIONS_DELAY_MS`), AI proposes
 * up to three full exercise names. Asked only with the chat's AI on, from `NAME_SUGGESTIONS_MIN_LENGTH`
 * characters, once per text, and only for a text typed in this card: a card that opens with a name
 * (from the search, or restored after a reload) shows an answer it already has and pays for nothing.
 */
export function useNameSuggestions(query: string, enabled: boolean): NameSuggestions {
  const key = nameSuggestionsKey(query);
  const [openedWith] = useState(key);
  const known = answered.has(key) || pending.has(key);
  const eligible =
    enabled && !unavailable && key.length >= NAME_SUGGESTIONS_MIN_LENGTH && (key !== openedWith || known);
  const [result, setResult] = useState<{ key: string; variants: readonly { name: string }[] } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible || answered.has(key)) return undefined;
    let current = true;
    const timer = window.setTimeout(() => {
      setAsking(key);
      let ask = pending.get(key);
      if (!ask) {
        ask = aiService.suggestExerciseVariants(query).then((variants) => {
          pending.delete(key);
          if (variants === null) unavailable = true;
          else answered.set(key, variants);
          return variants;
        });
        pending.set(key, ask);
      }
      void ask.then((variants) => {
        if (!current) return;
        setAsking(null);
        setResult({ key, variants: variants ?? [] });
      });
    }, NAME_SUGGESTIONS_DELAY_MS);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
    // query is read once the timer fires; the key decides when to ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, key]);

  if (!eligible) return IDLE;
  const variants = answered.get(key) ?? (result?.key === key ? result.variants : undefined);
  if (variants) return { status: 'ready', names: suggestedNames(variants, query) };
  return asking === key ? { status: 'loading', names: [] } : IDLE;
}
