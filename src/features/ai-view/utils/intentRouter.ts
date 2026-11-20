import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { withoutDeclinedSet } from './exerciseDiscussion';
import { confirmPatientSpec } from './clarifyChoice';
import { parseNewPatientDetails } from './newPatientDetails';
import { matchPatients, patientChoiceLabels, type MatchablePatient } from './patientMatch';
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
const ADD_PATIENT_PATTERN = /(dodaj|dopisz|stworz|utworz|zarejestruj|nowy|nowa|nowego|nowej|zaloz)\w* (?:mi )?pacjent/;
// The singular object matters: a catalog search, a set, and a list of exercises have their own flow.
const CREATE_VERB =
  /^(?:prosze[ ,]+)?(?:zrobmy|zrob|utworz|stworz|dodaj|przygotuj|zaproponuj|uloz|daj|chce(?: (?:stworzyc|utworzyc))?|(?:po)?prosze(?: o)?)\s+(?:mi\s+)?/;
const SINGLE_EXERCISE = /^(?:(?:jedno|nowe|wlasne|pojedyncze)\s+)*cwiczenie\b/;
const MENTIONS_SET = /\b(?:zestaw\w*|plan(?:u|em|ie|y|ow)?|program(?:u|em|ie|y|ow)?)\b/;
const SET_PATTERN = /zestaw|plan|przypisz|program/;
const SEARCH_PATTERN = /znajdz|wyszukaj|szukaj|cwiczeni|cwiczen/;
const NAVIGATE_VERB_PATTERN = /^(przejdz|otworz|pokaz|idz)\b/;
const NO_PATIENT_PATTERN = /^bez pacjent/;

/** First answer to "Dla kogo?": a set to try the app or keep in the catalog needs no patient. */
export const NO_PATIENT_OPTION = 'Bez pacjenta';

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
  'uloz',
  'razu',
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

/**
 * Every answer carries the patient id, so a click picks that patient and not a name: two „Jan Kowalski”
 * used to give two identical chips that asked the same question again (test 17.11, K3).
 */
export function askWhichPatient(
  patients: readonly MatchablePatient[],
  question: string,
  firstOption?: string
): ChatViewSpec {
  const offered = patients.slice(0, MAX_CLARIFY_OPTIONS - (firstOption ? 1 : 0));
  const choices = patientChoiceLabels(offered).map((label, index) => ({ label, patientId: offered[index].id }));
  const all = firstOption ? [{ label: firstOption }, ...choices] : choices;
  return { component: 'Clarify', question, options: all.map((choice) => choice.label), choices: all };
}

function navigateTarget(normalized: string): [RegExp, NavigateRoute] | null {
  if (!NAVIGATE_VERB_PATTERN.test(normalized)) return null;
  return NAVIGATE_TARGETS.find(([pattern]) => pattern.test(normalized)) ?? null;
}

/**
 * Rule-based dispatcher used without AI (organization opted out, no credits, model down).
 * Produces the same specs as the model, so both paths share one renderer. `pendingCommand` is the
 * message a question ("O kogo chodzi?") was about: a reply that only names one patient finishes that command.
 * `knownPatientIds` are the patients the conversation already has (the header chip, earlier cards): one
 * word of their name is enough, anyone else named by one word is confirmed first („Czy chodzi o…?”).
 */
export function routeIntent(
  text: string,
  context: IntentContext,
  pendingCommand?: string,
  knownPatientIds?: ReadonlySet<string>
): ChatViewSpec {
  // Only a bare answer ("Ewa Nowicka", "Jan na lędźwie") finishes the pending command; a new request wins.
  if (pendingCommand) {
    const answer = routeCommand(text, context, { knownPatientIds });
    if (answer.component === 'PatientPeek' && answer.patientId) {
      return routeForPatient(`${pendingCommand} ${text}`, context, answer.patientId);
    }
  }
  return routeCommand(text, context, { knownPatientIds });
}

/**
 * The command finished for the patient the therapist picked from a choice (by id, never by name).
 * Without a command the pick opens that patient's plan.
 */
export function routeForPatient(command: string | undefined, context: IntentContext, patientId: string): ChatViewSpec {
  const spec = command?.trim() ? routeCommand(command, context, { patientId }) : UNSUPPORTED_SPEC;
  const keepsPatient = 'patientId' in spec && spec.patientId === patientId;
  return keepsPatient ? spec : { component: 'PatientPeek', patientId };
}

