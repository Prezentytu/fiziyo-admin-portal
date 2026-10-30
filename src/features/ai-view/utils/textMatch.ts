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
// Endings follow how the name declines, so no form of one name is a form of another: a consonant-final
// name is masculine (Karol → Karola, never Karoliny), -i/-y declines like an adjective (Kowalski →
// Kowalskiego, Antoni → Antoniemu), -ska/-cka like a feminine adjective (Kowalska → Kowalskiej) and any
// other vowel like a feminine noun (Kamila → Kamili, never Kamilowi).
const CONSONANT_NAME_ENDINGS = ['', 'a', 'e', 'ie', 'u', 'owi', 'em', 'iem', 'om', 'ze', 'owie', 'ow', 'ach', 'ami'];
const MASCULINE_ADJECTIVE_ENDINGS = ['i', 'y', 'ego', 'emu', 'im', 'ym', 'iego', 'iemu'];
const FEMININE_ADJECTIVE_ENDINGS = ['a', 'iej'];
const FEMININE_NOUN_ENDINGS = ['a', 'e', 'i', 'o', 'y', 'ie'];
// Kasia → Kasi, Kasiu: a stem ending in i also stands bare or takes u.
const SOFT_STEM_ENDINGS = ['', 'u'];
const ADJECTIVE_STEM = /(sk|ck|dzk)$/;

function longNameEndings(nameWord: string, stem: string): string[] {
  if (!TRAILING_VOWEL.test(nameWord)) return CONSONANT_NAME_ENDINGS;
  if (/[iy]$/.test(nameWord)) return MASCULINE_ADJECTIVE_ENDINGS;
  if (ADJECTIVE_STEM.test(stem)) return FEMININE_ADJECTIVE_ENDINGS;
  return stem.endsWith('i') ? [...FEMININE_NOUN_ENDINGS, ...SOFT_STEM_ENDINGS] : FEMININE_NOUN_ENDINGS;
}

const COMMON_WORDS = new Set(['ale']);

function nameForms(nameWord: string): string[] {
  if (nameWord.length <= SHORT_NAME_LENGTH) {
    const stem = TRAILING_VOWEL.test(nameWord) && nameWord.length > 2 ? nameWord.slice(0, -1) : nameWord;
    if (stem.length < 2) return [];
    const forms = SHORT_NAME_ENDINGS.map((ending) => stem + ending);
    if (stem.endsWith('j')) forms.push(`${stem.slice(0, -1)}i`);
    return forms;
  }
  return wordStems(nameWord).flatMap((stem) => longNameEndings(nameWord, stem).map((ending) => stem + ending));
}

/**
 * A name matches only its inflected forms (Jan → Jana, Maja → Mai, Kowalski → Kowalskiego), never by
 * prefix, so "Ola" never swallows "olej" nor "Karol" "Karoliny". Mirrors the backend pseudonymizer.
 */
export function nameWordMatches(candidate: string, nameWord: string): boolean {
  if (candidate === nameWord) return true;
  return !COMMON_WORDS.has(candidate) && nameForms(nameWord).includes(candidate);
}
