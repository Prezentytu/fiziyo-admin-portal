import type { ChatCardSpec } from './chatCards';
import type { ChatThreadMessage } from './conversationStore';
import type { MatchablePatient } from './patientMatch';
import { pickPatientAnswer } from './pickPatientAnswer';
import { thinkingTopic } from './replyMotion';
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
 * that patient. Null when no such question is open.
 */
export function localReplyTo(
  text: string,
  messages: readonly ChatThreadMessage[],
  patients: readonly MatchablePatient[]
): LocalReply | null {
  const last = messages.findLast((message) => message.role === 'assistant');
  if (last?.role !== 'assistant' || last.chosen !== undefined || last.spec?.component !== 'PickPatient') return null;
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

/**
 * An exercise question answered only in words (nothing fits in the catalog) still gets a way
 * forward: ideas for new exercises for the same need. Any other reply is left as it came.
 */
export function withExerciseIdeas<T extends { text?: string; spec?: ChatCardSpec }>(
  question: string,
  reply: T
): T & { spec?: ChatCardSpec } {
  if (reply.spec || thinkingTopic(question) !== 'exercises') return reply;
  return { ...reply, spec: { component: 'ExerciseIdeas', query: exerciseIdeaQuery(question) } };
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
