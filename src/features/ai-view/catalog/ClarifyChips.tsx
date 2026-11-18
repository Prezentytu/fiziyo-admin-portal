'use client';

import { ChoiceChip } from '@/components/ui/choice-chip';
import { useComposerDraft } from '../ComposerDraftContext';

/**
 * Questions that let the assistant pick better: a tap puts the question in the message field,
 * the therapist adds the answer, and the next reply narrows the proposal. „Inne…” starts free text.
 */
export function ClarifyChips({
  lead,
  questions,
  testId,
}: {
  readonly lead: string;
  readonly questions: readonly string[];
  readonly testId: string;
}) {
  const draftInComposer = useComposerDraft();
  if (questions.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <span className="text-[13px] text-label-secondary">{lead}</span>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <ChoiceChip
            key={question}
            onClick={() => draftInComposer(`${question} `)}
            data-testid={`${testId}-${index}-btn`}
          >
            {question}
          </ChoiceChip>
        ))}
        <ChoiceChip onClick={() => draftInComposer('Doprecyzowanie: ')} data-testid={`${testId}-other-btn`}>
          Inne…
        </ChoiceChip>
      </div>
    </div>
  );
}
