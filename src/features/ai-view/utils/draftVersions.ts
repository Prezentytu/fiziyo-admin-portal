import type { LiveDraft } from './addToDraft';
import type { ChatCardSpec } from './chatCards';
import type { ChatThreadMessage } from './conversationStore';
import { itemsToDoses, type DraftItem } from './setDraft';
import type { ChatViewSpec } from './viewSpec';

/**
 * Versions of a set proposal in one thread. Only the newest open proposal is active (the therapist
 * edits and sends from it); an earlier one of the same work is locked with what it held at that
 * moment kept in its card, so „Wróć do tej wersji” brings it back whole, also after a reload.
 */

type SetDraftSpec = Extract<ChatViewSpec, { component: 'SetDraft' }>;
type SetCardSpec = Extract<ChatViewSpec, { component: 'SetDraft' | 'AssignSummary' }>;

/** A newer proposal took over; the card stays readable and offers a way back. */
export const SUPERSEDED = 'superseded';
// 'added' is how threads stored before 18.11 marked a proposal an exercise was added to.
const RESTORABLE = new Set([SUPERSEDED, 'added', 'create-exercise']);
// Cards that end the work on a set: proposals above them belong to a finished flow.
const FLOW_END = new Set(['Sent', 'SetSaved']);

export function canRestoreDraft(chosen: string | undefined): boolean {
  return chosen !== undefined && RESTORABLE.has(chosen);
}

function isSetCard(spec: ChatCardSpec | undefined): spec is SetCardSpec {
  return spec?.component === 'SetDraft' || spec?.component === 'AssignSummary';
}

/**
 * Open proposals a newer one replaced, newest first. The same work means: no sent or saved set
 * between them, and not two different patients (a proposal without a patient fits any). Spent
 * cards (schedule, saved) are never touched.
 */
export function supersededDraftIds(messages: readonly ChatThreadMessage[]): Set<string> {
  const ids = new Set<string>();
  let newest: SetCardSpec | undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'assistant' || !message.spec) continue;
    if (FLOW_END.has(message.spec.component)) break;
    if (!isSetCard(message.spec) || message.chosen !== undefined) continue;
    if (!newest) newest = message.spec;
    else if (!newest.patientId || !message.spec.patientId || newest.patientId === message.spec.patientId) {
      ids.add(message.id);
    }
  }
  return ids;
}

/** The card's spec with the rows it holds now; the catalog set and the note it started from stay. */
function withRows(spec: SetCardSpec, live: LiveDraft | undefined): SetCardSpec {
  if (!live) return spec;
  const base: SetDraftSpec =
    spec.component === 'SetDraft'
      ? spec
      : { component: 'SetDraft', setId: spec.setId, patientId: spec.patientId, exerciseIds: [] };
  return { ...base, exerciseIds: live.draft.exerciseIds, doses: live.draft.doses, items: live.draft.items };
}

/**
 * The thread after any change: every replaced proposal locked, each locked one keeping the rows its
 * card reports (`getLive`, while the card is still open). The same list when nothing is to be done.
 */
export function lockSupersededDrafts(
  messages: ChatThreadMessage[],
  getLive?: (messageId: string) => LiveDraft | undefined
): ChatThreadMessage[] {
  const superseded = supersededDraftIds(messages);
  let changed = false;
  const next = messages.map((message) => {
    if (message.role !== 'assistant' || !isSetCard(message.spec)) return message;
    const replaced = superseded.has(message.id);
    if (!replaced && !canRestoreDraft(message.chosen)) return message;
    const live = getLive?.(message.id);
    if (!replaced && !live) return message;
    changed = true;
    return { ...message, chosen: replaced ? SUPERSEDED : message.chosen, spec: withRows(message.spec, live) };
  });
  return changed ? next : messages;
}

/** A locked version as the new, active card: every row as the card has it, no „nowe” mark. */
export function restoredDraftSpec(spec: SetDraftSpec, items: readonly DraftItem[]): SetDraftSpec {
  const restored: SetDraftSpec = {
    ...spec,
    exerciseIds: items.map((item) => item.exerciseId),
    doses: itemsToDoses(items),
    items: [...items],
  };
  delete restored.addedExerciseId;
  return restored;
}

export const RESTORE_DRAFT_LABEL = 'Wróć do tej wersji';
export const RESTORED_DRAFT_TEXT =
  'To wcześniejsza wersja zestawu, znów aktywna. Poprzednia została powyżej i do niej też da się wrócić.';
