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

const SHORT_NAME_LENGTH = 4;
const SHORT_NAME_ENDINGS = ['a', 'e', 'i', 'o', 'u', 'y', 'ie', 'em', 'om', 'owi'];
const COMMON_WORDS = new Set(['ale']);

function shortNameForms(nameWord: string): string[] {
  const stem = TRAILING_VOWEL.test(nameWord) && nameWord.length > 2 ? nameWord.slice(0, -1) : nameWord;
  if (stem.length < 2) return [];
  const forms = SHORT_NAME_ENDINGS.map((ending) => stem + ending);
  if (stem.endsWith('j')) forms.push(`${stem.slice(0, -1)}i`);
  return forms;
}

/**
 * Like wordMatches, but a short name only matches its inflected forms (Jan → Jana, Maja → Mai),
 * never by prefix, so "Ola" never swallows "olej" nor "Maja" "maj". Mirrors the backend pseudonymizer.
 */
export function nameWordMatches(candidate: string, nameWord: string): boolean {
  if (candidate === nameWord) return true;
  if (nameWord.length > SHORT_NAME_LENGTH) return wordMatches(candidate, nameWord);
  return !COMMON_WORDS.has(candidate) && shortNameForms(nameWord).includes(candidate);
}
