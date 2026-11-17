import { patientChoiceLabels, type MatchablePatient } from './patientMatch';
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
 * (test 17.11, K3). Repeated patient labels get what tells the patients apart; the ids stay.
 */
export function labelPatientChoices(spec: ClarifySpec, patients: readonly MatchablePatient[]): ClarifySpec {
  if (!spec.choices || new Set(spec.options).size === spec.options.length) return spec;
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
