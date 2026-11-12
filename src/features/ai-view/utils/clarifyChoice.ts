import type { ChatViewSpec } from './viewSpec';

type ClarifySpec = Extract<ChatViewSpec, { component: 'Clarify' }>;
type SetDraftSpec = Extract<ChatViewSpec, { component: 'SetDraft' }>;

/**
 * A Clarify answer the backend tied to a set opens that set's draft in the thread, without asking
 * the model again (report 01.11, P0-3: every click cost a credit and could loop). Any other answer
 * still goes to the model as the next message, so this returns null.
 */
export function resolveClarifyChoice(spec: ClarifySpec, option: string): SetDraftSpec | null {
  const choice = spec.choices?.find((entry) => entry.label === option);
  if (!choice?.setId) return null;
  return { component: 'SetDraft', setId: choice.setId, patientId: choice.patientId, exerciseIds: [] };
}
