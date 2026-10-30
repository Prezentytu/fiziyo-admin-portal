'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useChatActions } from '../ChatActionsContext';
import type { ChatViewSpec } from '../utils/viewSpec';

type ClarifySpec = Extract<ChatViewSpec, { component: 'Clarify' }>;

/** A question with ready answers; the chosen answer is sent as the next message. */
export function ClarifyCard({ spec, testId }: { readonly spec: ClarifySpec; readonly testId: string }) {
  const { sendMessage } = useChatActions();
  const [chosen, setChosen] = useState<string | null>(null);

  const handlePick = (option: string) => {
    setChosen(option);
    sendMessage(option);
  };

  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      <p className="text-[16px] leading-[26px] text-foreground">{spec.question}</p>
      {spec.options.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Odpowiedzi">
          {spec.options.map((option, index) => (
            <Button
              key={option}
              variant={index === 0 && chosen === null ? 'plain' : 'outline'}
              size="sm"
              disabled={chosen !== null}
              onClick={() => handlePick(option)}
              data-testid={`${testId}-option-${index}-btn`}
            >
              {option}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
