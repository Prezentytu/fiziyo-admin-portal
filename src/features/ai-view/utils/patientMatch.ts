import { nameWordMatches, tokenizeWords } from './textMatch';

export interface MatchablePatient {
  id: string;
  name: string;
}

export type PatientMatch =
  | { kind: 'none'; consumedWords: string[] }
  | { kind: 'one'; patient: MatchablePatient; consumedWords: string[] }
  | { kind: 'many'; patients: MatchablePatient[]; consumedWords: string[] };

interface Scored {
  patient: MatchablePatient;
  score: number;
  isFullMatch: boolean;
  consumed: string[];
}

function scorePatient(patient: MatchablePatient, words: string[]): Scored {
  const nameWords = tokenizeWords(patient.name).filter((word) => word.length >= 2);
  const consumed: string[] = [];
  for (const nameWord of nameWords) {
    const hit = words.find((word) => nameWordMatches(word, nameWord));
    if (hit) consumed.push(hit);
  }
  return {
    patient,
    score: consumed.length,
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

  if (best.length === 1) return { kind: 'one', patient: best[0].patient, consumedWords };
  return { kind: 'many', patients: best.map((entry) => entry.patient), consumedWords };
}
