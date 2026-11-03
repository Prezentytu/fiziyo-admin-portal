'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';

export function SetSavedCard({ spec, testId }: CardProps<'SetSaved'>) {
  return (
    <ChatCard
      testId={testId}
      title={spec.name}
      meta={<span>Zestaw w katalogu gabinetu</span>}
      footer={
        <>
          <span className="text-[13px] text-label-secondary">
            Napisz „przypisz {spec.name} …”, żeby wysłać go pacjentowi
          </span>
          <Button variant="outline" asChild data-testid={`${testId}-open-link`}>
            <Link href={`/exercise-sets/${spec.setId}`}>Otwórz zestaw</Link>
          </Button>
        </>
      }
    />
  );
}
