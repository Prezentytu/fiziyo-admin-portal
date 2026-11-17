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

/**
 * Labels for a choice between patients, one per patient and never two the same: namesakes get what
 * tells them apart (reason for therapy, then e-mail, then account), and a number when nothing does.
 */
export function patientChoiceLabels(patients: readonly MatchablePatient[]): string[] {
  const labels = patients.map((patient) => patient.name);
  const isRepeated = (index: number) => labels.some((label, other) => other !== index && label === labels[index]);
  const isNamesake = patients.map((_, index) => isRepeated(index));
  const hasDetail = patients.map(() => false);
  const details: Array<(patient: MatchablePatient) => string | undefined> = [
    (patient) => patient.contextLabel?.trim() || undefined,
    (patient) => patient.email?.trim() || undefined,
    accountLabel,
  ];
  for (const detail of details) {
    // A namesake left with the bare name would read as "the" Jan Kowalski, so each one gets a detail.
    const needsDetail = patients.map((_, index) => isNamesake[index] && (isRepeated(index) || !hasDetail[index]));
    patients.forEach((patient, index) => {
      const value = detail(patient);
      if (!needsDetail[index] || !value) return;
      labels[index] = `${labels[index]} · ${value}`;
      hasDetail[index] = true;
    });
  }
  const repeated = patients.map((_, index) => isRepeated(index));
  const counters = new Map<string, number>();
  return labels.map((label, index) => {
    if (!repeated[index]) return label;
    const number = (counters.get(label) ?? 0) + 1;
    counters.set(label, number);
    return `${label} (${number})`;
  });
}

/** Someone else on the list has the same name: a typed or clicked name cannot say which one is meant. */
export function hasNamesake(patientId: string, patients: readonly MatchablePatient[]): boolean {
  const key = (name: string) => tokenizeWords(name).join(' ');
  const patient = patients.find((candidate) => candidate.id === patientId);
  if (!patient) return false;
  return patients.some((other) => other.id !== patientId && key(other.name) === key(patient.name));
}
