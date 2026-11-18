import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { matchPatients, type MatchablePatient } from './patientMatch';
import type { ChatViewSpec } from './viewSpec';

/** What the therapist already wrote about a new patient; the form starts with it, nothing is guessed. */
export interface NewPatientDetails {
  name?: string;
  phone?: string;
  email?: string;
  contextLabel?: string;
}

const PATIENT_KEYWORD = /^pacjent/i;
const EMAIL = /[^\s,;:]+@[^\s,;:]+\.[a-z]{2,}/i;
// 9 digits with optional +48 and spaces or hyphens: "600 100 200", "+48 600-100-200".
const PHONE = /(?:\+48[\s-]?)?(?:\d[\s-]?){8}\d/;
const CONTACT = new RegExp(`${EMAIL.source}|${PHONE.source}`, 'gi');
const PHONE_LABEL = /^(?:tel(?:efon)?|nr|numer)\.?\s*:?\s*/i;
// From here on the message is about the plan, not the patient ("i od razu ułóż mu zestaw: clamshell…").
const PLAN_TALK = /(?:^|[^\p{L}])(?:zestaw|u[łl][óo][żz]|plan|[ćc]wicze)/iu;
const NAME_END = /\s+(?:i|oraz|a)\s+|[,;:.]/;
const MAX_CONTEXT_LABEL = 80;

// Normalized (no diacritics, lower case): „dodaj”, „stwórz”, „utwórz”, „załóż”, also as „chcę dodać”.
const ADD_VERB = '(?:doda[jc]|dopis(?:z|ac)|stworz(?:yc)?|utworz(?:yc)?|zaloz(?:yc)?|zarejestruj|wprowadz(?:ic)?)';
const ADD_VERB_WORD = new RegExp(`^${ADD_VERB}$`);
// „dodaj pacjenta”, „stwórz mi pacjenta”, „załóż konto pacjentki”; „pacjentowi” gets something added, so it is not here.
const ADDS_PATIENT = new RegExp(
  `(?:^|\\s)${ADD_VERB}\\s+(?:(?:mi|nam|prosze|nowego|nowa|nowej|nowy|konto|karte|profil|dla)\\s+){0,3}pacjent(?:a|ke|ka|ki)?(?![a-z])`
);
const STARTS_WITH_NEW_PATIENT = /^now(?:y|a|ego|ej) pacjent(?:a|ke|ka|ki)?(?![a-z])/;
const STARTS_WITH_ADD = new RegExp(`^(?:prosze\\s+)?${ADD_VERB}\\s`);
const HOW_TO_QUESTION = /^(?:jak|gdzie|kiedy|dlaczego|czemu|czy da sie)\s/;

// „z mailem”, „na adres”, „o numerze”: they announce a contact, they are not a name.
const CONTACT_LABEL =
  /(?:^|\s)(?:(?:z|na|pod|o)\s+)?(?:adres\p{L}*|e-?mail\p{L}*|mail\p{L}*|tel\p{L}*|numer\p{L}*|nr)(?=[\s.:]|$)/giu;
