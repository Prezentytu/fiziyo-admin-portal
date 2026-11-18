'use client';

import { useChatActions, useChatBusy } from '../ChatSessionContext';
import { clarifyChoicePatientId, resolveClarifyChoice } from '../utils/clarifyChoice';
import { describeSpec } from '../utils/replyText';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';

/**
 * The question itself is the message text; the card is its ready answers. An answer tied to a set
 * opens its draft right here and an answer that is a patient picks that patient by id (no model, no
 * credit); any other answer is sent as the next message. „Tak, {Imię}” of „Czy chodzi o…?” is such a
 * patient answer; its „Inny pacjent” is read by the thread itself, also without the model.
 */
export function ClarifyCard({ spec, testId, messageId, chosen }: CardProps<'Clarify'>) {
  const { sendMessage, markChosen, appendExchange, choosePatient, patients } = useChatActions();
  const isBusy = useChatBusy();
  return (
    <div data-testid={testId}>
      <QuickReplies
        options={spec.options}
        chosen={chosen}
        disabled={isBusy}
        testId={testId}
        onPick={(option, index) => {
          markChosen(messageId, option);
          const patientId = clarifyChoicePatientId(spec, option, index);
          if (patientId) {
            choosePatient(patientId, option);
            return;
          }
          const draft = resolveClarifyChoice(spec, option, index);
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
