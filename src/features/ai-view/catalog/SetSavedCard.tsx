'use client';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';

/** A set saved in the catalog: open it, or assign it to a patient right away. */
export function SetSavedCard({ spec, testId, messageId, chosen }: CardProps<'SetSaved'>) {
  const { appendExchange, markChosen } = useChatActions();
  const draft = spec.draft;
  const assign = () => {
    if (!draft) return;
    markChosen(messageId, 'assign');
    appendExchange(`Przypisz: ${spec.name}`, {
      text: 'Komu przypisać ten zestaw?',
      spec: { component: 'PickPatient', draft: { ...draft, sourceSetId: spec.setId } },
    });
  };

  return (
    <ChatCard
      testId={testId}
      title={spec.name}
      meta={<span>Zestaw w katalogu gabinetu</span>}
      footer={
        <>
          <Button variant="ghost" asChild data-testid={`${testId}-open-link`}>
            <Link href={`/exercise-sets/${spec.setId}`}>Otwórz zestaw</Link>
          </Button>
          {draft ? (
            <Button onClick={assign} disabled={chosen !== undefined} data-testid={`${testId}-assign-btn`}>
              <UserPlus aria-hidden="true" />
              Przypisz pacjentowi
            </Button>
          ) : (
            <span className="text-[13px] text-label-secondary">
              Napisz „przypisz {spec.name} …”, żeby wysłać go pacjentowi
            </span>
          )}
        </>
      }
    />
  );
}
