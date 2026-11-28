import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { confirmPatientSpec, labelPatientChoices, patientConfirmation } from './clarifyChoice';
import {
  askWhichPatient,
  routeForPatient,
  routeIntent,
  singleExerciseRequest,
  type IntentContext,
} from './intentRouter';
import { matchPatients } from './patientMatch';
import {
  addPatientReply,
  addPatientRest,
  existingPatient,
  withNewPatientDetails,
  type NewPatientDetails,
} from './newPatientDetails';
import { continuesExerciseDiscussion, exerciseSearchTerms, type ExerciseForm } from './exerciseDiscussion';
import { describeSpec } from './replyText';
import type { ChatNotice, ChatViewSpec } from './viewSpec';

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
  /** Server refusal without a card (a clinic patient the therapist does not see). */
  notice?: ChatNotice;
}

export type Dispatcher = (
  message: string,
  sessionId?: string,
  signal?: AbortSignal,
  options?: { clientMessageId?: string; patientId?: string }
) => Promise<DispatchResult>;

export interface ResolvedReply {
  text: string;
  spec?: ChatViewSpec;
  source: 'ai' | 'rules';
  sessionId?: string;
  creditsUsed: number;
  notice?: ChatNotice;
  /** Why the reply came from rules although AI was on; shown once as a quiet note. */
  fallbackReason?: DispatchFailure;
  /** The model's answer waiting for „Czy chodzi o…?”: shown after the „Tak”, without asking the model again. */
  held?: HeldReply;
  /** The command a question of this reply is about, when it is not the whole message (a combined request). */
  pendingCommand?: string;
}

export interface HeldReply {
  patientId: string;
  text: string;
  spec: PatientCardSpec;
}

type PatientCardSpec = Extract<
  ChatViewSpec,
  { component: 'SetDraft' | 'AssignSummary' | 'ExerciseResults' | 'PatientPeek' }
>;

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
    /** Patients earlier cards of the conversation are about: one word of their name needs no confirmation. */
    knownPatientIds?: ReadonlySet<string>;
    /** What earlier messages of the open exchange said about a new patient (`threadNewPatientDetails`). */
    newPatientContext?: NewPatientDetails;
    previousExercise?: ExerciseForm;
  }
): Promise<ResolvedReply> {
  // „Dodaj pacjenta …” needs no model: the form opens at once with what was given, so nothing is asked in the chat.
  const added = addPatientReply(text, options.context.patients, options.newPatientContext);
  if (added) return { text: added.text, spec: added.spec, source: 'rules', creditsUsed: 0 };
  // Not awaited when there is nothing to do: the dispatcher call below must start in the same tick.
  const combined = addPatientThenRest(text, options);
  if (combined) return combined;
  const known = new Set(options.knownPatientIds);
  if (options.contextPatientId) known.add(options.contextPatientId);
  const requested = singleExerciseRequest(text, options.context.patients);
  const previous = options.previousExercise;
  const continuing = !requested && previous?.discussion && continuesExerciseDiscussion(text, options.context.patients);
  const exercise = requested ?? (continuing ? previous : undefined);
  const topic = requested ? text : (previous?.discussion?.topic ?? '');
  const previousSearch = previous?.discussion?.search;
  const refinement = continuing && !previous?.discussion?.selected && /^(?:w |z |ze |na |tylko )/i.test(text.trim());
  const search = requested
    ? exerciseSearchTerms(requested.name ?? '')
    : refinement
      ? [previousSearch, exerciseSearchTerms(text.replace(/^tylko /i, ''))].filter(Boolean).join(' ')
      : previousSearch || exerciseSearchTerms(text);
  const discussion =
    continuing && previous?.discussion
      ? { ...previous.discussion, search, ...(refinement && { ids: [] }) }
      : { topic, search, ids: [] as string[] };
  const catalogCard = exercise && { ...exercise, discussion };
  const routed = () =>
    catalogCard ??
    withNewPatientDetails(
      routeIntent(text, options.context, options.pendingCommand, known),
      text,
      options.newPatientContext
    );
  if (options.useAi) {
    try {
      const command = catalogCard
        ? `Rozmawiasz z fizjoterapeutą o jednym ćwiczeniu. Gdy fizjoterapeuta szuka ćwiczenia, użyj FindExercises i zwróć ExerciseResults z maksymalnie czterema pasującymi ID. Nazwy pokaże portal. Gdy pyta o wykonanie lub różnice, użyj opisów z katalogu i odpowiedz słownie (Message). Bez układania zestawu. Prośba: ${topic}${continuing ? `\nWiadomość fizjoterapeuty: ${text}` : ''}`
        : text;
      const result = await options.dispatch(command, options.sessionId, options.signal);
      if (catalogCard && !result.notice) {
        const model = result.spec;
        const spec: ExerciseForm = {
          ...catalogCard,
          ...(model?.component === 'CreateExercise' && {
            name: model.name ?? catalogCard.name,
            description: model.description,
          }),
          discussion:
            model?.component === 'ExerciseResults' && !discussion.selected
              ? { ...discussion, ids: model.exerciseIds }
              : discussion,
        };
        // A plan's sentence can claim that a plan exists. Only a conversational reply or question belongs here.
        const answer = model?.component === 'Clarify' ? model.question : continuing && !model ? result.text : undefined;
        return {
          spec,
          text: answer || replyText(undefined, spec, options.context),
          sessionId: result.sessionId,
          source: 'ai',
          creditsUsed: result.creditsUsed,
        };
      }
      const original = withNewPatientDetails(result.spec, text, options.newPatientContext);
      const guarded = guardCardPatient(original, text, options.context, options.contextPatientId, known);
      // A card the guard changed keeps no model sentence: it may name the patient just taken off.
      const modelText = guarded === result.spec ? result.text : undefined;
      const spec = guarded?.component === 'Clarify' ? labelPatientChoices(guarded, options.context.patients) : guarded;
      const confirmation = guarded === original ? null : patientConfirmation(guarded);
      const held =
        confirmation && isPatientCard(original) && original.patientId === confirmation.patientId
          ? {
              patientId: confirmation.patientId,
              text: replyText(result.text, original, options.context),
              spec: original,
            }
          : undefined;
      return {
        text: replyText(modelText, spec, options.context),
        spec,
        source: 'ai',
        sessionId: result.sessionId,
        creditsUsed: result.creditsUsed,
        ...(held ? { held } : {}),
        ...(result.notice && !spec ? { notice: result.notice } : {}),
      };
    } catch (error) {
      const fallbackReason = error instanceof ChatDispatchError ? error.reason : 'unavailable';
      const spec = routed();
      return {
        text: replyText(undefined, spec, options.context),
        spec,
        source: 'rules',
        creditsUsed: 0,
        fallbackReason,
      };
    }
  }
  const spec = routed();
  return { text: replyText(undefined, spec, options.context), spec, source: 'rules', creditsUsed: 0 };
}

