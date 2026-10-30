'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { dispatchChatMessage } from './chatDispatchClient';
import type { IntentContext } from './utils/intentRouter';
import { resolveReply, type DispatchFailure } from './utils/resolveReply';
import type { ChatViewSpec } from './utils/viewSpec';

export type ChatThreadMessage =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      spec: ChatViewSpec;
      source: 'ai' | 'rules';
      creditsUsed: number;
      fallbackReason?: DispatchFailure;
    };

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ChatThreadOptions {
  useAi: boolean;
  context: IntentContext;
  /** False while patients and sets load: rules would answer from an empty context. */
  ready: boolean;
  /** Active organization; a new one starts a new conversation and a new AI session. */
  scopeKey: string;
}

/** One conversation: user messages and the card the dispatcher (AI or rules) picked for each. */
export function useChatThread({ useAi, context, ready, scopeKey }: ChatThreadOptions) {
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [threadScope, setThreadScope] = useState(scopeKey);
  const sessionRef = useRef<{ scopeKey: string; id: string } | undefined>(undefined);
  const hasNotifiedFallbackRef = useRef(false);
  const activeScopeRef = useRef(scopeKey);

  if (threadScope !== scopeKey) {
    setThreadScope(scopeKey);
    setMessages([]);
    setIsBusy(false);
  }

  useEffect(() => {
    activeScopeRef.current = scopeKey;
    hasNotifiedFallbackRef.current = false;
  }, [scopeKey]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy || !ready) return;
      setMessages((previous) => [...previous, { id: newId(), role: 'user', text: trimmed }]);
      setIsBusy(true);
      try {
        const reply = await resolveReply(trimmed, {
          useAi,
          sessionId: sessionRef.current?.scopeKey === scopeKey ? sessionRef.current.id : undefined,
          context,
          dispatch: dispatchChatMessage,
        });
        // The organization changed while the reply was in flight: it belongs to the old thread.
        if (activeScopeRef.current !== scopeKey) return;
        if (reply.sessionId) sessionRef.current = { scopeKey, id: reply.sessionId };
        const showFallback = reply.fallbackReason !== undefined && !hasNotifiedFallbackRef.current;
        if (showFallback) hasNotifiedFallbackRef.current = true;
        setMessages((previous) => [
          ...previous,
          {
            id: newId(),
            role: 'assistant',
            spec: reply.spec,
            source: reply.source,
            creditsUsed: reply.creditsUsed,
            fallbackReason: showFallback ? reply.fallbackReason : undefined,
          },
        ]);
      } finally {
        if (activeScopeRef.current === scopeKey) setIsBusy(false);
      }
    },
    [context, isBusy, ready, scopeKey, useAi]
  );

  /** Cards append follow-ups (e.g. a new set ready to assign) without a model call. */
  const appendSpec = useCallback((spec: ChatViewSpec) => {
    setMessages((previous) => [...previous, { id: newId(), role: 'assistant', spec, source: 'rules', creditsUsed: 0 }]);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    sessionRef.current = undefined;
    hasNotifiedFallbackRef.current = false;
  }, []);

  return { messages, isBusy, send, appendSpec, reset };
}
