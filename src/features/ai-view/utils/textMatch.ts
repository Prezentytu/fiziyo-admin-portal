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
// Masculine on -o: Bruno → Bruna, Brunie; Jasio → Jasia. Mario, Julio and Antonio take no -a and no
// -ie, so they never yield Maria, Marii or Julii.
const MASCULINE_O_ENDINGS = ['a', 'owi', 'em', 'u', 'ie'];
const MASCULINE_IO_ENDINGS = ['owi', 'em', 'u'];
// -ia names take only a, e, i (Maria → Marii, Marię), so Antonia never yields Antoni or Antonio; the
// diminutives (Kasia, Madzia) and -ia names with a stem up to five letters (Hania, Ksenia) also stand bare or take u (Kasi, Haniu).
const I_STEM_ENDINGS = ['a', 'e', 'i'];
const DIMINUTIVE_STEM = /(s|c|z)i$/;
const SHORT_I_STEM_LENGTH = 5;
const DIMINUTIVE_ENDINGS = ['', 'u'];
const ADJECTIVE_STEM = /(sk|ck|dzk)$/;

// Jasio, Kazio, Henio, Gienio → Jasia, Henia; Antonio (stem antoni) and Mario (stem mari) never take -a.
const SHORT_NI_STEM_LENGTH = 5;

function isMasculineDiminutiveStem(stem: string): boolean {
  return DIMINUTIVE_STEM.test(stem) || (stem.endsWith('ni') && stem.length <= SHORT_NI_STEM_LENGTH);
}

function longNameEndings(nameWord: string, stem: string): string[] {
  if (!TRAILING_VOWEL.test(nameWord)) return CONSONANT_NAME_ENDINGS;
  if (/[iy]$/.test(nameWord)) return MASCULINE_ADJECTIVE_ENDINGS;
  if (nameWord.endsWith('o')) {
    if (!stem.endsWith('i')) return MASCULINE_O_ENDINGS;
    return isMasculineDiminutiveStem(stem) ? ['a', ...MASCULINE_IO_ENDINGS] : MASCULINE_IO_ENDINGS;
  }
  if (ADJECTIVE_STEM.test(stem)) return FEMININE_ADJECTIVE_ENDINGS;
  if (stem.endsWith('i') && (DIMINUTIVE_STEM.test(stem) || stem.length <= SHORT_I_STEM_LENGTH)) {
    return [...I_STEM_ENDINGS, ...DIMINUTIVE_ENDINGS];
  }
  return stem.endsWith('i') ? I_STEM_ENDINGS : FEMININE_NOUN_ENDINGS;
}

const COMMON_WORDS = new Set(['ale']);

function nameForms(nameWord: string): string[] {
  if (nameWord.length <= SHORT_NAME_LENGTH) {
    const stem = TRAILING_VOWEL.test(nameWord) && nameWord.length > 2 ? nameWord.slice(0, -1) : nameWord;
    if (stem.length < 2) return [];
    const forms = SHORT_NAME_ENDINGS.map((ending) => stem + ending);
    if (stem.endsWith('j')) forms.push(`${stem.slice(0, -1)}i`);
    // Ania → Ani, Asia → Asi; Mia keeps no bare stem ("mi"), nor Maja ("maj").
    if (nameWord.endsWith('ia') && stem.length >= 3) forms.push(stem);
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
