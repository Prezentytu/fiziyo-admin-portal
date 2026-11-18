import {
  matchPatients,
  nameKey,
  patientChoiceLabels,
  patientConfirmLabel,
  type MatchablePatient,
} from './patientMatch';
import { tokenizeWords } from './textMatch';
import type { ChatViewSpec, ClarifyChoice } from './viewSpec';

type ClarifySpec = Extract<ChatViewSpec, { component: 'Clarify' }>;
type SetDraftSpec = Extract<ChatViewSpec, { component: 'SetDraft' }>;

/** The choice behind each option, in option order: two options reading the same keep their own choice. */
function choicesByOption(spec: ClarifySpec): Array<ClarifyChoice | undefined> {
  const seen = new Map<string, number>();
  return spec.options.map((option) => {
    const nth = seen.get(option) ?? 0;
    seen.set(option, nth + 1);
    return (spec.choices ?? []).filter((choice) => choice.label === option)[nth];
  });
}

function choiceAt(spec: ClarifySpec, option: string, index?: number): ClarifyChoice | undefined {
  const byIndex = index === undefined ? undefined : choicesByOption(spec)[index];
  return byIndex?.label === option ? byIndex : spec.choices?.find((entry) => entry.label === option);
}

/**
 * A Clarify answer the backend tied to a set opens that set's draft in the thread, without asking
 * the model again (report 01.11, P0-3: every click cost a credit and could loop). Any other answer
 * still goes to the model as the next message, so this returns null.
 */
export function resolveClarifyChoice(spec: ClarifySpec, option: string, index?: number): SetDraftSpec | null {
  const choice = choiceAt(spec, option, index);
  if (!choice?.setId) return null;
  return { component: 'SetDraft', setId: choice.setId, patientId: choice.patientId, exerciseIds: [] };
}

/** The patient a clicked answer stands for, when the answer is a patient and nothing else. */
export function clarifyChoicePatientId(spec: ClarifySpec, option: string, index: number): string | undefined {
  const choice = choiceAt(spec, option, index);
  return choice && !choice.setId ? choice.patientId : undefined;
}

/**
 * The backend labels a patient answer with the bare name, so namesakes come as identical chips
 * (test 17.11, K3). Repeated patient labels (also „Zieliński”/„Zielinski”) get what tells the patients
 * apart; the ids stay. The details never leave the browser: a patient answer is picked by id, locally.
 */
export function labelPatientChoices(spec: ClarifySpec, patients: readonly MatchablePatient[]): ClarifySpec {
  if (!spec.choices || new Set(spec.options.map(nameKey)).size === spec.options.length) return spec;
  const byId = new Map(patients.map((patient) => [patient.id, patient]));
  const paired = choicesByOption(spec).map((choice) => {
    const patient = choice?.patientId && !choice.setId ? byId.get(choice.patientId) : undefined;
    return { choice, patient };
  });
  const known = paired.flatMap((entry) => (entry.patient ? [entry.patient] : []));
  if (known.length < 2) return spec;
  const labels = patientChoiceLabels(known);
  let next = 0;
  const relabelled = paired.map(({ choice, patient }, index) => {
    const label = patient ? labels[next++] : spec.options[index];
    return { label, choice: choice ? { ...choice, label } : undefined };
  });
  return {
    ...spec,
    options: relabelled.map((entry) => entry.label),
    choices: relabelled.flatMap((entry) => (entry.choice ? [entry.choice] : [])),
  };
}

/** Second answer to „Czy chodzi o…?”: opens the patient choice. */
export const OTHER_PATIENT_OPTION = 'Inny pacjent';

/**
 * „Czy chodzi o Tomasz Nowak (Ból kolana)?” with „Tak, Tomasz” and „Inny pacjent”: asked when a patient
 * was named by one word only (owner's decision 18.11: ask, then go on with the therapist's permission).
 */
export function confirmPatientSpec(patient: MatchablePatient, patients: readonly MatchablePatient[]): ClarifySpec {
  const yes = `Tak, ${patient.name.trim().split(/\s+/)[0]}`;
  return {
    component: 'Clarify',
    question: `Czy chodzi o ${patientConfirmLabel(patient, patients)}?`,
    options: [yes, OTHER_PATIENT_OPTION],
    choices: [{ label: yes, patientId: patient.id }, { label: OTHER_PATIENT_OPTION }],
  };
}

/** The patient a „Czy chodzi o…?” question asks about and its „Tak” answer; null for any other card. */
export function patientConfirmation(
  spec: { component: string } | undefined
): { patientId: string; yesOption: string } | null {
  if (spec?.component !== 'Clarify') return null;
  const { options, choices } = spec as ClarifySpec;
  const patientId = choices?.[0]?.patientId;
  if (options.length !== 2 || options[1] !== OTHER_PATIENT_OPTION || !patientId || choices?.[0]?.setId) return null;
  return { patientId, yesOption: options[0] };
}

const YES_WORDS = new Set(['tak', 'ok', 'okej', 'dobrze', 'zgadza', 'sie', 'dokladnie', 'potwierdzam', 'jasne']);
const OTHER_ANSWER = /^(?:nie|(?:nie )?(?:inn\w+|kto\w* inn\w+)(?: pacjent\w*| osob\w*)?)$/;

/**
 * A typed answer to „Czy chodzi o…?”: „tak”, „Tak, Tomasz” or the same name again confirm, „nie” and
 * „inny pacjent” open the choice. Anything else is a new message (null).
 */
export function confirmAnswer(
  text: string,
  patientId: string,
  patients: readonly MatchablePatient[]
): 'yes' | 'other' | null {
  const words = tokenizeWords(text);
  if (words.length === 0) return null;
  if (OTHER_ANSWER.test(words.join(' '))) return 'other';
  const patient = patients.find((candidate) => candidate.id === patientId);
  const named = patient ? matchPatients(text, [patient]) : undefined;
  const nameWords = new Set(named?.consumedWords ?? []);
  const rest = words.filter((word) => !nameWords.has(word));
  const saysYes = rest.some((word) => YES_WORDS.has(word));
  if (!saysYes && nameWords.size === 0) return null;
  return rest.every((word) => YES_WORDS.has(word)) ? 'yes' : null;
}
