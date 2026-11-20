'use client';

import { useEffect, useRef, useState } from 'react';

import { aiService } from '@/services/aiService';
import { normalizeAiExerciseVariants, type AiExerciseVariant } from '@/features/exercises/utils/aiFullExercise';
import { EXERCISE_IDEAS_KEY_PREFIX as STORAGE_PREFIX } from '../utils/conversationStore';

type IdeasState = { status: 'idle' | 'loading' | 'failed' } | { status: 'ready'; ideas: AiExerciseVariant[] };

function readStored(messageId: string): AiExerciseVariant[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + messageId);
    if (!raw) return null;
    const ideas = normalizeAiExerciseVariants({ variants: JSON.parse(raw) });
    return ideas.length ? ideas : null;
  } catch {
    return null;
  }
}

function store(messageId: string, ideas: AiExerciseVariant[]): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + messageId, JSON.stringify(ideas));
  } catch {
    // Brak miejsca albo prywatne okno: pomysły zostają tylko w tej karcie.
  }
}

/**
 * AI ideas for new exercises that answer the therapist's need. Asked once per card (cached per
 * message) and only with the chat's AI switched on; nothing is written to the catalog here.
 */
export function useExerciseIdeas(input: { messageId: string; query: string; enabled: boolean }): IdeasState {
  const { messageId, query, enabled } = input;
  const [state, setState] = useState<IdeasState>({ status: 'idle' });
  const requested = useRef(false);

  useEffect(() => {
    if (!enabled || requested.current || query.trim().length < 2) return;
    requested.current = true;

    const stored = readStored(messageId);
    if (stored) {
      setState({ status: 'ready', ideas: stored });
      return;
    }

    setState({ status: 'loading' });
    void aiService.suggestExerciseVariants(query).then((ideas) => {
      if (!ideas || ideas.length === 0) {
        setState({ status: 'failed' });
        return;
      }
      store(messageId, ideas);
      setState({ status: 'ready', ideas });
    });
  }, [enabled, messageId, query]);

  return state;
}
