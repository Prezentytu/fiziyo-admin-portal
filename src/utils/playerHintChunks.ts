/**
 * Kopia `fizjo-app` `utils/playerHintChunks.ts` (zmieniaj oba razem).
 *
 * Dzieli długą wskazówkę playera na krótkie części, które pacjent przeczyta z odległości
 * (decyzja C: cięcie po zdaniach, około 90 znaków na część, części rotują jak wskazówki).
 * Kolejność: granice zdań, potem przecinki i średniki, na końcu granica słowa.
 */
export const PLAYER_HINT_CHUNK_MAX_CHARS = 90;

/** Skróty, po których kropka nie kończy zdania. */
const ABBREVIATIONS = new Set([
  'np',
  'ok',
  'tj',
  'tzn',
  'itp',
  'itd',
  'm.in',
  'cm',
  'kg',
  'min',
  'sek',
  'godz',
  'ew',
  'wg',
  'pkt',
]);

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  const boundary = /[.!?…]+(?=\s+)/g;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const before = text.slice(start, match.index);
    const lastWord = before.split(/\s+/).pop()?.toLowerCase() ?? '';
    if (match[0] === '.' && (ABBREVIATIONS.has(lastWord) || /^\d+$/.test(lastWord))) continue;
    sentences.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences.filter(Boolean);
}

function splitByWords(text: string, max: number): string[] {
  const parts: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > max && current) {
      parts.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Za długie zdanie dzieli na pół przy przecinku, średniku albo dwukropku najbliższym środka,
 * żeby obie części były podobnej długości; bez takiej granicy tnie po słowach.
 */
function splitLongSentence(sentence: string, max: number): string[] {
  if (sentence.length <= max) return [sentence];
  const middle = sentence.length / 2;
  let best: number | null = null;
  for (const match of sentence.matchAll(/[,;:]\s+/g)) {
    const cut = (match.index ?? 0) + 1;
    if (best === null || Math.abs(cut - middle) < Math.abs(best - middle)) best = cut;
  }
  if (best === null) return splitByWords(sentence, max);
  const head = sentence.slice(0, best).trim();
  const tail = sentence.slice(best).trim();
  return [...splitLongSentence(head, max), ...splitLongSentence(tail, max)];
}

/** Skleja kolejne kawałki, dopóki część mieści się w limicie. */
function packPieces(pieces: readonly string[], max: number): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    const candidate = current ? `${current} ${piece}` : piece;
    if (candidate.length > max && current) {
      chunks.push(current);
      current = piece;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function splitPlayerHint(text: string, max: number = PLAYER_HINT_CHUNK_MAX_CHARS): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= max) return [normalized];
  const pieces = splitSentences(normalized).flatMap((sentence) => splitLongSentence(sentence, max));
  return packPieces(pieces, max);
}

/** Lista wskazówek po rozbiciu długich na części, w tej samej kolejności. */
export function expandPlayerHints(hints: readonly string[], max: number = PLAYER_HINT_CHUNK_MAX_CHARS): string[] {
  return hints.flatMap((hint) => splitPlayerHint(hint, max));
}

/**
 * Lista rotacji dla fazy. Części długich wskazówek wchodzą tylko wtedy, gdy faza zdąży pokazać każdą z nich;
 * w krótszej fazie zostaje pełny tekst, który `PlayerHint` i tak pozwala rozwinąć w całości.
 */
export function resolvePlayerHintRotation(
  source: readonly string[],
  rotateEverySec: number,
  phaseDurationSec?: number
): readonly string[] {
  const expanded = expandPlayerHints(source);
  if (phaseDurationSec == null || !Number.isFinite(phaseDurationSec) || expanded.length === source.length) {
    return expanded;
  }
  const visibleSlots = Math.floor(Math.max(0, phaseDurationSec) / rotateEverySec);
  return visibleSlots >= expanded.length ? expanded : source;
}
