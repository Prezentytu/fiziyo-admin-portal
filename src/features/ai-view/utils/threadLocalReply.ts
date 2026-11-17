import type { ChatCardSpec } from './chatCards';
import type { ChatThreadMessage } from './conversationStore';
import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { matchPatients, type MatchablePatient } from './patientMatch';
import { pickPatientAnswer } from './pickPatientAnswer';
import { thinkingTopic } from './replyMotion';
import { formatPlanDate, parseSchedulePlan, sendSummaryText } from './schedulePlan';
import { scheduleQuestion } from './setDraft';

/** Marks the open „Komu przypisać?” card answered by a typed message (see PickPatientCard). */
export const PICK_PATIENT_ANSWERED = '__answered__';

export interface LocalReply {
  /** The open card the message answers; it is marked spent. */
  answeredMessageId: string;
  chosen: string;
  reply: { text?: string; spec?: ChatCardSpec };
}

/**
 * A typed answer to the thread's own open question is the next step of its flow, not a new
 * command for the dispatcher: „do jarka adamowskiego” after „Komu przypisać?” picks or adds
 * that patient, „od dziś, 3 razy w tygodniu” after „Od kiedy i jak często?” sets the schedule
 * (sent to the model it composed the set again and lost the patient: test 17.11, K7).
 * Null when no such question is open.
 */
export function localReplyTo(
  text: string,
  messages: readonly ChatThreadMessage[],
  patients: readonly MatchablePatient[]
): LocalReply | null {
  const last = messages.findLast((message) => message.role === 'assistant');
  if (last?.role !== 'assistant' || last.chosen !== undefined) return null;
  if (last.spec?.component === 'Schedule') {
    const trimmed = text.trim();
    const parsed = NOT_A_SCHEDULE.test(normalizeSearchText(trimmed)) ? null : parseSchedulePlan(trimmed);
    if (!parsed) return null;
    return {
      answeredMessageId: last.id,
      chosen: trimmed,
      reply: {
        text: sendSummaryText(parsed.plan, parsed.notes),
        spec: { component: 'SendSummary', draft: last.spec.draft, plan: parsed.plan },
      },
    };
  }
  if (last.spec?.component !== 'PickPatient') return null;
  if (!looksLikePatientAnswer(text, patients)) return null;
  const { draft } = last.spec;
  const answer = pickPatientAnswer(text, patients);

  if (answer.kind === 'one') {
    return {
      answeredMessageId: last.id,
      chosen: answer.patient.name,
      reply: {
        text: scheduleQuestion(draft.items),
        spec: { component: 'Schedule', draft: { ...draft, patientId: answer.patient.id } },
      },
    };
  }
  if (answer.kind === 'many') {
    return {
      answeredMessageId: last.id,
      chosen: PICK_PATIENT_ANSWERED,
      reply: {
        text: 'Pasuje kilka osób. Wybierz właściwą.',
        spec: { component: 'PickPatient', draft, patientIds: answer.patientIds },
      },
    };
  }
  const name = answer.details.name;
  return {
    answeredMessageId: last.id,
    chosen: PICK_PATIENT_ANSWERED,
    reply: {
      text: name
        ? `${name} nie ma jeszcze na liście pacjentów. Uzupełnij dane i podaj e-mail: na niego pójdzie zaproszenie do aplikacji.`
        : 'Nie ma takiej osoby na liście pacjentów. Uzupełnij dane i podaj e-mail: na niego pójdzie zaproszenie do aplikacji.',
      spec: { component: 'PickPatient', draft, newPatient: answer.details },
    },
  };
}

// A question or a change to the set next to a schedule („dodaj mostek, 3 razy w tygodniu”) is for the assistant.
const NOT_A_SCHEDULE =
  /\?|(?:^|\s)(?:dodaj|usun|zamien|zmien|wyrzuc|uloz|pokaz|znajdz|utworz|czy|dlaczego)(?:\s|$)/;

const QUESTION_OR_COMMAND =
  /\?|(?:^|\s)(?:ile|ilu|pokaż|pokaz|znajdź|znajdz|utwórz|utworz|zrób|zrob|dodaj|ułóż|uloz|jak|czy|co|kiedy|gdzie|dlaczego)(?:\s|$)/i;

/**
 * Only a short answer naming someone („do jarka adamowskiego”, „Anna”) is taken as the answer
 * to „Komu przypisać?”; a question or a new command goes to the assistant as usual.
 */
export function looksLikePatientAnswer(text: string, patients: readonly MatchablePatient[]): boolean {
  const trimmed = text.trim();
  if (pickPatientAnswer(trimmed, patients).kind === 'one') return true;
  if (QUESTION_OR_COMMAND.test(trimmed.toLocaleLowerCase('pl-PL'))) return false;
  return trimmed.split(/\s+/).length <= 5;
}

// „Przygotuj mi propozycję 3 ćwiczeń na …”: prośba przed tematem, sam temat zostaje.
const IDEA_LEAD =
  /^.*?(?:ćwicze[nń]\p{L}*|cwicze[nń]\p{L}*|ćwiczenie|cwiczenie)\s+(?:(?:na|dla|do|po|przy|z|ze)\s+)?/iu;