function routeCommand(
  text: string,
  context: IntentContext,
  options: { patientId?: string; knownPatientIds?: ReadonlySet<string> } = {}
): ChatViewSpec {
  const normalized = normalizeSearchText(text).trim();
  if (!normalized) return UNSUPPORTED_SPEC;

  if (NO_PATIENT_PATTERN.test(normalized)) return { component: 'SetDraft', exerciseIds: [] };
  if (INACTIVE_PATTERN.test(normalized)) return { component: 'PatientPeek', filter: 'inactive' };
  if (ADD_PATIENT_PATTERN.test(normalized)) return { component: 'AddPatient', name: parseNewPatientDetails(text).name };
  const exercise = singleExerciseRequest(text, context.patients);
  if (exercise) return exercise;

  const target = navigateTarget(normalized);
  if (target && !SET_PATTERN.test(normalized)) return { component: 'Navigate', route: target[1] };

  const patientMatch = matchPatients(text, context.patients);
  if (!options.patientId) {
    if (patientMatch.kind === 'many') {
      return askWhichPatient(patientMatch.patients, 'Masz kilku pacjentów o tym imieniu. O kogo chodzi?');
    }
    // One word of a longer name ("dla Jana") is a guess: the plan is bound only after a confirmation.
    if (patientMatch.kind === 'one' && patientMatch.partial && !options.knownPatientIds?.has(patientMatch.patient.id)) {
      return confirmPatientSpec(patientMatch.patient, context.patients);
    }
  }
  const patientId = options.patientId ?? (patientMatch.kind === 'one' ? patientMatch.patient.id : undefined);
  const topic = topicWords(text, patientMatch.consumedWords);

  // "przejdź do zestawów" names only the screen; anything more ("pokaż zestaw na kolano") is a request.
  if (target && !patientId && topic.every((word) => target[0].test(word) || NAVIGATE_VERB_PATTERN.test(word))) {
    return { component: 'Navigate', route: target[1] };
  }

  if (SET_PATTERN.test(normalized)) {
    const set = topic.length > 0 ? findBestSet(context.sets, topic) : null;
    if (set) return { component: 'SetDraft', patientId, setId: set.id, exerciseIds: [] };
    if (topic.length > 0) return { component: 'ExerciseResults', query: topic.join(' '), exerciseIds: [], patientId };
    if (patientId) return { component: 'PatientPeek', patientId };
    if (context.patients.length === 0) return { component: 'Navigate', route: 'patient-new' };
    return askWhichPatient(
      context.patients,
      'Dla kogo? Zacznij bez pacjenta, wybierz pacjenta albo napisz imię i nazwisko.',
      NO_PATIENT_OPTION
    );
  }

  if (SEARCH_PATTERN.test(normalized) && topic.length > 0) {
    return { component: 'ExerciseResults', query: topic.join(' '), exerciseIds: [], patientId };
  }

  if (patientId) return { component: 'PatientPeek', patientId };
  return UNSUPPORTED_SPEC;
}

/**
 * A request about a patient is not a catalog exercise: it keeps its patient flow, and a patient's name
 * never becomes the name of an exercise the whole organization sees.
 */
export function singleExerciseRequest(
  text: string,
  patients: readonly MatchablePatient[]
): Extract<ChatViewSpec, { component: 'CreateExercise' }> | null {
  const original = withoutDeclinedSet(text.normalize('NFC'));
  const normalized = normalizeSearchText(original);
  if (MENTIONS_SET.test(normalized) || /pacjent/.test(normalized)) return null;
  if (matchPatients(original, patients).kind !== 'none') return null;
  const lookup = /^(?:jakie (?:mamy|sa dostepne) (?:juz )?cwiczeni[ae]|jakie cwiczenia mamy)(?: w katalogu)?\b/.exec(
    normalized
  );
  if (lookup) {
    const subject = original
      .slice(lookup[0].length)
      .replace(/^\s*(?:na |przy )?|[?.!]+$/g, '')
      .trim();
    return { component: 'CreateExercise', name: subject || undefined };
  }
  const verb = normalized.match(CREATE_VERB)?.[0] ?? '';
  const object = normalized.slice(verb.length);
  // Bare „ćwiczenie nie działa” describes a problem. „Ćwiczenie na stopę” requests one.
  if (!verb && !/^(?:nowe |jedno |cwiczenie (?:na|przy) )/.test(object)) return null;
  const prefix = SINGLE_EXERCISE.exec(object);
  if (!prefix) return null;

  const topic = original.slice(verb.length + prefix[0].length).replace(/^[\s:,–-]+|[.!?\s]+$/g, '');
  const name = /^(?:na|przy|dla)\s/i.test(topic) ? `Ćwiczenie ${topic}` : topic;
  return { component: 'CreateExercise', name: name || undefined };
}
