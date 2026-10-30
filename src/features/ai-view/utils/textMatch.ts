import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';

const WORD = /[a-z0-9]+/g;
const TRAILING_VOWEL = /[aeiouy]$/;
const MOVABLE_E = /e([^aeiouy])$/;

export function tokenizeWords(text: string | null | undefined): string[] {
  return normalizeSearchText(text).match(WORD) ?? [];
}

/**
 * Prefixes that survive Polish inflection: "kolano" → "kolan" (kolana, kolanie),
 * "marek" → "marek" + "mark" (Marka, Markowi).
 */
export function wordStems(word: string): string[] {
  const base = TRAILING_VOWEL.test(word) && word.length > 2 ? word.slice(0, -1) : word;
  const stems = [base];
  if (MOVABLE_E.test(base) && base.length > 3) {
    stems.push(base.replace(MOVABLE_E, '$1'));
  }
  return stems;
}

export function wordMatches(candidate: string, word: string): boolean {
  if (candidate === word) return true;
  const maxExtra = word.length <= 3 ? 1 : 4;
  if (candidate.length > word.length + maxExtra) return false;
  return wordStems(word).some((stem) => stem.length >= 2 && candidate.startsWith(stem));
}
