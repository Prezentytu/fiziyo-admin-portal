import type { SchedulePlan } from './schedulePlan';
import type { SetDraftPayload } from './setDraft';
import type { ChatViewSpec } from './viewSpec';

/** One position of a document or visit note, matched to the catalog when the import found a match. */
export interface DocumentItem {
  name: string;
  description?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  matchedExerciseId?: string;
  matchedName?: string;
}

/**
 * Cards the thread adds itself, between the dispatcher's card and the save: they carry the
 * therapist's decisions (exercise list, schedule) and never come from the model.
 */
export type LocalCardSpec =
  | { component: 'PickPatient'; draft: SetDraftPayload }
  | { component: 'Schedule'; draft: SetDraftPayload }
  | { component: 'SendSummary'; draft: SetDraftPayload; plan: SchedulePlan }
  | { component: 'Sent'; patientId: string; setName: string; planLabel: string }
  | { component: 'SetSaved'; setId: string; name: string }
  | { component: 'ScanVisit'; patientId?: string }
  | { component: 'DocumentResult'; fileName: string; items: DocumentItem[]; patientId?: string };

export type ChatCardSpec = ChatViewSpec | LocalCardSpec;

export const LOCAL_CARD_COMPONENTS: ReadonlySet<string> = new Set([
  'PickPatient',
  'Schedule',
  'SendSummary',
  'Sent',
  'SetSaved',
  'ScanVisit',
  'DocumentResult',
]);

/** The patient a card is about; the latest one names the conversation's context chip. */
export function cardPatientId(spec: ChatCardSpec | undefined): string | undefined {
  if (!spec) return undefined;
  switch (spec.component) {
    case 'SetDraft':
    case 'ExerciseResults':
    case 'PatientPeek':
      return spec.patientId;
    case 'AssignSummary':
    case 'Sent':
      return spec.patientId;
    case 'PickPatient':
    case 'Schedule':
    case 'SendSummary':
      return spec.draft.patientId;
    case 'ScanVisit':
    case 'DocumentResult':
      return spec.patientId;
    default:
      return undefined;
  }
}
