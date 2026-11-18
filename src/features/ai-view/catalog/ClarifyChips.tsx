'use client';

import { ChoiceChip } from '@/components/ui/choice-chip';
import { useComposerDraft } from '../ComposerDraftContext';
import type { ClarifyQuestion } from '../utils/clarifyQuestions';

/**
 * Questions that let the assistant pick better. The chip shows the question; a tap starts the message
 * with its short topic („Strona ciała: ”), the therapist adds the answer, and the next reply narrows
 * the proposal. „Inne…” starts free text.
 */
export function ClarifyChips({
  lead,
  questions,
  testId,
}: {
  readonly lead: string;
  readonly questions: readonly ClarifyQuestion[];
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
            key={question.topic}
            onClick={() => draftInComposer(`${question.topic}: `)}
            data-testid={`${testId}-${index}-btn`}
          >
            {question.label}
          </ChoiceChip>
        ))}
        <ChoiceChip onClick={() => draftInComposer('Doprecyzowanie: ')} data-testid={`${testId}-other-btn`}>
          Inne…
        </ChoiceChip>
      </div>
    </div>
  );
}
