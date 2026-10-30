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

const THINKING_STEPS: readonly { afterMs: number; label: string }[] = [
  { afterMs: 0, label: 'Czytam, o co chodzi…' },
  { afterMs: 1200, label: 'Sprawdzam pacjentów i katalog…' },
  { afterMs: 4000, label: 'Układam odpowiedź…' },
  { afterMs: 9000, label: 'Jeszcze chwila, to dłuższe zadanie…' },
];

const DOCUMENT_STEPS: readonly { afterMs: number; label: string }[] = [
  { afterMs: 0, label: 'Czytam dokument…' },
  { afterMs: 2500, label: 'Wyłuskuję zalecenia…' },
  { afterMs: 7000, label: 'Dopasowuję ćwiczenia z katalogu…' },
];

/** The busy line under the question: it moves on with time, like a status, not a spinner. */
export function thinkingLabel(elapsedMs: number, isDocument = false): string {
  const steps = isDocument ? DOCUMENT_STEPS : THINKING_STEPS;
  let label = steps[0].label;
  for (const step of steps) if (elapsedMs >= step.afterMs) label = step.label;
  return label;
}