interface ForPatientOptions {
  useAi: boolean;
  sessionId?: string;
  context: IntentContext;
  dispatch: Dispatcher;
  signal?: AbortSignal;
}

/**
 * „Dodaj pacjenta … i ułóż mu zestaw”: the form opens at once with what was given and keeps the rest
 * (`then`) for after the save. A patient already on the list gets the rest right away; a single word
 * of a name or namesakes are asked about first, as everywhere else, with the rest as the pending command.
 */
function addPatientThenRest(
  text: string,
  options: ForPatientOptions & { newPatientContext?: NewPatientDetails }
): Promise<ResolvedReply> | null {
  const rest = addPatientRest(text);
  if (!rest) return null;
  const { patients } = options.context;
  const form = withNewPatientDetails({ component: 'AddPatient' }, text, options.newPatientContext);
  if (form?.component !== 'AddPatient') return null;

  const existing = existingPatient(form, patients);
  if (existing) {
    return resolveForPatient(rest, existing.id, { ...options, patientName: existing.name }).then((reply) => ({
      ...reply,
      text: `${existing.name} jest już na liście pacjentów. ${reply.text}`.trim(),
    }));
  }
  const hasContact = Boolean(form.email || form.phone);
  const named = form.name && !hasContact ? matchPatients(form.name, patients) : undefined;
  const question =
    named?.kind === 'many'
      ? askWhichPatient(named.patients, 'Masz kilku pacjentów o tym imieniu i nazwisku. O kogo chodzi?')
      : named?.kind === 'one' && !/\s/.test(form.name ?? '')
        ? confirmPatientSpec(named.patient, patients)
        : undefined;
  if (question?.component === 'Clarify') {
    return Promise.resolve({
      text: question.question,
      spec: question,
      source: 'rules',
      creditsUsed: 0,
      pendingCommand: rest,
    });
  }
  return Promise.resolve({
    text: `Uzupełnij brakujące dane w formularzu. Po dodaniu pacjenta przejdę do reszty prośby: „${rest}”.`,
    spec: { ...form, then: rest },
    source: 'rules',
    creditsUsed: 0,
  });
}

/** A model card put on `patientId`; undefined for a reply that is no answer (a question, nothing, a form). */
function bindPatient(spec: ChatViewSpec | undefined, patientId: string): ChatViewSpec | undefined {
  switch (spec?.component) {
    case 'SetDraft':
    case 'ExerciseResults':
    case 'AssignSummary':
      return { ...spec, patientId };
    case 'PatientPeek':
      return { component: 'PatientPeek', patientId };
    case 'CreateExercise':
    case 'Navigate':
      return spec;
    default:
      return undefined;
  }
}

