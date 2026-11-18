import { parseNewPatientDetails, type NewPatientDetails } from './newPatientDetails';
import { matchPatients, type MatchablePatient } from './patientMatch';

/** What a typed answer to „Komu przypisać?” means: a known patient, a choice, or someone new. */
export type PickPatientAnswer =
  | { kind: 'one'; patient: MatchablePatient; /** Named by one word of a longer name. */ partial: boolean }
  | { kind: 'many'; patientIds: string[] }
  | { kind: 'none'; details: NewPatientDetails };

// „do jarka”, „dla pani Anny”, „pacjentowi Janowi”: słowa przed nazwiskiem, które nie są nazwiskiem.
const LEAD_WORDS = /^(?:(?:do|dla|to|dać|daj|przypisz|wyślij|pacjent\p{L}*|pan\p{L}*|pani)\s+)+/iu;
const CONTACT = /[^\s,;:]+@[^\s,;:]+\.[a-z]{2,}|(?:\+48[\s-]?)?(?:\d[\s-]?){8}\d/gi;

export function pickPatientAnswer(text: string, patients: readonly MatchablePatient[]): PickPatientAnswer {
  const match = matchPatients(text, patients);
  if (match.kind === 'one') return { kind: 'one', patient: match.patient, partial: match.partial };
  if (match.kind === 'many') return { kind: 'many', patientIds: match.patients.map((patient) => patient.id) };
  const name = nominativeName(text);
  const contact = parseNewPatientDetails(text);
  const details: NewPatientDetails = {
    ...(name ? { name } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { phone: contact.phone } : {}),
  };
  return { kind: 'none', details };
}

/**
 * The name as the form needs it: „do jarka adamowskiego” → „Jarek Adamowski”. Only common
 * genitive endings are undone; the therapist sees the form and corrects the rest.
 */
export function nominativeName(text: string): string {
  const words = text
    .replace(CONTACT, ' ')
    .replace(/[,;:.!?]+/g, ' ')
    .trim()
    .replace(LEAD_WORDS, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  if (words.length === 0) return '';
  const last = words.at(-1)?.toLocaleLowerCase('pl-PL') ?? '';
  const male = words.length > 1 && /ego$/.test(last);
  const female = words.length > 1 && /iej$/.test(last);
  return words
    .map((word, index) => {
      const lower = word.toLocaleLowerCase('pl-PL');
      const isLast = index === words.length - 1;
      let base = lower;
      if (isLast) {
        base = lower.replace(/(sk|ck|dzk)iego$/, '$1i').replace(/(sk|ck|dzk)iej$/, '$1a');
      } else if (male) {
        base = lower.replace(/([^aeiouy])ka$/, '$1ek').replace(/([^aeiouy])a$/, '$1');
      } else if (female) {
        base = lower.replace(/ii$/, 'ia').replace(/([^aeiouy])y$/, '$1a');
      }
      return base.charAt(0).toLocaleUpperCase('pl-PL') + base.slice(1);
    })
    .join(' ');
}
