'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

import { ChoiceChip } from '@/components/ui/choice-chip';
import { useComposerDraft } from '../ComposerDraftContext';
import { composeClarifyAnswers, type ClarifyQuestion } from '../utils/clarifyQuestions';

type Chosen = Readonly<Record<string, readonly string[]>>;

/**
 * Questions that let the assistant pick better, each with its ready answers. A tap on an answer marks it
 * and puts all marked answers in the message field as „Temat: odpowiedź” lines, ready to send; a second
 * tap unmarks it. „Inne…” adds a free-text line under them.
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
  const [chosen, setChosen] = useState<Chosen>({});
  if (questions.length === 0) return null;

  const toggle = (question: ClarifyQuestion, option: string) => {
    const current = chosen[question.topic] ?? [];
    const answers = current.includes(option)
      ? current.filter((answer) => answer !== option)
      : question.multi
        ? [...current, option]
        : [option];
    const next = { ...chosen, [question.topic]: answers };
    setChosen(next);
    draftInComposer(composeClarifyAnswers(questions, next));
  };

  const other = () => {
    const answers = composeClarifyAnswers(questions, chosen);
    draftInComposer(answers ? `${answers}\nDoprecyzowanie: ` : 'Doprecyzowanie: ');
  };

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      <span className="text-[13px] text-label-secondary">{lead}</span>
      {questions.map((question, index) => (
        <div
          key={question.topic}
          role="group"
          aria-labelledby={`${testId}-${index}-label`}
          className="flex flex-col gap-1.5"
          data-testid={`${testId}-${index}`}
        >
          <span id={`${testId}-${index}-label`} className="text-[14px] font-medium text-foreground">
            {question.label}
          </span>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option, optionIndex) => {
              const isChosen = chosen[question.topic]?.includes(option) ?? false;
              return (
                <ChoiceChip
                  key={option}
                  variant={isChosen ? 'primary' : 'default'}
                  aria-pressed={isChosen}
                  onClick={() => toggle(question, option)}
                  data-testid={`${testId}-${index}-option-${optionIndex}-btn`}
                >
                  {isChosen && <Check aria-hidden="true" className="!text-tint" />}
                  {option}
                </ChoiceChip>
              );
            })}
          </div>
        </div>
      ))}
      <div>
        <ChoiceChip onClick={other} data-testid={`${testId}-other-btn`}>
          Inne…
        </ChoiceChip>
      </div>
    </div>
  );
}
