import { useCallback, useSyncExternalStore } from 'react';

import { CHAT_EXERCISE_DEFAULTS } from '../utils/chatExerciseDraft';
import type { NewExerciseValues } from './CreateExerciseCard';
import type { DraftFill, DraftSection, DraftSectionState } from './useExerciseDraftAi';

/** AI progress of one card: which sections are shown, for which name, and whether a run is going. */
export interface ExerciseDraftAiState {
  readonly sections: Readonly<Record<DraftSection, DraftSectionState>>;
  readonly generatedFor: string | null;
  readonly running: boolean;
}

/**
 * The chat's new exercise card, kept outside the card: leaving the chat for another screen unmounts
 * it, and the therapist comes back to the same draft, with the AI run finished meanwhile.
 * Memory only, never `localStorage` (ai-view/AGENTS.md); the picture is a `File`.
 */
export interface ExerciseDraft {
  readonly ai: ExerciseDraftAiState;
  /** Form values; null until a card renders the draft (the AI hook alone has no form). */
  readonly values: NewExerciseValues | null;
  readonly exerciseType: 'reps' | 'time';
  readonly image: File | null;
  /** Position quick reply already sent from this card. */
  readonly pickedPosition?: string;
}

export const HIDDEN_SECTIONS: Readonly<Record<DraftSection, DraftSectionState>> = {
  params: 'hidden',
  description: 'hidden',
  steps: 'hidden',
  cues: 'hidden',
  more: 'hidden',
  image: 'hidden',
};

export const EMPTY_DRAFT: ExerciseDraft = {
  ai: { sections: HIDDEN_SECTIONS, generatedFor: null, running: false },
  values: null,
  exerciseType: CHAT_EXERCISE_DEFAULTS.type,
  image: null,
};

/** Drafts kept at once; the oldest goes first (each may hold a picture). */
export const MAX_EXERCISE_DRAFTS = 10;

const drafts = new Map<string, ExerciseDraft>();
const listeners = new Map<string, Set<() => void>>();
const runs = new Map<string, number>();
let generation = 0;

export function readExerciseDraft(key: string): ExerciseDraft | undefined {
  return drafts.get(key);
}

export function updateExerciseDraft(key: string, update: (draft: ExerciseDraft) => ExerciseDraft): void {
  const previous = drafts.get(key);
  const next = update(previous ?? EMPTY_DRAFT);
  if (next === previous) return;
  drafts.delete(key);
  drafts.set(key, next);
  for (const oldest of drafts.keys()) {
    if (drafts.size <= MAX_EXERCISE_DRAFTS) break;
    dropExerciseDraft(oldest);
  }
  listeners.get(key)?.forEach((listener) => listener());
}

export function subscribeExerciseDraft(key: string, listener: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

/** The draft under `key` as React state; an absent draft reads as empty. */
export function useExerciseDraft(key: string): ExerciseDraft {
  return useSyncExternalStore(
    useCallback((listener: () => void) => subscribeExerciseDraft(key, listener), [key]),
    () => drafts.get(key) ?? EMPTY_DRAFT,
    () => EMPTY_DRAFT
  );
}

/** Starts a new AI run for the draft; any earlier run of it stops writing. */
export function startExerciseDraftRun(key: string): number {
  const id = ++generation;
  runs.set(key, id);
  return id;
}

export function isCurrentExerciseDraftRun(key: string, id: number): boolean {
  return runs.get(key) === id;
}

/** The exercise is saved (or the draft evicted): its draft and any run of it are gone. */
export function dropExerciseDraft(key: string): void {
  runs.delete(key);
  if (!drafts.delete(key)) return;
  listeners.get(key)?.forEach((listener) => listener());
}

/** Another user or organization (the chat provider unmounts on sign-out): nothing of the previous one's drafts may show or keep running. */
export function clearExerciseDrafts(): void {
  const keys = [...drafts.keys(), ...runs.keys()];
  drafts.clear();
  runs.clear();
  keys.forEach((key) => listeners.get(key)?.forEach((listener) => listener()));
}

/** One AI answer applied to the draft's values, the same way the card applies it to its form. */
export function applyDraftFill(draft: ExerciseDraft, fill: DraftFill): ExerciseDraft {
  if (fill.section === 'image') return { ...draft, image: fill.file };
  if (fill.section === 'params') {
    const { type, ...params } = fill.params;
    return { ...draft, exerciseType: type, values: draft.values && { ...draft.values, ...params } };
  }
  if (!draft.values) return draft;
  if (fill.section === 'more') {
    return { ...draft, values: { ...draft.values, mistakes: fill.mistakes, stopIf: fill.stopIf } };
  }
  return { ...draft, values: { ...draft.values, [fill.section]: fill.text } };
}
