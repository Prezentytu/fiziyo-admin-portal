import type { ChatCardSpec } from './chatCards';
import { isAddPatientRequest } from './newPatientDetails';
import { matchPatients, type MatchablePatient } from './patientMatch';
import type { SetDraftReturn } from './setDraft';
import { tokenizeWords, wordMatches } from './textMatch';
import { isExerciseTopic } from './threadLocalReply';
import type { ChatViewSpec } from './viewSpec';

/**
 * „Dodaj ćwiczenie X” written while a set proposal is open in the thread: the exercise goes into that
 * proposal (a new card with the others as the therapist set them), and when the catalog has none, a
 * new-exercise card that returns to the proposal. Rules only, so it works the same without AI.
 */

export type DraftRequest = { kind: 'add' | 'create'; query: string };

const ADD = /^(?:prosz[ęe]\s+)?(?:dodaj|dorzu[ćc]|dopisz|do[łl][óo][żz])(?:\s+([\s\S]*))?$/iu;
const CREATE = /^(?:prosz[ęe]\s+)?(?:utw[óo]rz|stw[óo]rz)\s+(?:nowe\s+)?[ćc]wiczenie(?![\p{L}])([\s\S]*)$/iu;
const SEVERAL_EXERCISES = /[ćc]wicze(?:nia|ń|n|niami)(?![\p{L}])/iu;
const ABOUT_DRAFT = /[ćc]wiczenie|zestaw|plan|propozycj/iu;
const NEW_EXERCISE = /^\s*nowe\s+[ćc]wiczenie(?![\p{L}])/iu;
const TO_THE_SET =
  /(?:^|\s)do\s+(?:tego\s+)?(?:zestawu|planu|propozycji|listy)(?=[\s:.,]|$)|(?:^|\s)do\s+tego(?=\s|$)/giu;
const FILLERS = /(?:^|\s)(?:jeszcze|też|tez|mi|proszę|prosze|tu|tutaj)(?=\s|$)/giu;
const EXERCISE_WORD = /^\s*(?:nowe\s+)?[ćc]wiczenie(?![\p{L}])/iu;
// A need, not a name („na pośladki”, „coś na rozciąganie”, „2 ćwiczenia”): choosing is the assistant's job.
const A_NEED = /^(?:na|dla|co[śs]|jakie[śs]|kilka|inne|\d+)(?:\s|$)/iu;

