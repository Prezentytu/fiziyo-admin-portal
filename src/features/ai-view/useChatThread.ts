'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { dispatchChatMessage } from './chatDispatchClient';
import { addToDraftReply, draftRequest, openSetDraft, type LiveDraft } from './utils/addToDraft';
import { lockSupersededDrafts, RESTORE_DRAFT_LABEL, RESTORED_DRAFT_TEXT } from './utils/draftVersions';
import { cardPatientIds, latestCardPatientId, type ChatCardSpec } from './utils/chatCards';
import { confirmAnswer, OTHER_PATIENT_OPTION, patientConfirmation } from './utils/clarifyChoice';
import type { ChatThreadMessage } from './utils/conversationStore';
import { routeForPatient, type IntentContext } from './utils/intentRouter';
import { threadNewPatientDetails } from './utils/newPatientDetails';
import { replyText, resolveForPatient, resolveReply, type HeldReply } from './utils/resolveReply';
import { scheduleQuestion, type SetDraftPayload } from './utils/setDraft';
import { accountQuestionReply, countQuestion, localReplyTo, withExerciseIdeas } from './utils/threadLocalReply';
import { UNSUPPORTED_SPEC } from './utils/viewSpec';

export type { ChatThreadMessage } from './utils/conversationStore';

export function newChatId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface AssistantReply {
  text?: string;
  spec?: ChatCardSpec;
}

interface ChatThreadOptions {
  /** Patient on the header chip (pinned or latest card); the guard compares model cards with it. */
  getContextPatientId?: () => string | undefined;
  useAi: boolean;
  context: IntentContext;
  /** False while patients and sets load: rules would answer from an empty context. */
  ready: boolean;
  /** Active organization; a new one starts a new conversation and a new AI session. */
  scopeKey: string;
  /** The open set proposal as its card has it now (the therapist's changes included), by message id. */
  getLiveDraft?: (messageId: string) => LiveDraft | undefined;
}

export const STOPPED_TEXT = 'Zatrzymane. Napisz, co zrobić inaczej.';
export const PICK_OTHER_PATIENT_TEXT = 'Wybierz pacjenta z listy albo napisz imię i nazwisko.';

/**
 * One conversation: what the therapist wrote and what came back (a sentence and a card from the
 * dispatcher, AI or rules, or the next step of a flow the thread runs itself).
 */
