import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { matchPatients, type MatchablePatient } from './patientMatch';
import { tokenizeWords, wordMatches } from './textMatch';
import { MAX_CLARIFY_OPTIONS, UNSUPPORTED_SPEC, type ChatViewSpec, type NavigateRoute } from './viewSpec';

export interface MatchableSet {
  id: string;
  name: string;
  description?: string | null;
}

export interface IntentContext {
  patients: readonly MatchablePatient[];
  sets: readonly MatchableSet[];
}

const INACTIVE_PATTERN = /nie cwicz|nieaktywn|kto nie|bez trening|zaniedbuj/;
const ADD_PATIENT_PATTERN = /(dodaj|nowy|nowa|nowego|nowej|zaloz)\w* pacjent/;
const SET_PATTERN = /zestaw|plan|przypisz|program/;
const SEARCH_PATTERN = /znajdz|wyszukaj|szukaj|cwiczeni|cwiczen/;
const NAVIGATE_VERB_PATTERN = /^(przejdz|otworz|pokaz|idz)\b/;

const NAVIGATE_TARGETS: Array<[RegExp, NavigateRoute]> = [
  [/pacjen/, 'patients'],
  [/zestaw/, 'exercise-sets'],
  [/cwiczen|katalog/, 'exercises'],
  [/weryfikac/, 'verification'],
  [/ustawien/, 'settings'],
];

const STOP_WORDS = new Set([
  'dla',
  'na',
  'do',
  'ze',
  'od',
  'po',
  'przy',
  'oraz',
  'mi',
  'mu',
  'jej',
  'jego',
  'ich',
  'mnie',
  'pod',
  'prosze',
  'pokaz',
  'zrob',
  'przygotuj',
  'utworz',
  'stworz',
  'przypisz',
  'daj',
  'dobierz',
  'chce',
  'potrzebuje',
  'zestaw',
  'zestawu',
  'zestawy',
  'plan',
  'planu',
  'program',
  'nowy',
  'nowa',
  'cwiczenia',
  'cwiczen',
  'cwiczenie',
  'cwiczeniami',
  'znajdz',
  'wyszukaj',
  'szukaj',
  'pacjent',
  'pacjenta',
  'pacjentka',
  'pacjentki',
  'pacjentce',
  'pacjentowi',
  'jakies',
  'jakie',
  'kilka',
]);

function topicWords(text: string, consumedWords: readonly string[]): string[] {
  const consumed = new Set(consumedWords);
  return tokenizeWords(text).filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !consumed.has(word));
}

function setScore(set: MatchableSet, topic: readonly string[]): number {
  const nameWords = tokenizeWords(set.name);
  const descriptionWords = tokenizeWords(set.description);
  let score = 0;
  for (const word of topic) {
    if (nameWords.some((nameWord) => wordMatches(nameWord, word))) score += 2;
    else if (descriptionWords.some((descriptionWord) => wordMatches(descriptionWord, word))) score += 1;
  }
  return score;
}

export function findBestSet(sets: readonly MatchableSet[], topic: readonly string[]): MatchableSet | null {
  let best: MatchableSet | null = null;
  let bestScore = 0;
  for (const set of sets) {
    const score = setScore(set, topic);
    if (score > bestScore) {
      best = set;
      bestScore = score;
    }
  }
  return best;
}

function askWhichPatient(patients: readonly MatchablePatient[], question: string): ChatViewSpec {
  return {
    component: 'Clarify',
    question,
    options: patients.slice(0, MAX_CLARIFY_OPTIONS).map((patient) => patient.name),
  };
}

function navigateTarget(normalized: string): NavigateRoute | null {
  if (!NAVIGATE_VERB_PATTERN.test(normalized)) return null;
  const hit = NAVIGATE_TARGETS.find(([pattern]) => pattern.test(normalized));
  return hit ? hit[1] : null;
}

/**
 * Rule-based dispatcher used without AI (organization opted out, no credits, model down).
 * Produces the same specs as the model, so both paths share one renderer.
 */
export function routeIntent(text: string, context: IntentContext): ChatViewSpec {
  const normalized = normalizeSearchText(text).trim();
  if (!normalized) return UNSUPPORTED_SPEC;

  if (INACTIVE_PATTERN.test(normalized)) return { component: 'PatientPeek', filter: 'inactive' };
  if (ADD_PATIENT_PATTERN.test(normalized)) return { component: 'Navigate', route: 'patient-new' };

  const route = navigateTarget(normalized);
  if (route && !SET_PATTERN.test(normalized)) return { component: 'Navigate', route };

  const patientMatch = matchPatients(text, context.patients);
  if (patientMatch.kind === 'many') {
    return askWhichPatient(patientMatch.patients, 'Masz kilku pacjentów o tym imieniu. O kogo chodzi?');
  }
  const patientId = patientMatch.kind === 'one' ? patientMatch.patient.id : undefined;
  const topic = topicWords(text, patientMatch.consumedWords);

  if (SET_PATTERN.test(normalized)) {
    const set = topic.length > 0 ? findBestSet(context.sets, topic) : null;
    if (set) return { component: 'SetDraft', patientId, setId: set.id, exerciseIds: [] };
    if (topic.length > 0) return { component: 'ExerciseResults', query: topic.join(' '), exerciseIds: [], patientId };
    if (patientId) return { component: 'PatientPeek', patientId };
    if (context.patients.length === 0) return { component: 'Navigate', route: 'patient-new' };
    return askWhichPatient(context.patients, 'Dla kogo? Wybierz pacjenta albo napisz imię i nazwisko.');
  }

  if (SEARCH_PATTERN.test(normalized) && topic.length > 0) {
    return { component: 'ExerciseResults', query: topic.join(' '), exerciseIds: [], patientId };
  }

  if (patientId) return { component: 'PatientPeek', patientId };
  return UNSUPPORTED_SPEC;
}
