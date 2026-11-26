'use client';

import { useCallback, useEffect, useRef } from 'react';

import { aiService } from '@/services/aiService';
import type { ExerciseSuggestionResponse, ImageStyle } from '@/types/ai.types';
import {
  paramsFromSuggestion,
  textsFromEnrichment,
  type ChatExerciseParams,
  type ChatExerciseTexts,
} from '../utils/chatExerciseDraft';
import {
  applyDraftFill,
  HIDDEN_SECTIONS,
  isCurrentExerciseDraftRun,
  startExerciseDraftRun,
  updateExerciseDraft,
  useExerciseDraft,
  type ExerciseDraftAiState,
} from './exerciseDraftStore';

/** Sections of the new exercise card, in the order they unfold. */
export const DRAFT_SECTIONS = ['params', 'description', 'steps', 'cues', 'more', 'image'] as const;
export type DraftSection = (typeof DRAFT_SECTIONS)[number];
/** hidden: not reached yet; working: AI fills it now; done: shown; failed: shown with a retry. */
export type DraftSectionState = 'hidden' | 'working' | 'done' | 'failed';

export type DraftFill =
  | { section: 'params'; params: ChatExerciseParams }
  | { section: 'description' | 'steps' | 'cues'; text: string }
  | { section: 'more'; mistakes: string; stopIf: string }
  | { section: 'image'; file: File };

/** One step per section reads as the card unfolding, even when the answers arrive together. */
const MIN_STEP_MS = 450;

const ALL_SHOWN: Record<DraftSection, DraftSectionState> = {
  params: 'done',
  description: 'done',
  steps: 'done',
  cues: 'done',
  more: 'done',
  image: 'done',
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

type DraftAiOptions = {
  onFill: (fill: DraftFill) => void;
  /** What the picture is generated from, read when its turn comes (after the texts are filled). */
  imageInput: () => { description: string; type: 'reps' | 'time'; style?: ImageStyle };
};

/** The mounted card of each draft: a run started before a remount still fills the card on screen. */
const mountedOptions = new Map<string, { current: DraftAiOptions }>();

const setAi = (key: string, patch: Partial<ExerciseDraftAiState>) =>
  updateExerciseDraft(key, (draft) => ({ ...draft, ai: { ...draft.ai, ...patch } }));

/**
 * Drives the AI fill of the chat's new exercise card: nothing runs until the therapist asks
 * („Generuj”), then the sections unfold one by one, ending with a picture. Any section can be
 * generated again on its own. Progress lives in `exerciseDraftStore` under `draftKey`, so leaving the
 * chat neither stops the run nor loses what it filled. Values go to the form through `onFill`;
 * nothing is saved here.
 */
export function useExerciseDraftAi(options: DraftAiOptions & { draftKey: string }) {
  const { draftKey } = options;
  const latest = useRef<DraftAiOptions>(options);
  latest.current = options;

  useEffect(() => {
    const entry = { current: latest.current };
    mountedOptions.set(draftKey, entry);
    return () => {
      if (mountedOptions.get(draftKey) === entry) mountedOptions.delete(draftKey);
    };
  }, [draftKey]);
  useEffect(() => {
    const entry = mountedOptions.get(draftKey);
    if (entry) entry.current = options;
  });

  const { ai } = useExerciseDraft(draftKey);

  const generate = useCallback(
    async (name: string, only: readonly DraftSection[] = DRAFT_SECTIONS) => {
      const exerciseName = name.trim();
      if (exerciseName.length < 3) return;
      const key = draftKey;
      const id = startExerciseDraftRun(key);
      const isCurrent = () => isCurrentExerciseDraftRun(key, id);
      // The card on screen now, or the one that started the run when none is mounted.
      const started = latest.current;
      const current = () => mountedOptions.get(key)?.current ?? started;
      const wanted = new Set(only);
      setAi(key, { running: true, ...(only.length === DRAFT_SECTIONS.length && { sections: HIDDEN_SECTIONS }) });
      const setSection = (section: DraftSection, state: DraftSectionState) =>
        updateExerciseDraft(key, (draft) => ({
          ...draft,
          ai: { ...draft.ai, sections: { ...draft.ai.sections, [section]: state } },
        }));

      const needsSuggestion = wanted.has('params') || wanted.has('description');
      const needsEnrichment = (['description', 'steps', 'cues', 'more'] as const).some((section) =>
        wanted.has(section)
      );
      // Oba zapytania startują razem; sekcje odsłaniają się po kolei, gdy ich dane już są.
      const suggestion: Promise<ExerciseSuggestionResponse | null> = needsSuggestion
        ? aiService
            .suggestExercise(exerciseName)
            .then((result) => (result.status === 'ok' ? result.suggestion : null))
            .catch(() => null)
        : Promise.resolve(null);
      const texts: Promise<ChatExerciseTexts> = needsEnrichment
        ? aiService
            .generateEnrichment({ exerciseName })
            .then((response) => textsFromEnrichment(response?.success ? response.enrichmentData : null))
            .catch(() => textsFromEnrichment(null))
        : Promise.resolve(textsFromEnrichment(null));

      for (const section of DRAFT_SECTIONS) {
        if (!wanted.has(section)) continue;
        if (!isCurrent()) return;
        setSection(section, 'working');
        const startedAt = Date.now();
        const fill = await resolveFill(section, exerciseName, suggestion, texts, () => current().imageInput());
        if (!isCurrent()) return;
        if (fill) {
          updateExerciseDraft(key, (draft) => applyDraftFill(draft, fill));
          current().onFill(fill);
        }
        if (section !== 'image') await sleep(Math.max(0, MIN_STEP_MS - (Date.now() - startedAt)));
        if (!isCurrent()) return;
        setSection(section, fill ? 'done' : 'failed');
      }

      // Nazwę, dla której jest propozycja, ustala tylko pełny przebieg; jedna sekcja jej nie przejmuje.
      setAi(key, { running: false, ...(only.length === DRAFT_SECTIONS.length && { generatedFor: exerciseName }) });
    },
    [draftKey]
  );

  /** Without AI (or by choice): every section shown at once, to fill by hand. */
  const showAll = useCallback(() => {
    startExerciseDraftRun(draftKey);
    setAi(draftKey, { running: false, sections: ALL_SHOWN });
  }, [draftKey]);

  return { sections: ai.sections, generatedFor: ai.generatedFor, running: ai.running, generate, showAll };
}

async function resolveFill(
  section: DraftSection,
  exerciseName: string,
  suggestion: Promise<ExerciseSuggestionResponse | null>,
  textsPromise: Promise<ChatExerciseTexts>,
  imageInput: () => { description: string; type: 'reps' | 'time'; style?: ImageStyle }
): Promise<DraftFill | null> {
  if (section === 'params') {
    const proposal = await suggestion;
    return proposal ? { section, params: paramsFromSuggestion(proposal) } : null;
  }
  if (section === 'image') {
    const { description, type, style } = imageInput();
    const result = await aiService.generateExerciseImage(exerciseName, description || undefined, type, style);
    return result.status === 'ok' ? { section, file: result.file } : null;
  }
  const texts = await textsPromise;
  if (section === 'description') {
    // Krótki opis z karty v3; gdy go brak, opis z propozycji parametrów.
    const text = texts.description || (await suggestion)?.description?.trim() || '';
    return text ? { section, text } : null;
  }
  if (section === 'more') {
    return texts.mistakes || texts.stopIf ? { section, mistakes: texts.mistakes, stopIf: texts.stopIf } : null;
  }
  const text = texts[section];
  return text ? { section, text } : null;
}