export function useChatThread({
  useAi,
  context,
  ready,
  scopeKey,
  getContextPatientId,
  getLiveDraft,
}: ChatThreadOptions) {
  const [messages, setRawMessages] = useState<ChatThreadMessage[]>([]);
  // Every change of the thread passes here: a newer set proposal locks the earlier one (with its rows kept).
  const setMessages = useCallback(
    (update: ChatThreadMessage[] | ((previous: ChatThreadMessage[]) => ChatThreadMessage[])) =>
      setRawMessages((previous) =>
        lockSupersededDrafts(typeof update === 'function' ? update(previous) : update, getLiveDraft)
      ),
    [getLiveDraft]
  );
  const [isBusy, setIsBusy] = useState(false);
  const [threadScope, setThreadScope] = useState(scopeKey);
  const sessionRef = useRef<{ scopeKey: string; id: string } | undefined>(undefined);
  const hasNotifiedFallbackRef = useRef(false);
  // The command behind the last question ("O kogo chodzi?"), so a rules answer finishes it.
  const pendingCommandRef = useRef<string | undefined>(undefined);
  // The model's card behind „Czy chodzi o…?”: the „Tak” shows it, without a second model call.
  const heldRef = useRef<HeldReply | undefined>(undefined);
  // The set draft behind „Czy chodzi o…?” asked after „Komu przypisać?”: the „Tak” goes on to its schedule.
  const awaitingDraftRef = useRef<SetDraftPayload | undefined>(undefined);
  // Bumped by a new conversation or organization: a reply still in flight belongs to the old one.
  const threadEpochRef = useRef(0);
  // isBusy only blocks after a render; a double click lands before it.
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | undefined>(undefined);
  // Read when a message is sent, not a render dependency of `send`.
  const messagesRef = useRef<ChatThreadMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  if (threadScope !== scopeKey) {
    setThreadScope(scopeKey);
    setMessages([]);
    setIsBusy(false);
  }

  // Whatever is in flight belongs to the previous conversation from now on.
  const startOver = useCallback(() => {
    abortRef.current?.abort();
    threadEpochRef.current += 1;
    inFlightRef.current = false;
    sessionRef.current = undefined;
    hasNotifiedFallbackRef.current = false;
    pendingCommandRef.current = undefined;
    heldRef.current = undefined;
    awaitingDraftRef.current = undefined;
  }, []);

  useEffect(startOver, [scopeKey, startOver]);

  /** A step of a flow (schedule, summary, sent) without a model call. */
  const appendAssistant = useCallback(
    (reply: AssistantReply) => {
      setMessages((previous) => [
        ...previous,
        {
          id: newChatId(),
          role: 'assistant',
          text: reply.text,
          spec: reply.spec,
          source: 'local',
          creditsUsed: 0,
          createdAt: Date.now(),
        },
      ]);
    },
    [setMessages]
  );

  const pushUser = useCallback(
    (text: string, attachmentName?: string) => {
      setMessages((previous) => [
        ...previous,
        { id: newChatId(), role: 'user', text, attachmentName, createdAt: Date.now() },
      ]);
    },
    [setMessages]
  );

  const markChosen = useCallback(
    (messageId: string, chosen: string) => {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === messageId && message.role === 'assistant' ? { ...message, chosen } : message
        )
      );
    },
    [setMessages]
  );

  /**
   * The therapist picked a patient from a choice ("O kogo chodzi?") or confirmed one („Czy chodzi o…?”).
   * The pick is an id, so namesakes end the question too; what was asked for goes on without a model
   * call: the model's card that waited for the confirmation, the set draft that waited for a patient,
   * or the command finished by rules.
   */
  const choosePatient = useCallback(
    (patientId: string, label: string) => {
      if (inFlightRef.current) return;
      const held = heldRef.current;
      const command = pendingCommandRef.current;
      const draft = awaitingDraftRef.current;
      heldRef.current = undefined;
      pendingCommandRef.current = undefined;
      awaitingDraftRef.current = undefined;
      pushUser(label);
      if (draft) {
        appendAssistant({
          text: scheduleQuestion(draft.items),
          spec: { component: 'Schedule', draft: { ...draft, patientId } },
        });
        return;
      }
      if (held) {
        // Picked someone else: the same card for that patient, with a sentence that names nobody else.
        const spec = { ...held.spec, patientId };
        const text = held.patientId === patientId ? held.text : replyText(undefined, spec, context);
        appendAssistant({ text, spec });
        return;
      }
      const patient = context.patients.find((candidate) => candidate.id === patientId);
      const account = command && patient ? accountQuestionReply(command, [patient], new Set([patientId])) : null;
      if (account) {
        appendAssistant(account);
        return;
      }
      const spec = routeForPatient(command, context, patientId);
      appendAssistant({ text: replyText(undefined, spec, context), spec });
    },
    [appendAssistant, context, pushUser]
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || inFlightRef.current || !ready) return;
      // „Ilu mam pacjentów?”: liczby są w panelu, odpowiedź bez AI i bez kredytu.
      const countFocus = countQuestion(trimmed);
      if (countFocus) {
        pushUser(trimmed);
        setMessages((previous) => [
          ...previous,
          {
            id: newChatId(),
            role: 'assistant',
            spec: { component: 'CatalogCounts', focus: countFocus },
            source: 'local',
            creditsUsed: 0,
            createdAt: Date.now(),
          },
        ]);
        return;
      }
      const contextPatientId = getContextPatientId?.() ?? latestCardPatientId(messagesRef.current);
      const knownPatientIds = cardPatientIds(messagesRef.current);
      if (contextPatientId) knownPatientIds.add(contextPatientId);
      // „Czy chodzi o…?”: „tak” (albo to samo imię) idzie dalej z tym pacjentem, „inny pacjent” otwiera wybór.
      const asked = messagesRef.current.findLast((message) => message.role === 'assistant');
      const isOpen = asked?.role === 'assistant' && (asked.chosen === undefined || asked.chosen === trimmed);
      const confirmation = isOpen ? patientConfirmation(asked.spec) : null;
      const answer = confirmation ? confirmAnswer(trimmed, confirmation.patientId, context.patients) : null;
      if (asked && confirmation && answer === 'yes') {
        markChosen(asked.id, confirmation.yesOption);
        choosePatient(confirmation.patientId, trimmed);
        return;
      }
      if (asked && confirmation && answer === 'other') {
        markChosen(asked.id, OTHER_PATIENT_OPTION);
        pushUser(trimmed);
        appendAssistant({
          text: PICK_OTHER_PATIENT_TEXT,
          spec: { component: 'PickPatient', draft: awaitingDraftRef.current },
        });
        awaitingDraftRef.current = undefined;
        return;
      }
      const awaitingDraft = awaitingDraftRef.current;
      heldRef.current = undefined;
      awaitingDraftRef.current = undefined;
      // Odpowiedź na otwarte pytanie wątku („Komu przypisać?”) to jego następny krok, bez AI.
      const local = localReplyTo(trimmed, messagesRef.current, context.patients, knownPatientIds, awaitingDraft);
      if (local) {
        awaitingDraftRef.current = local.awaitingDraft;
        setMessages((previous) =>
          previous.map((message) =>
            message.id === local.answeredMessageId && message.role === 'assistant'
              ? { ...message, chosen: local.chosen }
              : message
          )
        );
        pushUser(trimmed);
        setMessages((previous) => [
          ...previous,
          {
            id: newChatId(),
            role: 'assistant',
            ...local.reply,
            source: 'local',
            creditsUsed: 0,
            createdAt: Date.now(),
          },
        ]);
        return;
      }
      // „Czy Halina odebrała zestaw?”: stan konta jest w panelu, model go nie zna.
      const account = accountQuestionReply(trimmed, context.patients, knownPatientIds);
      if (account) {
        // Asked „Czy chodzi o…?” first: the „Tak” answers this question.
        if (patientConfirmation(account.spec)) pendingCommandRef.current = trimmed;
        pushUser(trimmed);
        appendAssistant(account);
        return;
      }
      // „Dodaj ćwiczenie X” przy otwartej propozycji zestawu: ćwiczenie trafia do niej, bez AI i bez kredytu.
      const openDraft = openSetDraft(messagesRef.current);
      const liveDraft = openDraft ? getLiveDraft?.(openDraft.messageId) : undefined;
      const addition =
        openDraft && liveDraft ? addToDraftReply(trimmed, liveDraft.draft, liveDraft.catalog, context.patients) : null;
      if (openDraft && addition) {
        // Nowa karta zestawu sama blokuje poprzednią; karta nowego ćwiczenia zamyka ją tutaj.
        if (addition.closesDraft && addition.reply.spec?.component !== 'SetDraft') {
          markChosen(openDraft.messageId, 'create-exercise');
        }
        pendingCommandRef.current = undefined;
        pushUser(trimmed);
        appendAssistant(addition.reply);
        return;
      }
      inFlightRef.current = true;
      pushUser(trimmed);
      setIsBusy(true);
      const epoch = threadEpochRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const resolved = await resolveReply(trimmed, {
          signal: controller.signal,
          useAi,
          sessionId: sessionRef.current?.scopeKey === scopeKey ? sessionRef.current.id : undefined,
          context,
          dispatch: dispatchChatMessage,
          pendingCommand: pendingCommandRef.current,
          contextPatientId,
          knownPatientIds,
          newPatientContext: threadNewPatientDetails(messagesRef.current),
        });
        // Pytanie o ćwiczenia bez karty w odpowiedzi (nic nie pasuje): pomysły na nowe dla tej potrzeby.
        // A refusal about a patient gets no card, so no exercise ideas either.
        let reply = resolved.notice ? resolved : withExerciseIdeas(trimmed, resolved);
        if (threadEpochRef.current !== epoch) return;
        // Nowe ćwiczenie, o które poproszono przy otwartej propozycji zestawu, wraca do tej propozycji.
        if (openDraft && liveDraft && reply.spec?.component === 'CreateExercise' && draftRequest(trimmed)) {
          reply = { ...reply, spec: { ...reply.spec, addToSet: liveDraft.draft } };
          markChosen(openDraft.messageId, 'create-exercise');
        }
        // AI questions count too: if the next dispatch fails, rules finish the command.
        const isUnsupported = reply.spec === UNSUPPORTED_SPEC;
        const asksForPatient = reply.spec?.component === 'Clarify' && !isUnsupported;
        const previousCommand = pendingCommandRef.current;
        // "Tego jeszcze nie umiem" after a typo keeps the question open, so its options still finish it.
        if (asksForPatient) {
          pendingCommandRef.current = reply.pendingCommand ?? [previousCommand, trimmed].filter(Boolean).join(' ');
        } else if (!isUnsupported) pendingCommandRef.current = undefined;
        heldRef.current = reply.held;
        if (reply.sessionId) sessionRef.current = { scopeKey, id: reply.sessionId };
        const showFallback = reply.fallbackReason !== undefined && !hasNotifiedFallbackRef.current;
        if (showFallback) hasNotifiedFallbackRef.current = true;
        setMessages((previous) => [
          ...previous,
          {
            id: newChatId(),
            role: 'assistant',
            text: reply.text,
            spec: reply.spec,
            source: reply.source,
            creditsUsed: reply.creditsUsed,
            fallbackReason: showFallback ? reply.fallbackReason : undefined,
            ...(reply.notice ? { notice: reply.notice } : {}),
            createdAt: Date.now(),
          },
        ]);
      } finally {
        if (threadEpochRef.current === epoch) {
          inFlightRef.current = false;
          setIsBusy(false);
        }
      }
    },
    [
      appendAssistant,
      choosePatient,
      context,
      getContextPatientId,
      getLiveDraft,
      markChosen,
      pushUser,
      ready,
      scopeKey,
      setMessages,
      useAi,
    ]
  );

  /**
   * The rest of a combined request („… i ułóż mu zestaw”) carried out for the patient the form just
   * added, by id: the model composes when allowed, rules otherwise. Nothing new is typed by the therapist.
   */
  const continueForPatient = useCallback(
    async (patientId: string, name: string, command: string) => {
      const added = `Dodano: ${name}.`;
      if (inFlightRef.current) {
        appendAssistant({ text: `${added} Napisz jeszcze raz resztę prośby: „${command}”.` });
        return;
      }
      inFlightRef.current = true;
      setIsBusy(true);
      const epoch = threadEpochRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const reply = await resolveForPatient(command, patientId, {
          signal: controller.signal,
          useAi,
          sessionId: sessionRef.current?.scopeKey === scopeKey ? sessionRef.current.id : undefined,
          context,
          dispatch: dispatchChatMessage,
          patientName: name,
        });
        if (threadEpochRef.current !== epoch) return;
        if (reply.sessionId) sessionRef.current = { scopeKey, id: reply.sessionId };
        const showFallback = reply.fallbackReason !== undefined && !hasNotifiedFallbackRef.current;
        if (showFallback) hasNotifiedFallbackRef.current = true;
        setMessages((previous) => [
          ...previous,
          {
            id: newChatId(),
            role: 'assistant',
            text: `${added} ${reply.text}`.trim(),
            spec: reply.spec,
            source: reply.source,
            creditsUsed: reply.creditsUsed,
            fallbackReason: showFallback ? reply.fallbackReason : undefined,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        if (threadEpochRef.current === epoch) {
          inFlightRef.current = false;
          setIsBusy(false);
        }
      }
    },
    [appendAssistant, context, scopeKey, setMessages, useAi]
  );

  /** What the therapist chose (a shortcut, a quick reply) and the thread's answer to it, both local. */
  const appendExchange = useCallback(
    (userText: string, reply: AssistantReply, attachmentName?: string) => {
      pushUser(userText, attachmentName);
      appendAssistant(reply);
    },
    [appendAssistant, pushUser]
  );

  /** „Wróć do tej wersji” on a locked set proposal: it becomes the newest card; the active one locks. */
  const restoreDraft = useCallback(
    (spec: Extract<ChatCardSpec, { component: 'SetDraft' }>) =>
      appendExchange(RESTORE_DRAFT_LABEL, { text: RESTORED_DRAFT_TEXT, spec }),
    [appendExchange]
  );

  /**
   * Local work the therapist started (a document to read): shown as busy like a dispatcher call.
   * Resolves true only when the task's reply reached the thread.
   */
  const runTask = useCallback(
    async (
      userText: string,
      task: (signal: AbortSignal) => Promise<AssistantReply>,
      attachmentName?: string
    ): Promise<boolean> => {
      if (inFlightRef.current) return false;
      inFlightRef.current = true;
      pushUser(userText, attachmentName);
      setIsBusy(true);
      const epoch = threadEpochRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const reply = await task(controller.signal);
        if (threadEpochRef.current !== epoch) return false;
        appendAssistant(reply);
        return true;
      } catch (error) {
        if (threadEpochRef.current !== epoch) return false;
        const message = error instanceof Error && error.message ? error.message : 'Nie udało się tego zrobić.';
        appendAssistant({ text: `${message} Spróbuj jeszcze raz albo napisz, co zrobić.` });
        return false;
      } finally {
        if (threadEpochRef.current === epoch) {
          inFlightRef.current = false;
          setIsBusy(false);
        }
      }
    },
    [appendAssistant, pushUser]
  );

  /** The therapist stopped the reply: the request is aborted, the question stays, a late answer is dropped. */
  // The model never saw its own answer, so the next turn starts a new AI session.
  const stop = useCallback(() => {
    if (!inFlightRef.current) return;
    abortRef.current?.abort();
    threadEpochRef.current += 1;
    inFlightRef.current = false;
    sessionRef.current = undefined;
    pendingCommandRef.current = undefined;
    heldRef.current = undefined;
    awaitingDraftRef.current = undefined;
    setIsBusy(false);
    appendAssistant({ text: STOPPED_TEXT });
  }, [appendAssistant]);

  const reset = useCallback(
    (nextMessages: ChatThreadMessage[] = []) => {
      startOver();
      setMessages(nextMessages);
      setIsBusy(false);
    },
    [setMessages, startOver]
  );

  return {
    messages,
    isBusy,
    send,
    stop,
    appendAssistant,
    appendExchange,
    choosePatient,
    continueForPatient,
    restoreDraft,
    runTask,
    markChosen,
    reset,
  };
}
