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
const PHONE_LABEL = /^(?:tel(?:efon)?|nr|numer)\.?\s*:?\s*/i;
// From here on the message is about the plan, not the patient ("i od razu ułóż mu zestaw: clamshell…").
const PLAN_TALK = /(?:^|[^\p{L}])(?:zestaw|u[łl][óo][żz]|plan|[ćc]wicze)/iu;
const NAME_END = /\s+(?:i|oraz|a)\s+|[,;:.]/;
const MAX_CONTEXT_LABEL = 80;

/** "dodaj pacjentkę Anna Czat-Nowak, tel 600 100 200, ból lędźwi od pół roku" → name, phone, reason. */
export function parseNewPatientDetails(text: string): NewPatientDetails {
  const email = text.match(EMAIL)?.[0];
  const phone = text.match(PHONE)?.[0]?.trim();
  const [head = '', ...segments] = text.split(/[,;]/);

  const details: NewPatientDetails = {};
  const name = nameAfterKeyword(head);
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

function nameAfterKeyword(head: string): string | undefined {
  const words = head.trim().split(/\s+/);
  const index = words.findIndex((word) => PATIENT_KEYWORD.test(word));
  if (index < 0) return undefined;
  const rest = words
    .slice(index + 1)
    .join(' ')
    .replace(/^[:\-–\s]+/, '')
    .split(NAME_END)[0]
    .trim();
  // A name is a few capitalized words; "dodaj pacjenta na jutro" names no one.
  const nameWords = rest.split(/\s+/).filter(Boolean);
  if (nameWords.length === 0 || nameWords.length > 4) return undefined;
  if (!nameWords.every((word) => /^\p{Lu}/u.test(word))) return undefined;
  return rest;
}

/**
 * The AddPatient card starts from the therapist's own words: the name as written (the model once
 * turned "Czat-Kowalski" into "Kowalski"), the phone, e-mail and reason, so no field looks filled
 * while it is empty (report 01.11, P0-6).
 */
export function withNewPatientDetails(spec: ChatViewSpec | undefined, message: string): ChatViewSpec | undefined {
  if (spec?.component !== 'AddPatient') return spec;
  const details = parseNewPatientDetails(message);
  return { ...spec, ...details, name: details.name ?? spec.name };
}
