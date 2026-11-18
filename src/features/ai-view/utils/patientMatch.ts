import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { nameWordMatches, tokenizeWords } from './textMatch';

export interface MatchablePatient {
  id: string;
  name: string;
  /** Reason for therapy, e-mail and account state: only to tell namesakes apart on a choice. */
  contextLabel?: string;
  email?: string;
  isShadowUser?: boolean;
  /** Last activity in the patient app; answers "czy odebrał zestaw?" without the model. */
  lastActivity?: string;
  /** Phone and the day the patient was added: only ever shown as a detail that tells namesakes apart. */
  phone?: string;
  addedAt?: string;
}

export type PatientMatch =
  | { kind: 'none'; consumedWords: string[] }
  | {
      kind: 'one';
      patient: MatchablePatient;
      consumedWords: string[];
      /** Only part of a longer name was said („dla Jana”): good for a question, not for binding the plan. */
      partial: boolean;
    }
  | { kind: 'many'; patients: MatchablePatient[]; consumedWords: string[] };

interface Scored {
  patient: MatchablePatient;
  score: number;
  isFullMatch: boolean;
  consumed: string[];
}

// Words every message about a patient or a set uses. A record named „E2E Pacjent” or „Jan Nowy” still
// matches by its other word; alone they name nobody (test 17.11, K1: „Pacjent z rwą…” → „E2E Pacjent”).
const GENERIC_WORD =
  /^(?:pacjent\w*|pan|pani|pana|panu|panem|panie|pania|nowy|nowa|nowe|nowego|nowej|nowym|zestaw\w*|plan\w*|program\w*|cwicze\w*|dodaj|pokaz|znajdz|utworz)$/;

function scorePatient(patient: MatchablePatient, words: string[]): Scored {
  const nameWords = tokenizeWords(patient.name).filter((word) => word.length >= 2);
  const consumed: string[] = [];
  for (const nameWord of nameWords) {
    const hit = words.find((word) => nameWordMatches(word, nameWord));
    if (hit) consumed.push(hit);
  }
  const isNamed = consumed.some((word) => !GENERIC_WORD.test(word));
  return {
    patient,
    score: isNamed ? consumed.length : 0,
    isFullMatch: nameWords.length > 0 && consumed.length === nameWords.length,
    consumed,
  };
}

/**
 * Finds patients named in a free-text command ("zestaw dla Jana Kowalskiego").
 * Several equally good hits mean the therapist has to pick, never a guess.
 */
export function matchPatients(text: string, patients: readonly MatchablePatient[]): PatientMatch {
  const words = tokenizeWords(text);
  const scored = patients.map((patient) => scorePatient(patient, words)).filter((entry) => entry.score > 0);
  if (scored.length === 0) return { kind: 'none', consumedWords: [] };

  const fullMatches = scored.filter((entry) => entry.isFullMatch && entry.score > 1);
  const pool = fullMatches.length > 0 ? fullMatches : scored;
  const bestScore = Math.max(...pool.map((entry) => entry.score));
  const best = pool.filter((entry) => entry.score === bestScore);
  const consumedWords = [...new Set(best.flatMap((entry) => entry.consumed))];

  if (best.length === 1) {
    return { kind: 'one', patient: best[0].patient, consumedWords, partial: !best[0].isFullMatch };
  }
  return { kind: 'many', patients: best.map((entry) => entry.patient), consumedWords };
}

function accountLabel(patient: MatchablePatient): string | undefined {
  if (patient.isShadowUser === undefined) return undefined;
  return patient.isShadowUser ? 'bez konta' : 'ma konto';
}

const MAX_CONTEXT_LENGTH = 28;
const DAY_FORMAT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'numeric', year: 'numeric' });

function contextDetail(patient: MatchablePatient): string | undefined {
  const label = patient.contextLabel?.trim();
  if (!label) return undefined;
  return label.length > MAX_CONTEXT_LENGTH ? `${label.slice(0, MAX_CONTEXT_LENGTH - 1).trimEnd()}…` : label;
}

function emailDetail(patient: MatchablePatient): string | undefined {
  return patient.email?.trim() || undefined;
}

/** Only the last digits: enough to tell two people apart, not the whole number in the thread. */
function phoneDetail(patient: MatchablePatient): string | undefined {
  const digits = patient.phone?.replace(/\D/g, '') ?? '';
  return digits.length >= 3 ? `tel. …${digits.slice(-3)}` : undefined;
}

function dayDetail(prefix: string, value: string | undefined): string | undefined {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? `${prefix} ${DAY_FORMAT.format(date)}` : undefined;
}

type Detail = (patient: MatchablePatient) => string | undefined;

// In the order a therapist recognizes a patient by. All of it is already on the patient list in the browser.
const DETAILS: readonly Detail[] = [
  contextDetail,
  accountLabel,
  emailDetail,
  phoneDetail,
  (patient) => dayDetail('aktywność', patient.lastActivity),
];
const addedDetail: Detail = (patient) => dayDetail('dodano', patient.addedAt);
/** The name and two details: a label stays short enough for a chip. */
const MAX_DETAILS = 2;

