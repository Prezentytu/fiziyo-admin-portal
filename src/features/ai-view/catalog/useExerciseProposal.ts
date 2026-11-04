'use client';

import { useEffect, useRef, useState } from 'react';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { aiService } from '@/services/aiService';
import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';

export interface ExerciseProposal {
  suggestion: ExerciseSuggestionResponse | null;
  enrichment: ExerciseEnrichmentData | null;
}

type ProposalState = { status: 'idle' | 'loading' | 'failed' } | { status: 'ready'; proposal: ExerciseProposal };

const STORAGE_PREFIX = 'fiziyo-chat-exercise-proposal:';

function readStored(messageId: string): ExerciseProposal | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + messageId);
    return raw ? (JSON.parse(raw) as ExerciseProposal) : null;
  } catch {
    return null;
  }
}

function store(messageId: string, proposal: ExerciseProposal): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + messageId, JSON.stringify(proposal));
  } catch {
    // Brak miejsca albo prywatne okno: propozycja zostaje tylko w tej karcie.
  }
}

/**
 * AI proposal for a new exercise in the chat card: parameters, steps and cues. Asked once per
 * card (cached per message, so reopening the conversation does not spend credits again) and only
 * with the chat's AI switched on. The therapist edits and saves it; nothing is written here.
 */
export function useExerciseProposal(input: {
  messageId: string;
  name: string | undefined;
  description: string | undefined;
  enabled: boolean;
}): ProposalState {
  const { messageId, name, description, enabled } = input;
  const [state, setState] = useState<ProposalState>({ status: 'idle' });
  const requested = useRef(false);

  useEffect(() => {
    const exerciseName = name?.trim() ?? '';
    if (!enabled || requested.current || exerciseName.length < 2) return;
    // Jedno zapytanie na kartę, także przy podwójnym efekcie w StrictMode; wynik ląduje w stanie po odmontowaniu bez szkody.
    requested.current = true;

    const stored = readStored(messageId);
    if (stored) {
      setState({ status: 'ready', proposal: stored });
      return;
    }

    setState({ status: 'loading' });
    void Promise.all([
      aiService.getExerciseSuggestion(exerciseName),
      aiService.generateEnrichment({ exerciseName, patientDescription: description?.trim() || undefined }),
    ]).then(([suggestion, enrichmentResponse]) => {
      const enrichment =
        enrichmentResponse?.success && enrichmentResponse.enrichmentData
          ? toV3(enrichmentResponse.enrichmentData)
          : null;
      if (!suggestion && !enrichment) {
        setState({ status: 'failed' });
        return;
      }
      const proposal = { suggestion, enrichment };
      store(messageId, proposal);
      setState({ status: 'ready', proposal });
    });
  }, [description, enabled, messageId, name]);

  return state;
}
