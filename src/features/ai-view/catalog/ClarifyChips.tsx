'use client';

import { ChoiceChip } from '@/components/ui/choice-chip';
import { useComposerDraft } from '../ComposerDraftContext';

/**
 * Topics that let the assistant pick better: a tap starts the message with „Temat: ”,
 * the therapist adds the answer, and the next reply narrows the proposal. „Inne…” starts free text.
 */
export function ClarifyChips({
  lead,
  topics,
  testId,
}: {
  readonly lead: string;
  readonly topics: readonly string[];
  readonly testId: string;
}) {
  const draftInComposer = useComposerDraft();
  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <span className="text-[13px] text-label-secondary">{lead}</span>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic, index) => (
          <ChoiceChip key={topic} onClick={() => draftInComposer(`${topic}: `)} data-testid={`${testId}-${index}-btn`}>
            {topic}
          </ChoiceChip>
        ))}
        <ChoiceChip onClick={() => draftInComposer('Doprecyzowanie: ')} data-testid={`${testId}-other-btn`}>
          Inne…
        </ChoiceChip>
      </div>
    </div>
  );
}