/** „Zieliński” and „Zielinski” are the same name on a chip: case, diacritics and punctuation do not count. */
export function nameKey(name: string): string {
  return tokenizeWords(name).join(' ');
}

interface ChoiceLabel {
  details: string[];
  /** Set when nothing on the list tells the namesakes apart. */
  number?: number;
}

function describeChoices(patients: readonly MatchablePatient[]): ChoiceLabel[] {
  const names = patients.map((patient) => nameKey(patient.name));
  const isNamesake = names.map((name, index) => names.some((other, at) => at !== index && other === name));
  const details: string[][] = patients.map(() => []);
  const lookKey = (index: number) => [names[index], ...details[index].map(normalizeSearchText)].join('|');
  const lookalikes = () => {
    const groups = new Map<string, number[]>();
    patients.forEach((_, index) => {
      if (isNamesake[index]) groups.set(lookKey(index), [...(groups.get(lookKey(index)) ?? []), index]);
    });
    return [...groups.values()];
  };
  const differs = (values: Array<string | undefined>, members: number[]) =>
    new Set(members.map((index) => normalizeSearchText(values[index]))).size > 1;

  const apply = (detail: Detail, limit: number) => {
    const values = patients.map(detail);
    for (const members of lookalikes()) {
      // A namesake left with the bare name would read as "the" Jan Kowalski, so each one gets a detail.
      const isBare = members.length === 1 && details[members[0]].length === 0;
      const rivals = isBare ? names.flatMap((name, at) => (name === names[members[0]] ? [at] : [])) : members;
      // What every candidate shares („Leczenie podstawowe” on both) tells nobody apart and is left out.
      if ((members.length === 1 && !isBare) || !differs(values, rivals)) continue;
      for (const index of members) {
        const value = values[index];
        if (value && details[index].length < limit) details[index].push(value);
      }
    }
  };
  for (const detail of DETAILS) apply(detail, MAX_DETAILS);
  // The last resort, also past the limit: the day the patient was added.
  apply(addedDetail, Number.POSITIVE_INFINITY);

  const numbers = new Map<number, number>();
  for (const members of lookalikes()) {
    if (members.length > 1) members.forEach((index, at) => numbers.set(index, at + 1));
  }
  return patients.map((_, index) => ({ details: details[index], number: numbers.get(index) }));
}

/**
 * Labels for a choice between patients, one per patient and never two the same. Patients with the
 * same name (also „Zieliński”/„Zielinski”) get what really tells them apart, at most two details:
 * reason for therapy, account, e-mail, end of the phone number, last activity. A detail all of them
 * share is left out; the day the patient was added and then a number are the last resort.
 */
export function patientChoiceLabels(patients: readonly MatchablePatient[]): string[] {
  return describeChoices(patients).map(({ details, number }, index) => {
    const label = [patients[index].name, ...details].join(' · ');
    return number ? `${label} (${number})` : label;
  });
}

function namesakesOf(patient: MatchablePatient, patients: readonly MatchablePatient[]): MatchablePatient[] {
  const key = nameKey(patient.name);
  const namesakes = patients.filter((candidate) => nameKey(candidate.name) === key);
  return namesakes.some((candidate) => candidate.id === patient.id) ? namesakes : [patient, ...namesakes];
}

/** The label of one patient as a choice among the namesakes would show it; the bare name when there are none. */
export function patientLabel(patient: MatchablePatient, patients: readonly MatchablePatient[]): string {
  const namesakes = namesakesOf(patient, patients);
  return patientChoiceLabels(namesakes)[namesakes.findIndex((candidate) => candidate.id === patient.id)];
}

/**
 * „Tomasz Nowak (Ból kolana · bez konta)”: whom a confirmation asks about. Namesakes get the details
 * of a choice between them; anyone else the first two the list has, so the therapist sees who it is.
 */
export function patientConfirmLabel(patient: MatchablePatient, patients: readonly MatchablePatient[]): string {
  const namesakes = namesakesOf(patient, patients);
  const own = describeChoices(namesakes)[namesakes.findIndex((candidate) => candidate.id === patient.id)];
  const details =
    namesakes.length > 1
      ? [...own.details, ...(own.number ? [`${own.number}`] : [])]
      : [contextDetail, emailDetail, accountLabel, phoneDetail]
          .flatMap((detail) => detail(patient) ?? [])
          .slice(0, MAX_DETAILS);
  return details.length > 0 ? `${patient.name} (${details.join(' · ')})` : patient.name;
}

/** Someone else on the list has the same name: a typed or clicked name cannot say which one is meant. */
export function hasNamesake(patientId: string, patients: readonly MatchablePatient[]): boolean {
  const patient = patients.find((candidate) => candidate.id === patientId);
  if (!patient) return false;
  return patients.some((other) => other.id !== patientId && nameKey(other.name) === nameKey(patient.name));
}
