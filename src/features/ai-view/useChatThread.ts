'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { dispatchChatMessage } from './chatDispatchClient';
import type { ChatCardSpec } from './utils/chatCards';
import type { ChatThreadMessage } from './utils/conversationStore';
import type { IntentContext } from './utils/intentRouter';
import { resolveReply } from './utils/resolveReply';
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
  useAi: boolean;
  context: IntentContext;
  /** False while patients and sets load: rules would answer from an empty context. */
  ready: boolean;
  /** Active organization; a new one starts a new conversation and a new AI session. */
  scopeKey: string;
}

export const STOPPED_TEXT = 'Zatrzymane. Napisz, co zrobić inaczej.';

/**
 * One conversation: what the therapist wrote and what came back (a sentence and a card from the
 * dispatcher, AI or rules, or the next step of a flow the thread runs itself).
 */
export function useChatThread({ useAi, context, ready, scopeKey }: ChatThreadOptions) {
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [threadScope, setThreadScope] = useState(scopeKey);
  const sessionRef = useRef<{ scopeKey: string; id: string } | undefined>(undefined);
  const hasNotifiedFallbackRef = useRef(false);
  // The command behind the last question ("O kogo chodzi?"), so a rules answer finishes it.
  const pendingCommandRef = useRef<string | undefined>(undefined);
  // Bumped by a new conversation or organization: a reply still in flight belongs to the old one.
  const threadEpochRef = useRef(0);
  // isBusy only blocks after a render; a double click lands before it.
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | undefined>(undefined);

  if (threadScope !== scopeKey) {
    setThreadScope(scopeKey);
    setMessages([]);
    setIsBusy(false);
  }

  // Whatever is in flight belongs to the previous conversation from now on.
  const startOver = useCallback(() => {
    threadEpochRef.current += 1;
    inFlightRef.current = false;
    sessionRef.current = undefined;
    hasNotifiedFallbackRef.current = false;
    pendingCommandRef.current = undefined;
  }, []);

  useEffect(startOver, [scopeKey, startOver]);

  /** A step of a flow (schedule, summary, sent) without a model call. */
  const appendAssistant = useCallback((reply: AssistantReply) => {
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
  }, []);

  const pushUser = useCallback((text: string, attachmentName?: string) => {
    setMessages((previous) => [
      ...previous,
      { id: newChatId(), role: 'user', text, attachmentName, createdAt: Date.now() },
    ]);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || inFlightRef.current || !ready) return;
      inFlightRef.current = true;
      pushUser(trimmed);
      setIsBusy(true);
      const epoch = threadEpochRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const reply = await resolveReply(trimmed, {
          signal: controller.signal,
          useAi,
          sessionId: sessionRef.current?.scopeKey === scopeKey ? sessionRef.current.id : undefined,
          context,
          dispatch: dispatchChatMessage,
          pendingCommand: pendingCommandRef.current,
        });
        if (threadEpochRef.current !== epoch) return;
        // AI questions count too: if the next dispatch fails, rules finish the command.
        const isUnsupported = reply.spec === UNSUPPORTED_SPEC;
        const asksForPatient = reply.spec?.component === 'Clarify' && !isUnsupported;
        const previousCommand = pendingCommandRef.current;
        // "Tego jeszcze nie umiem" after a typo keeps the question open, so its options still finish it.
        if (asksForPatient) pendingCommandRef.current = [previousCommand, trimmed].filter(Boolean).join(' ');
        else if (!isUnsupported) pendingCommandRef.current = undefined;
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
    [context, pushUser, ready, scopeKey, useAi]
  );

  /** What the therapist chose (a shortcut, a quick reply) and the thread's answer to it, both local. */
  const appendExchange = useCallback(
    (userText: string, reply: AssistantReply, attachmentName?: string) => {
      pushUser(userText, attachmentName);
      appendAssistant(reply);
    },
    [appendAssistant, pushUser]
  );

  /**
   * Local work the therapist started (a document to read): shown as busy like a dispatcher call.
   * Resolves true only when the task's reply reached the thread.
   */
  const runTask = useCallback(
    async (userText: string, task: () => Promise<AssistantReply>, attachmentName?: string): Promise<boolean> => {
      if (inFlightRef.current) return false;
      inFlightRef.current = true;
      pushUser(userText, attachmentName);
      setIsBusy(true);
      const epoch = threadEpochRef.current;
      try {
        const reply = await task();
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

  const markChosen = useCallback((messageId: string, chosen: string) => {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId && message.role === 'assistant' ? { ...message, chosen } : message
      )
    );
  }, []);

  /** The therapist stopped the reply: the request is aborted, the question stays, a late answer is dropped. */
  // The model never saw its own answer, so the next turn starts a new AI session.
  const stop = useCallback(() => {
    if (!inFlightRef.current) return;
    abortRef.current?.abort();
    threadEpochRef.current += 1;
    inFlightRef.current = false;
    sessionRef.current = undefined;
    pendingCommandRef.current = undefined;
    setIsBusy(false);
    appendAssistant({ text: STOPPED_TEXT });
  }, [appendAssistant]);

  const reset = useCallback(
    (nextMessages: ChatThreadMessage[] = []) => {
      startOver();
      setMessages(nextMessages);
      setIsBusy(false);
    },
    [startOver]
  );

  return { messages, isBusy, send, stop, appendAssistant, appendExchange, runTask, markChosen, reset };
}