function cleanQuery(rest: string): string {
  return rest
    .replace(TO_THE_SET, ' ')
    .replace(FILLERS, ' ')
    .replace(EXERCISE_WORD, '')
    .replace(/^[\s:,\-–]+|[\s.!,;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

/** What the message asks to do with the open proposal; null when it is not about adding one exercise. */
export function draftRequest(text: string): DraftRequest | null {
  const trimmed = text.trim();
  if (trimmed.includes('?') || /pacjent/i.test(trimmed)) return null;
  const created = CREATE.exec(trimmed);
  if (created) return { kind: 'create', query: cleanQuery(created[1] ?? '') };
  const added = ADD.exec(trimmed);
  if (!added) return null;
  const rest = added[1] ?? '';
  if (SEVERAL_EXERCISES.test(rest)) return null;
  const query = cleanQuery(rest);
  if (A_NEED.test(query)) return null;
  if (!query) return ABOUT_DRAFT.test(rest) ? { kind: NEW_EXERCISE.test(rest) ? 'create' : 'add', query } : null;
  return { kind: NEW_EXERCISE.test(rest) ? 'create' : 'add', query };
}

interface ThreadMessageLike {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  spec?: ChatCardSpec;
  chosen?: string;
}

type SetDraftSpec = Extract<ChatViewSpec, { component: 'SetDraft' }>;

/**
 * The set proposal the therapist is still working on: the newest card of the thread, when it is a
 * set proposal nobody moved on from. Text-only replies and questions after it do not close it.
 */
export function openSetDraft(messages: readonly ThreadMessageLike[]): { messageId: string; spec: SetDraftSpec } | null {
  const last = messages.findLast(
    (message) => message.role === 'assistant' && message.spec && message.spec.component !== 'Clarify'
  );
  if (!last || last.spec?.component !== 'SetDraft' || last.chosen !== undefined) return null;
  return { messageId: last.id, spec: last.spec };
}

interface CatalogExercise {
  id: string;
  name: string;
}

/** Exercises whose name has every word of the query, the one named exactly first, then the shortest name. */
function findByName<T extends CatalogExercise>(query: string, catalog: readonly T[]): T[] {
  const all = tokenizeWords(query);
  const long = all.filter((word) => word.length >= 3);
  const queryWords = long.length > 0 ? long : all;
  if (queryWords.length === 0) return [];
  const wanted = all.join(' ');
  return catalog
    .map((exercise) => ({ exercise, words: tokenizeWords(exercise.name) }))
    .filter(({ words }) => queryWords.every((queryWord) => words.some((word) => wordMatches(word, queryWord))))
    .sort(
      (left, right) =>
        Number(right.words.join(' ') === wanted) - Number(left.words.join(' ') === wanted) ||
        left.words.length - right.words.length ||
        left.exercise.name.localeCompare(right.exercise.name, 'pl')
    )
    .map(({ exercise }) => exercise);
}

/** The open proposal as its card has it now, and the catalog the card searches. */
export interface LiveDraft {
  draft: SetDraftReturn;
  catalog: readonly CatalogExercise[];
}

export interface AddToDraftReply {
  /** The open proposal is replaced by the reply's card (a new proposal or the new-exercise form). */
  closesDraft: boolean;
  reply: { text: string; spec?: ChatCardSpec };
}

const MAX_SIMILAR = 3;

/**
 * The thread's answer to a message about the open proposal (`draft` as the card has it now, with the
 * therapist's changes). Null when the message is for the dispatcher: not about adding one exercise,
 * about a patient, or naming something that is neither in the catalog nor a name for a new exercise.
 */
export function addToDraftReply(
  text: string,
  draft: SetDraftReturn,
  catalog: readonly CatalogExercise[],
  patients: readonly MatchablePatient[]
): AddToDraftReply | null {
  const request = draftRequest(text);
  if (!request || isAddPatientRequest(text)) return null;
  if (matchPatients(text, patients).kind !== 'none') return null;

  if (request.kind === 'create') {
    return {
      closesDraft: true,
      reply: {
        text: 'Sprawdź nazwę i kliknij „Generuj”. Gotowe ćwiczenie wróci do tej propozycji zestawu.',
        spec: { component: 'CreateExercise', name: request.query || undefined, addToSet: draft },
      },
    };
  }
  if (!request.query) {
    return {
      closesDraft: false,
      reply: {
        text: 'Jakie ćwiczenie dodać do zestawu? Napisz nazwę, np. „dodaj mostek”, albo użyj przycisków pod listą ćwiczeń.',
      },
    };
  }

  const [best, ...others] = findByName(request.query, catalog);
  if (!best) {
    // „dodaj serię do mostka” names no exercise: only a message that says „ćwiczenie” or „do zestawu” creates one.
    if (!ABOUT_DRAFT.test(text) || !isExerciseTopic(request.query)) return null;
    return {
      closesDraft: true,
      reply: {
        text: `W katalogu nie ma ćwiczenia „${request.query}”. Sprawdź nazwę i kliknij „Generuj”. Gotowe ćwiczenie wróci do tej propozycji zestawu.`,
        spec: { component: 'CreateExercise', name: request.query, addToSet: draft },
      },
    };
  }
  if (draft.exerciseIds.includes(best.id)) {
    return { closesDraft: false, reply: { text: `${best.name} jest już w tym zestawie.` } };
  }
  const similar = others.filter((exercise) => !draft.exerciseIds.includes(exercise.id)).slice(0, MAX_SIMILAR);
  const hint =
    similar.length > 0
      ? ` W katalogu są też: ${similar.map((exercise) => exercise.name).join(', ')}. Napisz „dodaj” z pełną nazwą, żeby dodać inne.`
      : '';
  return {
    closesDraft: true,
    reply: {
      text: `Dodane do zestawu: ${best.name}. Parametry pozostałych ćwiczeń zostają bez zmian.${hint}`,
      spec: draftWithExercise(draft, best.id),
    },
  };
}

/**
 * The proposal `back` with one more exercise at the end, marked as the one added in this step;
 * everything else as the therapist left it.
 */
export function draftWithExercise(back: SetDraftReturn, exerciseId: string): SetDraftSpec {
  return {
    component: 'SetDraft',
    ...back,
    exerciseIds: [...back.exerciseIds, exerciseId],
    addedExerciseId: exerciseId,
  };
}

/**
 * What the thread shows once a new exercise is saved: created for a set proposal (`addToSet`), that
 * proposal comes back at once with the exercise in it; otherwise the created-exercise card with its next steps.
 */
export function exerciseCreatedReply(
  exercise: { id: string; name: string },
  options: { patientId?: string; addToSet?: SetDraftReturn }
): { text?: string; spec: ChatCardSpec } {
  if (options.addToSet) {
    return {
      text: `Ćwiczenie „${exercise.name}” jest w katalogu gabinetu i w zestawie. Zdjęcie i szczegóły dodasz później w katalogu ćwiczeń.`,
      spec: draftWithExercise(options.addToSet, exercise.id),
    };
  }
  return {
    spec: {
      component: 'ExerciseCreated',
      exerciseId: exercise.id,
      name: exercise.name,
      ...(options.patientId ? { patientId: options.patientId } : {}),
    },
  };
}
