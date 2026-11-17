import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';

/** How the newest assistant reply appears and what the thread says while it is on its way. */

const WORD_STEP_MS = 18;
const MAX_REVEAL_MS = 700;

export interface RevealSegment {
  text: string;
  delayMs: number;
}

/**
 * Splits a reply into words (spaces kept with the word before them) with a fade-in delay each, so a
 * new reply reads in like a stream. Long replies compress the step so the whole text lands fast.
 */
export function revealSegments(text: string): RevealSegment[] {
  const words = text.match(/\S+\s*|\s+/g) ?? [];
  if (words.length === 0) return [];
  const step = Math.min(WORD_STEP_MS, MAX_REVEAL_MS / words.length);
  return words.map((word, index) => ({ text: word, delayMs: Math.round(index * step) }));
}

export type ThinkingTopic = 'document' | 'set' | 'patients' | 'exercises' | 'general';

type ThinkingStep = { afterMs: number; label: string };

const LONG_WAIT: ThinkingStep = { afterMs: 9000, label: 'Jeszcze chwila, to dłuższe zadanie…' };

const THINKING_STEPS: Record<ThinkingTopic, readonly ThinkingStep[]> = {
  document: [
    { afterMs: 0, label: 'Czytam dokument…' },
    { afterMs: 2500, label: 'Wyłuskuję zalecenia…' },
    { afterMs: 7000, label: 'Dopasowuję ćwiczenia z katalogu…' },
  ],
  set: [
    { afterMs: 0, label: 'Czytam pytanie…' },
    { afterMs: 1200, label: 'Przeglądam zestawy i plany…' },
    { afterMs: 4000, label: 'Układam zestaw…' },
    LONG_WAIT,
  ],
  patients: [
    { afterMs: 0, label: 'Czytam pytanie…' },
    { afterMs: 1200, label: 'Sprawdzam pacjentów…' },
    { afterMs: 4000, label: 'Układam odpowiedź…' },
    LONG_WAIT,
  ],
  exercises: [
    { afterMs: 0, label: 'Czytam pytanie…' },
    { afterMs: 1200, label: 'Przeglądam katalog ćwiczeń…' },
    { afterMs: 4000, label: 'Dobieram ćwiczenia…' },
    LONG_WAIT,
  ],
  general: [{ afterMs: 0, label: 'Czytam pytanie…' }, { afterMs: 1500, label: 'Układam odpowiedź…' }, LONG_WAIT],
};

// Kolejność ma znaczenie: „kto nie ćwiczy” to pytanie o pacjentów, „zestaw ćwiczeń” o zestaw.
const TOPIC_PATTERNS: readonly [ThinkingTopic, RegExp][] = [
  ['patients', /nie cwicz|nieaktywn|kto nie/],
  ['set', /zestaw|plan|program|przypisz/],
  ['patients', /pacjen|wizyt/],
  ['exercises', /cwicz|katalog|rozciag|mobiliz|wzmacn|rozgrzew|izometr|stabiliz/],
];

/** Co asystent sprawdza, wynika z pytania: o ćwiczenia pytasz, katalog przegląda. */
export function thinkingTopic(question: string | undefined, hasAttachment = false): ThinkingTopic {
  if (hasAttachment) return 'document';
  const text = normalizeSearchText(question);
  return TOPIC_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'general';
}

/** The busy line under the question: it moves on with time, like a status, not a spinner. */
export function thinkingLabel(elapsedMs: number, topic: ThinkingTopic = 'general'): string {
  const steps = THINKING_STEPS[topic];
  let label = steps[0].label;
  for (const step of steps) if (elapsedMs >= step.afterMs) label = step.label;
  return label;
}

export interface RevealMarker {
  conversationId: string;
  /** Replies created after this moment read in; earlier ones, history included, show at once. */
  since: number;
}

/** Opening another conversation (new or from history) moves the marker, so its history never animates. */
export function nextRevealMarker(marker: RevealMarker | undefined, conversationId: string, now: number): RevealMarker {
  if (marker?.conversationId === conversationId) return marker;
  return { conversationId, since: now };
}
