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
// After a failed ask (no credits, provider down) the rest of the session does not ask again on every pause.
let unavailable = false;

export interface NameSuggestions {
  /** `loading`: AI is asked for this text; `ready`: `names` hold its answer (may be empty). */
  readonly status: 'idle' | 'loading' | 'ready';
  readonly names: readonly string[];
}

const IDLE: NameSuggestions = { status: 'idle', names: [] };

/**
 * „Czy chodziło Ci o”: once the therapist stops typing a name (`NAME_SUGGESTIONS_DELAY_MS`), AI proposes
 * up to three full exercise names. Asked only with the chat's AI on, from `NAME_SUGGESTIONS_MIN_LENGTH`
 * characters, once per text.
 */
export function useNameSuggestions(query: string, enabled: boolean): NameSuggestions {
  const key = nameSuggestionsKey(query);
  const eligible = enabled && !unavailable && key.length >= NAME_SUGGESTIONS_MIN_LENGTH;
  const [result, setResult] = useState<{ key: string; variants: readonly { name: string }[] } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible || answered.has(key)) return undefined;
    let current = true;
    const timer = window.setTimeout(() => {
      setAsking(key);
      void aiService.suggestExerciseVariants(query).then((variants) => {
        if (variants === null) unavailable = true;
        else answered.set(key, variants);
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
