'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { aiService } from '@/services/aiService';
import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import {
  paramsFromSuggestion,
  textsFromEnrichment,
  type ChatExerciseParams,
  type ChatExerciseTexts,
} from '../utils/chatExerciseDraft';

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

const ALL_HIDDEN: Record<DraftSection, DraftSectionState> = {
  params: 'hidden',
  description: 'hidden',
  steps: 'hidden',
  cues: 'hidden',
  more: 'hidden',
  image: 'hidden',
};

const ALL_SHOWN: Record<DraftSection, DraftSectionState> = {
  params: 'done',
  description: 'done',
  steps: 'done',
  cues: 'done',
  more: 'done',
  image: 'done',
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Drives the AI fill of the chat's new exercise card: nothing runs until the therapist asks
 * („Generuj”), then the sections unfold one by one, ending with a picture. Any section can be
 * generated again on its own. Values go to the form through `onFill`; nothing is saved here.
 */
export function useExerciseDraftAi(options: {
  onFill: (fill: DraftFill) => void;
  /** What the picture is generated from, read when its turn comes (after the texts are filled). */
  imageInput: () => { description: string; type: 'reps' | 'time' };
}) {
  const [sections, setSections] = useState(ALL_HIDDEN);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const run = useRef(0);
  const latest = useRef(options);
  latest.current = options;

  // Odmontowana karta (inna rozmowa) nie dostaje już wyników starego przebiegu.
  useEffect(
    () => () => {
      run.current += 1;
    },
    []
  );

  const setSection = (section: DraftSection, state: DraftSectionState) =>
    setSections((current) => ({ ...current, [section]: state }));

  const generate = useCallback(async (name: string, only: readonly DraftSection[] = DRAFT_SECTIONS) => {
    const exerciseName = name.trim();
    if (exerciseName.length < 3) return;
    const id = ++run.current;
    const wanted = new Set(only);
    setRunning(true);
    if (only.length === DRAFT_SECTIONS.length) setSections(ALL_HIDDEN);

    const needsSuggestion = wanted.has('params') || wanted.has('description');
    const needsEnrichment = (['description', 'steps', 'cues', 'more'] as const).some((section) => wanted.has(section));
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
      if (run.current !== id) return;
      setSection(section, 'working');
      const startedAt = Date.now();
      const fill = await resolveFill(section, exerciseName, suggestion, texts, latest.current.imageInput);
      if (run.current !== id) return;
      if (fill) latest.current.onFill(fill);
      if (section !== 'image') await sleep(Math.max(0, MIN_STEP_MS - (Date.now() - startedAt)));
      if (run.current !== id) return;
      setSection(section, fill ? 'done' : 'failed');
    }

    setRunning(false);
    // Nazwę, dla której jest propozycja, ustala tylko pełny przebieg; jedna sekcja jej nie przejmuje.
    if (only.length === DRAFT_SECTIONS.length) setGeneratedFor(exerciseName);
  }, []);

  /** Without AI (or by choice): every section shown at once, to fill by hand. */
  const showAll = useCallback(() => {
    run.current += 1;
    setRunning(false);
    setSections(ALL_SHOWN);
  }, []);

  return { sections, generatedFor, running, generate, showAll };
}

async function resolveFill(
  section: DraftSection,
  exerciseName: string,
  suggestion: Promise<ExerciseSuggestionResponse | null>,
  textsPromise: Promise<ChatExerciseTexts>,
  imageInput: () => { description: string; type: 'reps' | 'time' }
): Promise<DraftFill | null> {
  if (section === 'params') {
    const proposal = await suggestion;
    return proposal ? { section, params: paramsFromSuggestion(proposal) } : null;
  }
  if (section === 'image') {
    const { description, type } = imageInput();
    const result = await aiService.generateExerciseImage(exerciseName, description || undefined, type);
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
