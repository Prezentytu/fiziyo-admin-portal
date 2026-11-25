'use client';

import { useState } from 'react';
import { Check, MessageCircleQuestion } from 'lucide-react';

import { ChoiceChip } from '@/components/ui/choice-chip';
import { useComposerDraft } from '../ComposerDraftContext';
import { composeClarifyAnswers, type ClarifyQuestion } from '../utils/clarifyQuestions';

type Chosen = Readonly<Record<string, readonly string[]>>;

/**
 * Questions that let the assistant pick better, each with its ready answers. A tap on an answer marks it
 * and puts all marked answers in the message field as „Temat: odpowiedź” lines, ready to send; a second
 * tap unmarks it. „Inne…” adds a free-text line under them. Rendered as its own inset panel, so the
 * answers do not blend with the card's action buttons.
 */
export function ClarifyChips({
  hint,
  questions,
  testId,
}: {
  readonly hint: string;
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
    <section
      aria-labelledby={`${testId}-title`}
      className="flex flex-col gap-3 rounded-[14px] bg-grouped-tertiary px-3.5 py-3"
      data-testid={testId}
    >
      <div className="flex items-start gap-2">
        <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-tint" aria-hidden="true" />
        <div className="min-w-0">
          <h4 id={`${testId}-title`} className="text-[14px] font-semibold leading-5 text-foreground">
            Doprecyzuj
          </h4>
          <p className="text-[13px] leading-[18px] text-label-secondary">{hint}</p>
        </div>
      </div>
      {questions.map((question, index) => (
        <div
          key={question.topic}
          role="group"
          aria-labelledby={`${testId}-${index}-label`}
          className="flex flex-col gap-1.5"
          data-testid={`${testId}-${index}`}
        >
          <span id={`${testId}-${index}-label`} className="text-[13px] font-medium text-label-secondary">
            {question.label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {question.options.map((option, optionIndex) => {
              const isChosen = chosen[question.topic]?.includes(option) ?? false;
              return (
                <ChoiceChip
                  key={option}
                  variant={isChosen ? 'primary' : 'default'}
                  className="h-8 px-3 text-[13px]"
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
        <ChoiceChip
          className="h-8 px-3 text-[13px] text-label-secondary"
          onClick={other}
          data-testid={`${testId}-other-btn`}
        >
          Inne…
        </ChoiceChip>
      </div>
    </section>
  );
}
