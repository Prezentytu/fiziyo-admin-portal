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

const THINKING_STEPS: Record<ThinkingTopic, readonly ThinkingStep[]> = {
  document: [
    { afterMs: 0, label: 'Czytam dokument…' },
    { afterMs: 2500, label: 'Wyłuskuję zalecenia…' },
    { afterMs: 7000, label: 'Dopasowuję ćwiczenia z katalogu…' },
  ],
  set: [
    { afterMs: 0, label: 'Czytam pytanie…' },
    { afterMs: 1200, label: 'Przeglądam zestawy i plany…' },
    { afterMs: 4000, label: 'Dobieram ćwiczenia z katalogu…' },
    { afterMs: 9000, label: 'Układam zestaw…' },
    { afterMs: 14000, label: 'Sprawdzam propozycję…' },
  ],
  patients: [
    { afterMs: 0, label: 'Czytam pytanie…' },
    { afterMs: 1200, label: 'Sprawdzam pacjentów…' },
    { afterMs: 4000, label: 'Przeglądam plany i aktywność…' },
    { afterMs: 9000, label: 'Układam odpowiedź…' },
  ],
  exercises: [
    { afterMs: 0, label: 'Czytam pytanie…' },
    { afterMs: 1200, label: 'Przeglądam katalog ćwiczeń…' },
    { afterMs: 4000, label: 'Dobieram ćwiczenia…' },
    { afterMs: 9000, label: 'Porównuję pasujące ćwiczenia…' },
  ],
  general: [
    { afterMs: 0, label: 'Czytam pytanie…' },
    { afterMs: 1500, label: 'Układam odpowiedź…' },
    { afterMs: 9000, label: 'Sprawdzam dane gabinetu…' },
  ],
};

const LONG_WAIT_MS = 20000;
const LONG_STEP_MS = 6000;
const STILL_WAITING = 'Trwa to dłużej niż zwykle. Możesz poczekać albo zatrzymać i zapytać krócej.';

/**
 * A long wait keeps saying what is going on for the topic, in turns, so the line never freezes
 * (demo 18.11: it stood on one sentence from the 9th second). Only what the assistant really does
 * for such a question is named; the progress itself is not known here.
 */
const LONG_WAIT_LABELS: Record<ThinkingTopic, readonly string[]> = {
  document: [
    'Dokument jest dłuższy, nadal go czytam…',
    'Wyłuskuję zalecenia…',
    'Dopasowuję ćwiczenia z katalogu…',
    STILL_WAITING,
  ],
  set: [
    'To dłuższe zadanie, nadal układam zestaw…',
    'Porównuję ćwiczenia z katalogu…',
    'Sprawdzam, czy propozycja pasuje do prośby…',
    STILL_WAITING,
  ],
  patients: [
    'To dłuższe pytanie, nadal sprawdzam pacjentów…',
    'Przeglądam plany i aktywność…',
    'Układam odpowiedź…',
    STILL_WAITING,
  ],
  exercises: [
    'To dłuższe zadanie, nadal szukam w katalogu…',
    'Porównuję pasujące ćwiczenia…',
    'Układam odpowiedź…',
    STILL_WAITING,
  ],
  general: [
    'To dłuższe zadanie, nadal nad nim pracuję…',
    'Sprawdzam dane gabinetu…',
    'Układam odpowiedź…',
    STILL_WAITING,
  ],
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
  if (elapsedMs >= LONG_WAIT_MS) {
    const labels = LONG_WAIT_LABELS[topic];
    return labels[Math.floor((elapsedMs - LONG_WAIT_MS) / LONG_STEP_MS) % labels.length];
  }
  const steps = THINKING_STEPS[topic];
  let label = steps[0].label;
  for (const step of steps) if (elapsedMs >= step.afterMs) label = step.label;
  return label;
}

const ELAPSED_FROM_MS = 15000;
const ELAPSED_STEP_S = 5;

/** „20 s” next to the status once the wait is long: the therapist sees the reply is still on its way. */
export function thinkingElapsed(elapsedMs: number): string | undefined {
  if (elapsedMs < ELAPSED_FROM_MS) return undefined;
  return `${Math.floor(elapsedMs / 1000 / ELAPSED_STEP_S) * ELAPSED_STEP_S} s`;
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