/**
 * The rest of a request („ułóż mu zestaw na biodro”) names nobody, so the model answered „Nie widzę,
 * którego pacjenta dotyczy prośba” (DEV 19.11). The name goes into the message text, the only thing the
 * dispatcher gets; the backend turns it into an alias and the model sees „Pacjent: P1”.
 */
function commandNamingPatient(command: string, patientName: string | undefined): string {
  const name = patientName?.trim();
  if (!name) return command;
  return `${command.trim().replace(/[\s.!;,:]+$/, '')}. Pacjent: ${name}.`;
}

/**
 * A command carried out for one patient known by id (just added, or found by e-mail): the model
 * composes when allowed and its card is bound to that patient whatever it put there; a reply that
 * only asks, a failure and the no-AI mode end with the rules card for that patient.
 */
export async function resolveForPatient(
  command: string,
  patientId: string,
  options: ForPatientOptions & {
    /** The patient's name as the list has it: it goes into the message, so the model knows whom the command is for. */
    patientName?: string;
    /** SPEC-068 (K2): wybór imiennika po ID — przekazuje `patientId` do backendu i nie dokleja drugi raz nazwiska. */
    disambiguatePatient?: boolean;
  }
): Promise<ResolvedReply> {
  const rules = (): ResolvedReply => {
    const spec = routeForPatient(command, options.context, patientId);
    return { text: replyText(undefined, spec, options.context), spec, source: 'rules', creditsUsed: 0 };
  };
  if (!options.useAi) return rules();
  try {
    const result = options.disambiguatePatient
      ? await options.dispatch(command, options.sessionId, options.signal, { patientId })
      : await options.dispatch(commandNamingPatient(command, options.patientName), options.sessionId, options.signal);
    const spec = bindPatient(result.spec, patientId);
    const session = { sessionId: result.sessionId, creditsUsed: result.creditsUsed };
    if (!spec) return { ...rules(), source: 'ai', ...session };
    // The model's sentence stands only when its card was for this patient: written for someone else it may
    // name them, written for nobody it says the patient is unknown (DEV 19.11). The card's own sentence stands in.
    const cardNamesPatient = spec.component !== 'CreateExercise' && spec.component !== 'Navigate';
    const modelPatientId = result.spec && 'patientId' in result.spec ? result.spec.patientId : undefined;
    const modelText = !cardNamesPatient || modelPatientId === patientId ? result.text : undefined;
    return { text: replyText(modelText, spec, options.context), spec, source: 'ai', ...session };
  } catch (error) {
    return { ...rules(), fallbackReason: error instanceof ChatDispatchError ? error.reason : 'unavailable' };
  }
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
 *
 * One word of a longer name („zestaw dla Tomasza”) names the patient too weakly to bind a card: unless
 * the conversation already has that patient (`knownPatientIds`, the header chip), the card waits behind
 * „Czy chodzi o…?” (owner's decision 18.11).
 */
export function guardCardPatient(
  spec: ChatViewSpec | undefined,
  message: string,
  context: IntentContext,
  contextPatientId: string | undefined,
  knownPatientIds?: ReadonlySet<string>
): ChatViewSpec | undefined {
  if (!isPatientCard(spec)) return spec;
  const { patientId } = spec;
  if (!patientId) return spec;
  const named = matchPatients(message, context.patients);
  if (named.kind === 'one' && named.patient.id === patientId) {
    const isKnown = patientId === contextPatientId || knownPatientIds?.has(patientId);
    return named.partial && !isKnown ? confirmPatientSpec(named.patient, context.patients) : spec;
  }
  if (named.kind === 'many' && named.patients.some((patient) => patient.id === patientId)) return spec;
  const namesSomeoneElse = named.kind !== 'none' || NEW_PERSON_PATTERN.test(normalizeSearchText(message));
  if (!namesSomeoneElse && patientId === contextPatientId) return spec;

  if (spec.component === 'AssignSummary') return { component: 'SetDraft', setId: spec.setId, exerciseIds: [] };
  if (spec.component === 'PatientPeek') {
    const patient = context.patients.find((candidate) => candidate.id === patientId);
    return patient ? confirmPatientSpec(patient, context.patients) : spec;
  }
  return { ...spec, patientId: undefined };
}

function isPatientCard(spec: ChatViewSpec | undefined): spec is PatientCardSpec {
  return (
    spec?.component === 'SetDraft' ||
    spec?.component === 'AssignSummary' ||
    spec?.component === 'ExerciseResults' ||
    spec?.component === 'PatientPeek'
  );
}
