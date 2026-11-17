import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { labelPatientChoices } from './clarifyChoice';
import { routeIntent, type IntentContext } from './intentRouter';
import { matchPatients } from './patientMatch';
import { withNewPatientDetails } from './newPatientDetails';
import { describeSpec } from './replyText';
import type { ChatViewSpec } from './viewSpec';

export type DispatchFailure = 'unavailable' | 'insufficient_credits' | 'unauthorized';

export class ChatDispatchError extends Error {
  readonly reason: DispatchFailure;

  constructor(reason: DispatchFailure, message: string) {
    super(message);
    this.name = 'ChatDispatchError';
    this.reason = reason;
  }
}

export interface DispatchResult {
  sessionId: string;
  /** Model's sentence; absent from older backends, then the rules sentence stands in. */
  text?: string;
  /** Absent when the model answered in words only. */
  spec?: ChatViewSpec;
  creditsUsed: number;
}

export type Dispatcher = (message: string, sessionId?: string, signal?: AbortSignal) => Promise<DispatchResult>;

export interface ResolvedReply {
  text: string;
  spec?: ChatViewSpec;
  source: 'ai' | 'rules';
  sessionId?: string;
  creditsUsed: number;
  /** Why the reply came from rules although AI was on; shown once as a quiet note. */
  fallbackReason?: DispatchFailure;
}

/**
 * AI first when allowed; any dispatcher failure falls back to the rule-based router,
 * so the therapist always gets a working card (architecture doc: "bez AI to ten sam renderer").
 */
export async function resolveReply(
  text: string,
  options: {
    useAi: boolean;
    sessionId?: string;
    context: IntentContext;
    dispatch: Dispatcher;
    /** Aborts the dispatcher call when the therapist stops the reply. */
    signal?: AbortSignal;
    /** The command a previous question was about; only rules use it, the model keeps its own history. */
    pendingCommand?: string;
    /** Patient of the conversation (latest card); a model card for someone else needs the message to name them. */
    contextPatientId?: string;
  }
): Promise<ResolvedReply> {
  if (options.useAi) {
    try {
      const result = await options.dispatch(text, options.sessionId, options.signal);
      const guarded = guardCardPatient(
        withNewPatientDetails(result.spec, text),
        text,
        options.context,
        options.contextPatientId
      );
      // A card the guard changed keeps no model sentence: it may name the patient just taken off.
      const modelText = guarded === result.spec ? result.text : undefined;
      const spec = guarded?.component === 'Clarify' ? labelPatientChoices(guarded, options.context.patients) : guarded;
      return {
        text: replyText(modelText, spec, options.context),
        spec,
        source: 'ai',
        sessionId: result.sessionId,
        creditsUsed: result.creditsUsed,
      };
    } catch (error) {
      const fallbackReason = error instanceof ChatDispatchError ? error.reason : 'unavailable';
      const spec = withNewPatientDetails(routeIntent(text, options.context, options.pendingCommand), text);
      return {
        text: replyText(undefined, spec, options.context),
        spec,
        source: 'rules',
        creditsUsed: 0,
        fallbackReason,
      };
    }
  }
  const spec = withNewPatientDetails(routeIntent(text, options.context, options.pendingCommand), text);
  return { text: replyText(undefined, spec, options.context), spec, source: 'rules', creditsUsed: 0 };
}

/**
 * Sentence shown above the card. A question (Clarify) always reaches the therapist, even when the
 * model wrote a lead-in that does not repeat it.
 */
export function replyText(
  modelText: string | undefined,
  spec: ChatViewSpec | undefined,
  context: IntentContext
): string {
  const fallback = spec
    ? describeSpec(spec, {
        patientName: (patientId) => context.patients.find((patient) => patient.id === patientId)?.name,
        setName: (setId) => context.sets.find((set) => set.id === setId)?.name,
      })
    : '';
  const text = modelText?.trim();
  if (!text) return fallback;
  if (spec?.component === 'Clarify' && !text.includes(spec.question)) return `${text}\n\n${spec.question}`;
  return text;
}

// „Nowa pacjentka Oksana…”, „mam nowego pacjenta”: the message is about someone not on the list yet.
const NEW_PERSON_PATTERN = /now(?:y|a|ego|ej|ym)\w* pacjent/;

/**
 * A model card names a patient only when the therapist did: the message names that patient, or it
 * names nobody and the card stays with the patient the conversation is already about. Anything else
 * is a guess. After "Dodano: Jan" and "clamshell, bird dog" the model once put the set on another
 * patient's card (report 01.11, P0-1); "Pacjent z rwą…" opened a set for "E2E Pacjent" and a copy of
 * Halina's set for a new patient landed on a third person's card (test 17.11, K1). A guessed set
 * loses the patient and asks "Dla kogo?"; a guessed patient plan asks "Czy chodzi o…?".
 */
export function guardCardPatient(
  spec: ChatViewSpec | undefined,
  message: string,
  context: IntentContext,
  contextPatientId: string | undefined
): ChatViewSpec | undefined {
  if (
    spec?.component !== 'SetDraft' &&
    spec?.component !== 'AssignSummary' &&
    spec?.component !== 'ExerciseResults' &&
    spec?.component !== 'PatientPeek'
  ) {
    return spec;
  }
  const { patientId } = spec;
  if (!patientId) return spec;
  const named = matchPatients(message, context.patients);
  if (named.kind === 'one' && named.patient.id === patientId) return spec;
  if (named.kind === 'many' && named.patients.some((patient) => patient.id === patientId)) return spec;
  const namesSomeoneElse = named.kind !== 'none' || NEW_PERSON_PATTERN.test(normalizeSearchText(message));
  if (!namesSomeoneElse && patientId === contextPatientId) return spec;

  if (spec.component === 'AssignSummary') return { component: 'SetDraft', setId: spec.setId, exerciseIds: [] };
  if (spec.component === 'PatientPeek') {
    const patient = context.patients.find((candidate) => candidate.id === patientId);
    if (!patient) return spec;
    return {
      component: 'Clarify',
      question: `Czy chodzi o pacjenta: ${patient.name}?`,
      options: [patient.name],
      choices: [{ label: patient.name, patientId }],
    };
  }
  return { ...spec, patientId: undefined };
}
