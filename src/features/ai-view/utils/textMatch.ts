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
// A consonant-final name is masculine (Karol → Karola, Wiktorze) and a vowel-final one mostly feminine
// (Kamila → Kamili, Kowalska → Kowalskiej), so neither takes endings that would make it the other name
// (Wiktor → Wiktoria, Kamila → Kamilowi).
const CONSONANT_NAME_ENDINGS = ['', 'a', 'e', 'ie', 'u', 'owi', 'em', 'iem', 'om', 'ze', 'owie', 'ow', 'ach', 'ami'];
const VOWEL_NAME_ENDINGS = ['a', 'e', 'i', 'o', 'y', 'ie', 'ego', 'emu', 'ej', 'im', 'ym', 'iego', 'iemu', 'iej'];
// Kasia → Kasi, Kasiu: a stem ending in i also stands bare or takes u.
const SOFT_STEM_ENDINGS = ['', 'u'];
const COMMON_WORDS = new Set(['ale']);

function nameForms(nameWord: string): string[] {
  if (nameWord.length <= SHORT_NAME_LENGTH) {
    const stem = TRAILING_VOWEL.test(nameWord) && nameWord.length > 2 ? nameWord.slice(0, -1) : nameWord;
    if (stem.length < 2) return [];
    const forms = SHORT_NAME_ENDINGS.map((ending) => stem + ending);
    if (stem.endsWith('j')) forms.push(`${stem.slice(0, -1)}i`);
    return forms;
  }
  if (!TRAILING_VOWEL.test(nameWord)) {
    return wordStems(nameWord).flatMap((stem) => CONSONANT_NAME_ENDINGS.map((ending) => stem + ending));
  }
  return wordStems(nameWord).flatMap((stem) => {
    const endings = stem.endsWith('i') ? [...VOWEL_NAME_ENDINGS, ...SOFT_STEM_ENDINGS] : VOWEL_NAME_ENDINGS;
    return endings.map((ending) => stem + ending);
  });
}

/**
 * A name matches only its inflected forms (Jan → Jana, Maja → Mai, Kowalski → Kowalskiego), never by
 * prefix, so "Ola" never swallows "olej" nor "Karol" "Karoliny". Mirrors the backend pseudonymizer.
 */
export function nameWordMatches(candidate: string, nameWord: string): boolean {
  if (candidate === nameWord) return true;
  return !COMMON_WORDS.has(candidate) && nameForms(nameWord).includes(candidate);
}
