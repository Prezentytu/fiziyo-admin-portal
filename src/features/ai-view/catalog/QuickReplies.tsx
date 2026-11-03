'use client';

import { ChoiceChip } from '@/components/ui/choice-chip';

interface QuickRepliesProps {
  readonly options: readonly string[];
  readonly chosen?: string;
  readonly onPick: (option: string, index: number) => void;
  readonly testId: string;
  readonly disabled?: boolean;
}

/** Answers under a question: the first is the suggested one; once one is picked the rest are spent. */
export function QuickReplies({ options, chosen, onPick, testId, disabled = false }: QuickRepliesProps) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Szybkie odpowiedzi">
      {options.map((option, index) => (
        <ChoiceChip
          key={option}
          variant={chosen === option ? 'chosen' : index === 0 && chosen === undefined ? 'primary' : 'default'}
          disabled={disabled || chosen !== undefined}
          aria-pressed={chosen === option}
          onClick={() => onPick(option, index)}
          data-testid={`${testId}-option-${index}-btn`}
        >
          {option}
        </ChoiceChip>
      ))}
    </div>
  );
}
