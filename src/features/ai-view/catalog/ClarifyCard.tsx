'use client';

import { useChatActions, useChatBusy } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';

/** The question itself is the message text; the card is its ready answers, sent as the next message. */
export function ClarifyCard({ spec, testId, messageId, chosen }: CardProps<'Clarify'>) {
  const { sendMessage, markChosen } = useChatActions();
  const isBusy = useChatBusy();
  return (
    <div data-testid={testId}>
      <QuickReplies
        options={spec.options}
        chosen={chosen}
        disabled={isBusy}
        testId={testId}
        onPick={(option) => {
          markChosen(messageId, option);
          sendMessage(option);
        }}
      />
    </div>
  );
}
