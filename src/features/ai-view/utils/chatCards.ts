import type { ProductHelpSpec } from './productHelp';
import type { SchedulePlan } from './schedulePlan';
import type { NewPatientDetails } from './newPatientDetails';
import type { SetDraftPayload, SetDraftReturn } from './setDraft';
import type { CountFocus } from './threadLocalReply';
import type { ChatViewSpec } from './viewSpec';

interface ThreadMessageLike {
  role: 'user' | 'assistant';
  spec?: ChatCardSpec;
}

/** One position of a document or visit note, matched to the catalog when the import found a match. */
export interface DocumentItem {
  name: string;
  description?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  matchedExerciseId?: string;
  matchedName?: string;
  /** An uncertain match ("czy chodziło o…?"): used only after the therapist confirms it. */
  suggestedExerciseId?: string;
  suggestedName?: string;
}

/**
 * Cards the thread adds itself, between the dispatcher's card and the save: they carry the
 * therapist's decisions (exercise list, schedule) and never come from the model.
 */
export type LocalCardSpec =
  | ProductHelpSpec
  | {
      component: 'PickPatient';
      /** Absent after „Inny pacjent”: the pick then finishes the command behind the question. */
      draft?: SetDraftPayload;
      /** A typed answer fitting several patients: only these are offered. */
      patientIds?: string[];
      /** A typed answer naming no known patient: the new patient form opens with it. */
      newPatient?: NewPatientDetails;
    }
  | { component: 'Schedule'; draft: SetDraftPayload }
  /** „Jak często?” before a set is saved in the catalog without a patient; the pick saves it. */
  | { component: 'CatalogFrequency'; draft: SetDraftPayload; description?: string }
  | { component: 'SendSummary'; draft: SetDraftPayload; plan: SchedulePlan }
  | { component: 'Sent'; patientId: string; setName: string; planLabel: string }
  /** `draft` (from 18.11) lets the card assign the saved set to a patient; older history has none. */
  | { component: 'SetSaved'; setId: string; name: string; draft?: SetDraftPayload }
  | { component: 'PatientAdded'; patientId: string; name: string }
  | {
      component: 'ExerciseCreated';
      exerciseId: string;
      name: string;
      patientId?: string;
      addToSet?: SetDraftReturn;
      hasImage?: boolean;
    }
  | { component: 'ScanVisit'; patientId?: string }
  | { component: 'ExerciseIdeas'; query: string; patientId?: string; forSet?: SetDraftReturn }
  | { component: 'CatalogCounts'; focus: CountFocus }
  | { component: 'DocumentResult'; fileName: string; items: DocumentItem[]; patientId?: string };

export type ChatCardSpec = ChatViewSpec | LocalCardSpec;

// Keyed by the union, so a new card does not compile until stored history accepts it.
const CARD_COMPONENTS = {
  SetDraft: true,
  AssignSummary: true,
  ExerciseResults: true,
  PatientPeek: true,
  Navigate: true,
  Clarify: true,
  AddPatient: true,
  CreateExercise: true,
  PickPatient: true,
  Schedule: true,
  CatalogFrequency: true,
  SendSummary: true,
  Sent: true,
  SetSaved: true,
  PatientAdded: true,
  ExerciseCreated: true,
  ScanVisit: true,
  DocumentResult: true,
  ExerciseIdeas: true,
  CatalogCounts: true,
  ProductHelp: true,
} satisfies Record<ChatCardSpec['component'], true>;

export function isCardComponent(component: string): boolean {
  return Object.hasOwn(CARD_COMPONENTS, component);
}

/** The patient a card is about; the latest one names the conversation's context chip. */
export function cardPatientId(spec: ChatCardSpec | undefined): string | undefined {
  if (!spec) return undefined;
  switch (spec.component) {
    case 'SetDraft':
    case 'ExerciseResults':
    case 'PatientPeek':
    case 'AssignSummary':
    case 'Sent':
    case 'PatientAdded':
    case 'ExerciseCreated':
    case 'ScanVisit':
    case 'DocumentResult':
    case 'ExerciseIdeas':
      return spec.patientId;
    case 'PickPatient':
      return spec.draft?.patientId;
    case 'Schedule':
    case 'SendSummary':
      return spec.draft.patientId;
    default:
      return undefined;
  }
}

/** The patient of the latest card that names one: whom the conversation is about right now. */
export function latestCardPatientId(messages: readonly ThreadMessageLike[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'assistant') continue;
    const patientId = cardPatientId(message.spec);
    if (patientId) return patientId;
  }
  return undefined;
}

/** Every patient a card of the conversation is about: named once, one word of the name is enough later. */
export function cardPatientIds(messages: readonly ThreadMessageLike[]): Set<string> {
  const ids = messages.flatMap((message) => (message.role === 'assistant' ? (cardPatientId(message.spec) ?? []) : []));
  return new Set(ids);
}

/** A patient the therapist opened in the context panel, and how long the thread was at that moment. */
export interface PinnedPatient {
  patientId: string;
  messageCount: number;
}

/**
 * Whom the conversation is about: the patient opened in the context panel, until a later card is
 * about someone else. A pin that outlived such a card kept the old patient as the one model cards
 * were checked against (test 17.11, K1b).
 */
export function conversationPatientId(
  messages: readonly ThreadMessageLike[],
  pin: PinnedPatient | undefined
): string | undefined {
  if (!pin) return latestCardPatientId(messages);
  return latestCardPatientId(messages.slice(pin.messageCount)) ?? pin.patientId;
}
