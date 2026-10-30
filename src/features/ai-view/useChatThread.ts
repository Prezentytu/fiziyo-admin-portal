'use client';

import { useCallback, useRef, useState } from 'react';

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

/** One conversation: user messages and the card the dispatcher (AI or rules) picked for each. */
export function useChatThread({ useAi, context }: { useAi: boolean; context: IntentContext }) {
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const hasNotifiedFallbackRef = useRef(false);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;
      setMessages((previous) => [...previous, { id: newId(), role: 'user', text: trimmed }]);
      setIsBusy(true);
      try {
        const reply = await resolveReply(trimmed, {
          useAi,
          sessionId: sessionIdRef.current,
          context,
          dispatch: dispatchChatMessage,
        });
        if (reply.sessionId) sessionIdRef.current = reply.sessionId;
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
        setIsBusy(false);
      }
    },
    [context, isBusy, useAi]
  );

  /** Cards append follow-ups (e.g. a new set ready to assign) without a model call. */
  const appendSpec = useCallback((spec: ChatViewSpec) => {
    setMessages((previous) => [...previous, { id: newId(), role: 'assistant', spec, source: 'rules', creditsUsed: 0 }]);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = undefined;
    hasNotifiedFallbackRef.current = false;
  }, []);

  return { messages, isBusy, send, appendSpec, reset };
}
