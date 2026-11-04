'use client';

import { useEffect, useRef, useState } from 'react';

import { aiService } from '@/services/aiService';
import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';

/** Only what the card shows: parameters, steps and cues. Other AI sections are not kept or saved. */
export interface ExerciseProposal {
  suggestion: ExerciseSuggestionResponse | null;
  steps: string[];
  cues: string[];
}

type ProposalState = { status: 'idle' | 'loading' | 'failed' } | { status: 'ready'; proposal: ExerciseProposal };

import { EXERCISE_PROPOSAL_KEY_PREFIX as STORAGE_PREFIX } from '../utils/conversationStore';

function readStored(messageId: string): ExerciseProposal | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + messageId);
    const parsed = raw ? (JSON.parse(raw) as Partial<ExerciseProposal>) : null;
    if (!parsed || !Array.isArray(parsed.steps) || !Array.isArray(parsed.cues)) return null;
    return { suggestion: parsed.suggestion ?? null, steps: parsed.steps, cues: parsed.cues };
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
      const patient =
        enrichmentResponse?.success && enrichmentResponse.enrichmentData
          ? toV3(enrichmentResponse.enrichmentData).patient
          : undefined;
      const proposal: ExerciseProposal = { suggestion, steps: patient?.steps ?? [], cues: patient?.cues ?? [] };
      if (!suggestion && proposal.steps.length === 0 && proposal.cues.length === 0) {
        setState({ status: 'failed' });
        return;
      }
      store(messageId, proposal);
      setState({ status: 'ready', proposal });
    });
  }, [description, enabled, messageId, name]);

  return state;
}
