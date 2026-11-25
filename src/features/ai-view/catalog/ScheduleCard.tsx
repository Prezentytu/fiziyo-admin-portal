'use client';

import { useChatActions } from '../ChatSessionContext';
import {
  FLOW_CANCEL_LABEL,
  FLOW_CANCELLED_TEXT,
  proposedPlan,
  scheduleReplies,
  sendSummaryText,
} from '../utils/schedulePlan';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';

/** "Od kiedy i jak często?": one tap picks a plan; the summary card below still lets it change. */
export function ScheduleCard({ spec, testId, messageId, chosen }: CardProps<'Schedule'>) {
  const { appendExchange, markChosen } = useChatActions();
  const replies = scheduleReplies(proposedPlan(spec.draft.rhythm));
  return (
    <div data-testid={testId}>
      <QuickReplies
        options={[...replies.map((reply) => reply.label), FLOW_CANCEL_LABEL]}
        chosen={chosen}
        testId={testId}
        onPick={(option, index) => {
          markChosen(messageId, option);
          if (index >= replies.length) {
            appendExchange(option, { text: FLOW_CANCELLED_TEXT });
            return;
          }
          const plan = replies[index].plan;
          appendExchange(option, {
            text: sendSummaryText(plan),
            spec: { component: 'SendSummary', draft: spec.draft, plan },
          });
        }}
      />
    </div>
  );
}
