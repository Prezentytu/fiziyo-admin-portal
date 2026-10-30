'use client';

import { useChatActions } from '../ChatSessionContext';
import { describePlan, SCHEDULE_REPLIES } from '../utils/schedulePlan';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';

/** "Od kiedy i jak często?": one tap picks a plan; the summary card below still lets it change. */
export function ScheduleCard({ spec, testId, messageId, chosen }: CardProps<'Schedule'>) {
  const { appendExchange, markChosen } = useChatActions();
  return (
    <div data-testid={testId}>
      <QuickReplies
        options={SCHEDULE_REPLIES.map((reply) => reply.label)}
        chosen={chosen}
        testId={testId}
        onPick={(option, index) => {
          const plan = SCHEDULE_REPLIES[index].plan;
          markChosen(messageId, option);
          appendExchange(option, {
            text: `Gotowe do wysłania: ${describePlan(plan)}. Sprawdź i wyślij.`,
            spec: { component: 'SendSummary', draft: spec.draft, plan },
          });
        }}
      />
    </div>
  );
}
