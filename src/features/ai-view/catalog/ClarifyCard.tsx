'use client';

import { useChatActions, useChatBusy } from '../ChatSessionContext';
import { resolveClarifyChoice } from '../utils/clarifyChoice';
import { describeSpec } from '../utils/replyText';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';

/**
 * The question itself is the message text; the card is its ready answers. An answer tied to a set
 * opens its draft right here (no model, no credit); any other answer is sent as the next message.
 */
export function ClarifyCard({ spec, testId, messageId, chosen }: CardProps<'Clarify'>) {
  const { sendMessage, markChosen, appendExchange, patients } = useChatActions();
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
          const draft = resolveClarifyChoice(spec, option);
          if (!draft) {
            sendMessage(option);
            return;
          }
          appendExchange(option, {
            text: describeSpec(draft, {
              patientName: (patientId) => patients.find((patient) => patient.id === patientId)?.name,
              setName: () => option,
            }),
            spec: draft,
          });
        }}
      />
    </div>
  );
}