const FILLER_WORDS = new Set([
  'dla',
  'mi',
  'nam',
  'prosze',
  'taki',
  'takiego',
  'takim',
  'ten',
  'tego',
  'tym',
  'imie',
  'imieniu',
  'nazwisko',
  'nazwisku',
  'o',
]);
// A lower-case word from this list means a description, not a name („pacjenta z bólem kolana”, „na jutro”).
const NOT_A_NAME_WORDS = new Set([
  'z',
  'ze',
  'na',
  'po',
  'do',
  'od',
  'w',
  'we',
  'przy',
  'bez',
  'pod',
  'nad',
  'jutro',
  'dzis',
  'dzisiaj',
  'teraz',
  'bol',
  'bolem',
  'bole',
  'nowy',
  'nowego',
  'nowa',
  'nowej',
  'konto',
  'karte',
  'profil',
  'juz',
  'tez',
  'jeszcze',
  'kolejnego',
  'kolejna',
  'nastepnego',
  'nastepna',
  'jakiegos',
  'kogos',
]);
const NAME_WORD = /^\p{L}[\p{L}'’-]*$/u;
const MAX_NAME_WORDS = 4;
const MAX_LOWER_CASE_NAME_WORDS = 3;

/** "dodaj pacjentkę Anna Czat-Nowak, tel 600 100 200, ból lędźwi od pół roku" → name, phone, reason. */
export function parseNewPatientDetails(text: string): NewPatientDetails {
  const email = text.match(EMAIL)?.[0];
  const phone = text.match(PHONE)?.[0]?.trim();
  const [head = '', ...segments] = text.split(/[,;]/);

  const details: NewPatientDetails = {};
  const name = requestedName(text);
  if (name) details.name = name;
  if (phone) details.phone = phone;
  if (email) details.email = email;

  const reasons: string[] = [];
  for (const segment of PLAN_TALK.test(head) ? [] : segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    if (PLAN_TALK.test(trimmed)) break;
    if ((email && trimmed.includes(email)) || (phone && trimmed.includes(phone))) continue;
    if (PHONE_LABEL.test(trimmed) && PHONE.test(trimmed)) continue;
    reasons.push(trimmed);
  }
  const contextLabel = reasons.join(', ').slice(0, MAX_CONTEXT_LABEL).trim();
  if (contextLabel) details.contextLabel = contextLabel;
  return details;
}

/**
 * The name the message gives: what follows „pacjent…” (or the adding verb when the word is missing),
 * with the contact data taken out, up to a comma or „i”. Capitalized words are kept as written; a
 * lower-case name („jan kowalski”) is capitalized, unless a word shows it is a description.
 */
function requestedName(text: string): string | undefined {
  const words = text.replace(CONTACT, ' ').trim().split(/\s+/);
  let index = words.findIndex((word) => PATIENT_KEYWORD.test(word));
  if (index < 0) index = words.findIndex((word) => ADD_VERB_WORD.test(normalizeSearchText(word)));
  if (index < 0) return undefined;
  const nameWords = words
    .slice(index + 1)
    .join(' ')
    .replace(/^[:\-–\s]+/, '')
    .split(NAME_END)[0]
    .replace(CONTACT_LABEL, ' ')
    .split(/\s+/)
    .filter((word) => word && !FILLER_WORDS.has(normalizeSearchText(word)));
  if (nameWords.length === 0 || nameWords.length > MAX_NAME_WORDS) return undefined;
  if (!nameWords.every((word) => NAME_WORD.test(word))) return undefined;
  if (nameWords.every((word) => /^\p{Lu}/u.test(word))) return nameWords.join(' ');
  if (nameWords.length > MAX_LOWER_CASE_NAME_WORDS) return undefined;
  if (nameWords.some((word) => NOT_A_NAME_WORDS.has(normalizeSearchText(word)))) return undefined;
  return nameWords.map(capitalizeName).join(' ');
}

function capitalizeName(word: string): string {
  return word.replace(/(^|-)(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toLocaleUpperCase('pl-PL'));
}

/**
 * The message only adds a patient, so the form can open at once, without the model: „dodaj pacjenta
 * ala@…”, „stwórz mi pacjenta dla takiego maila”, „nowy pacjent Marek Lis”, and without the word
 * „pacjent” when a contact shows it is about a person („dodaj Jan Kowalski jan@…”). A message that
 * also asks for a set or a plan stays with the dispatcher, which names what is left for the next step.
 */
export function isAddPatientRequest(text: string): boolean {
  const withoutContact = text.replace(CONTACT, ' ');
  if (PLAN_TALK.test(withoutContact)) return false;
  if (namesAddingPatient(text)) return true;
  const normalized = normalizeSearchText(withoutContact).replace(/\s+/g, ' ').trim();
  const hasContact = EMAIL.test(text) || PHONE.test(text);
  return hasContact && !/pacjent/.test(normalized) && STARTS_WITH_ADD.test(`${normalized} `);
}

/** „dodaj/stwórz/załóż pacjenta …” or „nowy pacjent …” at the start; a how-to question is not a request. */
function namesAddingPatient(text: string): boolean {
  const normalized = normalizeSearchText(text.replace(CONTACT, ' ')).replace(/\s+/g, ' ').trim();
  if (HOW_TO_QUESTION.test(normalized)) return false;
  return ADDS_PATIENT.test(normalized) || STARTS_WITH_NEW_PATIENT.test(normalized);
}

const REST_LEAD = /^(?:[\s,;:.\-–]+|(?:i|oraz|a|potem|następnie|nastepnie|od razu)(?=\s))+/iu;

/**
 * The second part of a combined request („dodaj pacjenta Jan Kowalski jan@… i ułóż mu zestaw na biodro” →
 * „ułóż mu zestaw na biodro”): what follows the patient's name, without the contact data, when it talks
 * about a set, a plan or exercises. The thread carries it out for the patient once the form is saved.
 * Null when the message only adds a patient or does not add one.
 */
export function addPatientRest(text: string): string | null {
  if (!namesAddingPatient(text)) return null;
  const keyword = /pacjent\p{L}*/iu.exec(text);
  if (!keyword) return null;
  let start = keyword.index + keyword[0].length;
  const name = parseNewPatientDetails(text).name;
  const nameAt = name ? text.toLocaleLowerCase('pl-PL').indexOf(name.toLocaleLowerCase('pl-PL'), start) : -1;
  if (name && nameAt >= 0) start = nameAt + name.length;
  const rest = text
    .slice(start)
    .replace(CONTACT, ' ')
    .replace(CONTACT_LABEL, ' ')
    .replace(/\s+([,;.:])/g, '$1')
    .replace(/([,;.:])[,;.:\s]*(?=[,;.:])/g, '')
    .replace(/\s+/g, ' ')
    .replace(REST_LEAD, '')
    .replace(/[\s,;:.]+$/, '');
  return PLAN_TALK.test(rest) ? rest : null;
}

function phoneDigits(phone: string | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('48') ? digits.slice(2) : digits;
}

/**
 * The patient already on the list the details point at: the same e-mail or phone, or the same full
 * name when the message gives no contact. A namesake with another contact is a new person.
 */
export function existingPatient(
  details: NewPatientDetails,
  patients: readonly MatchablePatient[]
): MatchablePatient | undefined {
  const email = details.email?.toLowerCase();
  const phone = phoneDigits(details.phone);
  const byContact = patients.find(
    (patient) =>
      (email && patient.email?.trim().toLowerCase() === email) || (phone && phoneDigits(patient.phone) === phone)
  );
  if (byContact) return byContact;
  if (!details.name || email || phone) return undefined;
  const match = matchPatients(details.name, patients);
  return match.kind === 'one' && !match.partial ? match.patient : undefined;
}

export interface AddPatientReply {
  text: string;
  spec: ChatViewSpec;
}

/**
 * The thread's own answer to „dodaj pacjenta …”: the form filled with everything given so far (this
 * message first, then `earlier` ones of the same exchange), or the patient who is already on the
 * list. Null when the message is not only about adding a patient.
 */
export function addPatientReply(
  text: string,
  patients: readonly MatchablePatient[],
  earlier?: NewPatientDetails
): AddPatientReply | null {
  if (!isAddPatientRequest(text)) return null;
  const spec = withNewPatientDetails({ component: 'AddPatient' }, text, earlier);
  if (spec?.component !== 'AddPatient') return null;
  const existing = existingPatient(spec, patients);
  if (existing) {
    return {
      text: `Na liście pacjentów jest już: ${existing.name}. Poniżej plan tej osoby. Jeśli chodzi o kogoś innego, napisz „dodaj pacjenta” z imieniem, nazwiskiem i e-mailem albo telefonem tej osoby.`,
      spec: { component: 'PatientPeek', patientId: existing.id },
    };
  }
  return {
    text: spec.name
      ? `Uzupełnij brakujące dane w formularzu, a dodam pacjenta: ${spec.name}.`
      : 'Uzupełnij brakujące dane w formularzu, a dodam pacjenta.',
    spec,
  };
}

interface ThreadMessageLike {
  role: 'user' | 'assistant';
  text?: string;
  spec?: { component: string };
}

/**
 * What the therapist wrote about the new patient earlier in the open exchange: the user messages
 * back to the last card. An answer to „Podaj imię i nazwisko” then keeps the e-mail from the first
 * message; a card closes the exchange, so another patient's data never leaks into a new form.
 */
export function threadNewPatientDetails(messages: readonly ThreadMessageLike[]): NewPatientDetails {
  const details: NewPatientDetails = {};
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant') {
      if (message.spec && message.spec.component !== 'Clarify') break;
      continue;
    }
    const earlier = parseNewPatientDetails(message.text ?? '');
    details.name ??= earlier.name;
    details.phone ??= earlier.phone;
    details.email ??= earlier.email;
  }
  return Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined));
}

/**
 * The AddPatient card starts from the therapist's own words: the name as written (the model once
 * turned "Czat-Kowalski" into "Kowalski"), the phone, e-mail and reason, so no field looks filled
 * while it is empty (report 01.11, P0-6). `earlier` is what previous messages of the exchange gave
 * (`threadNewPatientDetails`): the newest message wins, nothing given before is lost.
 */
export function withNewPatientDetails(
  spec: ChatViewSpec | undefined,
  message: string,
  earlier: NewPatientDetails = {}
): ChatViewSpec | undefined {
  if (spec?.component !== 'AddPatient') return spec;
  const details = parseNewPatientDetails(message);
  const name = details.name ?? spec.name ?? earlier.name;
  const merged = {
    ...spec,
    ...(earlier.phone ? { phone: earlier.phone } : {}),
    ...(earlier.email ? { email: earlier.email } : {}),
    ...details,
    name,
  };
  if (name === undefined && !('name' in spec)) delete merged.name;
  return merged;
}
