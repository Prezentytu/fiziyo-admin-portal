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

  if (threadScope !== scopeKey) {
    setThreadScope(scopeKey);
    setMessages([]);
    setIsBusy(false);
  }

  useEffect(() => {
    threadEpochRef.current += 1;
    hasNotifiedFallbackRef.current = false;
    pendingCommandRef.current = undefined;
  }, [scopeKey]);

  const pushAssistant = useCallback((reply: AssistantReply, source: 'ai' | 'rules' | 'local' = 'local') => {
    setMessages((previous) => [
      ...previous,
      { id: newChatId(), role: 'assistant', text: reply.text, spec: reply.spec, source, creditsUsed: 0, createdAt: Date.now() },
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
      if (!trimmed || isBusy || !ready) return;
      pushUser(trimmed);
      setIsBusy(true);
      const epoch = threadEpochRef.current;
      try {
        const reply = await resolveReply(trimmed, {
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
        if (threadEpochRef.current === epoch) setIsBusy(false);
      }
    },
    [context, isBusy, pushUser, ready, scopeKey, useAi]
  );

  /** A step of a flow (schedule, summary, sent) without a model call. */
  const appendAssistant = useCallback((reply: AssistantReply) => pushAssistant(reply), [pushAssistant]);

  /** What the therapist chose (a shortcut, a quick reply) and the thread's answer to it, both local. */
  const appendExchange = useCallback(
    (userText: string, reply: AssistantReply, attachmentName?: string) => {
      pushUser(userText, attachmentName);
      pushAssistant(reply);
    },
    [pushAssistant, pushUser]
  );

  /** Local work the therapist started (a document to read): shown as busy like a dispatcher call. */
  const runTask = useCallback(
    async (userText: string, task: () => Promise<AssistantReply>, attachmentName?: string) => {
      if (isBusy) return;
      pushUser(userText, attachmentName);
      setIsBusy(true);
      const epoch = threadEpochRef.current;
      try {
        const reply = await task();
        if (threadEpochRef.current === epoch) pushAssistant(reply);
      } catch (error) {
        if (threadEpochRef.current !== epoch) return;
        const message = error instanceof Error && error.message ? error.message : 'Nie udało się tego zrobić.';
        pushAssistant({ text: `${message} Spróbuj jeszcze raz albo napisz, co zrobić.` });
      } finally {
        if (threadEpochRef.current === epoch) setIsBusy(false);
      }
    },
    [isBusy, pushAssistant, pushUser]
  );

  const markChosen = useCallback((messageId: string, chosen: string) => {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId && message.role === 'assistant' ? { ...message, chosen } : message
      )
    );
  }, []);

  const reset = useCallback((nextMessages: ChatThreadMessage[] = []) => {
    threadEpochRef.current += 1;
    setMessages(nextMessages);
    setIsBusy(false);
    sessionRef.current = undefined;
    hasNotifiedFallbackRef.current = false;
    pendingCommandRef.current = undefined;
  }, []);

  return { messages, isBusy, send, appendAssistant, appendExchange, runTask, markChosen, reset };
}