/** The need behind an exercise question, as AI ideas for new exercises are asked with it. */
export function exerciseIdeaQuery(question: string): string {
  const trimmed = question.trim().replace(/[?.!]+$/, '');
  const topic = trimmed.replace(IDEA_LEAD, '').trim();
  return (topic.length >= 3 ? topic : trimmed).slice(0, 120);
}

const NOT_A_TOPIC_WORDS = new Set([
  'czy',
  'ktore',
  'ktory',
  'ktora',
  'jak',
  'ile',
  'ilu',
  'dlaczego',
  'kiedy',
  'kto',
  'co',
  'gdzie',
  'sa',
  'jest',
  'chce',
  'moge',
  'mam',
  'wiedziec',
]);
const MAX_TOPIC_WORDS = 8;
const MAX_TOPIC_LENGTH = 80;

/**
 * A need or a name an exercise can be created for („mostek na jednej nodze”), not a question or a
 * whole sentence: those once became „Utwórz ćwiczenie: <treść pytania>” (test 17.11, W16).
 */
export function isExerciseTopic(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3 || trimmed.length > MAX_TOPIC_LENGTH || trimmed.includes('?')) return false;
  const words = normalizeSearchText(trimmed).split(/[^a-z0-9]+/).filter(Boolean);
  return words.length <= MAX_TOPIC_WORDS && !words.some((word) => NOT_A_TOPIC_WORDS.has(word));
}

/**
 * An exercise question answered only in words (nothing fits in the catalog) still gets a way
 * forward: ideas for new exercises for the same need. Any other reply, and a question that names
 * no need, is left as it came.
 */
export function withExerciseIdeas<T extends { text?: string; spec?: ChatCardSpec }>(
  question: string,
  reply: T
): T & { spec?: ChatCardSpec } {
  if (reply.spec || thinkingTopic(question) !== 'exercises') return reply;
  const query = exerciseIdeaQuery(question);
  if (!isExerciseTopic(query)) return reply;
  return { ...reply, spec: { component: 'ExerciseIdeas', query } };
}

export type CountFocus = 'patients' | 'exercises' | 'sets';

const COUNT_QUESTION = /(?:^|\s)(?:ile|ilu|ilość|ilosc|liczb[aęy])(?:\s|$)/;

/** „Ilu mam pacjentów?”, „a ile mam ćwiczeń”: a question the panel answers from its own data. */
export function countQuestion(text: string): CountFocus | null {
  const normalized = text.toLocaleLowerCase('pl-PL');
  if (!COUNT_QUESTION.test(normalized)) return null;
  if (/pacjent/.test(normalized)) return 'patients';
  if (/zestaw|plan/.test(normalized)) return 'sets';
  if (/ćwicze|cwicze|ćwiczeń|cwiczen|katalog/.test(normalized)) return 'exercises';
  return null;
}

const ACCOUNT_QUESTION =
  /(?:odebral|dostal|otrzymal|widzial|zobaczyl|otworzyl)[a-z]*\b.*\b(?:zestaw|plan|zaproszeni|cwiczeni|mail|link|kod)|ma (?:juz )?(?:konto|dostep)|zalozyl[a-z]* konto|(?:zarejestrowal|zalogowal)[a-z]* sie/;
const MAX_ACCOUNT_QUESTION_WORDS = 14;

/**
 * „Czy Halina odebrała zestaw?”, „czy Kacper dostał zaproszenie?”: the panel knows whether the
 * patient has an account, the model does not (test 17.11, K5). Answered from the patient list,
 * without a credit. Null for anything else and when the name fits nobody or several patients.
 */
export function accountQuestionReply(
  text: string,
  patients: readonly MatchablePatient[]
): { text: string; spec: ChatCardSpec } | null {
  const normalized = normalizeSearchText(text).trim();
  const isQuestion = /^czy\s/.test(normalized) || text.includes('?');
  if (!isQuestion || normalized.split(/\s+/).length > MAX_ACCOUNT_QUESTION_WORDS) return null;
  if (!ACCOUNT_QUESTION.test(normalized)) return null;
  const match = matchPatients(text, patients);
  if (match.kind !== 'one' || match.patient.isShadowUser === undefined) return null;
  const { patient } = match;
  const spec: ChatCardSpec = { component: 'PatientPeek', patientId: patient.id };
  if (patient.isShadowUser) {
    return {
      text: `${patient.name} nie ma jeszcze konta w aplikacji, więc nie widzi planu ani przypomnień. Daj kod QR albo link do aplikacji z karty pacjenta, albo wydruk karty z planem.`,
      spec,
    };
  }
  const lastActivity = patient.lastActivity ? new Date(patient.lastActivity) : undefined;
  const activity =
    lastActivity && !Number.isNaN(lastActivity.getTime())
      ? `Ostatnia aktywność w aplikacji: ${formatPlanDate(lastActivity)}.`
      : 'W aplikacji nie ma jeszcze aktywności.';
  return { text: `${patient.name} ma konto w aplikacji, więc widzi tam przypisane plany. ${activity}`, spec };
}
