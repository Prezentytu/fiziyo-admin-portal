'use client';

import { useState } from 'react';
import { Check, MessageCircleQuestion, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ChoiceChip } from '@/components/ui/choice-chip';
import { useChatActions, useChatBusy } from '../ChatSessionContext';
import { useComposerDraft } from '../ComposerDraftContext';
import {
  chosenClarifyAnswers,
  composeClarifyAnswers,
  composeRepickMessage,
  type ClarifyQuestion,
} from '../utils/clarifyQuestions';

type Chosen = Readonly<Record<string, readonly string[]>>;

export interface ClarifyAnswers {
  readonly questions: readonly ClarifyQuestion[];
  readonly chosen: Chosen;
  /** The marked answers in question order; non-empty means the card shows the decision bar. */
  readonly picked: readonly string[];
  readonly isBusy: boolean;
  toggle: (question: ClarifyQuestion, option: string) => void;
  other: () => void;
  clear: () => void;
  repick: () => void;
}

/**
 * State of a card's clarifying questions. A tap on an answer marks it and puts all marked answers in the
 * message field as „Temat: odpowiedź” lines, ready to send; a second tap unmarks it. „Inne…” adds a
 * free-text line under them. `repick` sends the request with the answers at once (and empties the field),
 * so the next reply brings a proposal that applies them; the card locks as an earlier version. Kept in
 * the card, because while answers are marked the card's footer becomes the one decision bar.
 */
export function useClarifyAnswers(questions: readonly ClarifyQuestion[], request: string | undefined): ClarifyAnswers {
  const draftInComposer = useComposerDraft();
  const { sendMessage } = useChatActions();
  const isBusy = useChatBusy();
  const [chosen, setChosen] = useState<Chosen>({});

  return {
    questions,
    chosen,
    picked: chosenClarifyAnswers(questions, chosen),
    isBusy,
    toggle: (question, option) => {
      const current = chosen[question.topic] ?? [];
      const answers = current.includes(option)
        ? current.filter((answer) => answer !== option)
        : question.multi
          ? [...current, option]
          : [option];
      const next = { ...chosen, [question.topic]: answers };
      setChosen(next);
      draftInComposer(composeClarifyAnswers(questions, next));
    },
    other: () => {
      const answers = composeClarifyAnswers(questions, chosen);
      draftInComposer(answers ? `${answers}\nDoprecyzowanie: ` : 'Doprecyzowanie: ');
    },
    clear: () => {
      setChosen({});
      draftInComposer('');
    },
    repick: () => {
      const message = composeRepickMessage(request, questions, chosen);
      if (!message) return;
      setChosen({});
      draftInComposer('');
      sendMessage(message);
    },
  };
}

/** The questions as their own inset panel, so the answers do not blend with the card's action buttons. */
export function ClarifyChips({
  answers,
  hint,
  testId,
}: {
  readonly answers: ClarifyAnswers;
  readonly hint: string;
  readonly testId: string;
}) {
  const { questions, chosen, toggle, other } = answers;
  if (questions.length === 0) return null;

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

/**
 * The card's footer while answers are marked: what was chosen and one decision. The card's own actions
 * (save, editor, next step) come back after „Dobierz ponownie” or „Wyczyść”.
 */
export function ClarifyRepickBar({ answers, testId }: { readonly answers: ClarifyAnswers; readonly testId: string }) {
  return (
    <>
      <span
        className="min-w-0 flex-1 truncate text-[13px] text-label-secondary"
        aria-live="polite"
        data-testid={`${testId}-repick`}
      >
        Uwzględnię: <span className="text-foreground">{answers.picked.join(' · ')}</span>
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={answers.clear} data-testid={`${testId}-clear-btn`}>
          Wyczyść
        </Button>
        <Button onClick={answers.repick} disabled={answers.isBusy} data-testid={`${testId}-repick-btn`}>
          <RefreshCw aria-hidden="true" />
          Dobierz ponownie
        </Button>
      </div>
    </>
  );
}
