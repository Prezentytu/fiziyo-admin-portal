'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { polishPlural } from '@/utils/polishPlural';
import { cn } from '@/lib/utils';
import { useChatActions } from '../ChatSessionContext';
import { useAvailableExercises } from '../useAvailableExercises';
import type { CountFocus } from '../utils/threadLocalReply';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';

const ROWS: ReadonlyArray<{ focus: CountFocus; href: string; forms: [string, string, string]; note: string }> = [
  { focus: 'patients', href: '/patients', forms: ['pacjent', 'pacjentów', 'pacjentów'], note: 'w gabinecie' },
  {
    focus: 'exercises',
    href: '/exercises',
    forms: ['ćwiczenie', 'ćwiczenia', 'ćwiczeń'],
    note: 'własne i z katalogu FiziYo',
  },
  { focus: 'sets', href: '/exercise-sets', forms: ['zestaw', 'zestawy', 'zestawów'], note: 'w katalogu gabinetu' },
];

/** „Ilu mam pacjentów?”: the panel's own numbers, answered without AI. */
export function CatalogCountsCard({ spec, testId }: CardProps<'CatalogCounts'>) {
  const { organizationId, patients, sets } = useChatActions();
  const { exercises, loading } = useAvailableExercises(organizationId, true);
  const counts: Record<CountFocus, number | null> = {
    patients: patients.length,
    exercises: loading ? null : exercises.length,
    sets: sets.length,
  };
  // Pytana liczba pierwsza, pozostałe pod nią.
  const ordered = [...ROWS].sort((a, b) => Number(b.focus === spec.focus) - Number(a.focus === spec.focus));

  return (
    <ChatCard testId={testId} title="Stan gabinetu">
      <ul className="flex flex-col">
        {ordered.map((row) => {
          const count = counts[row.focus];
          const main = row.focus === spec.focus;
          return (
            <li
              key={row.focus}
              className="flex items-center gap-3 border-t-[0.5px] border-hairline py-2.5 first:border-t-0"
              data-testid={`${testId}-${row.focus}`}
            >
              <span className="min-w-0 flex-1">
                {count === null ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <b className={cn('font-semibold tabular-nums text-foreground', main ? 'text-[22px]' : 'text-[16px]')}>
                    {count} <span className="font-normal">{polishPlural(count, ...row.forms)}</span>
                  </b>
                )}
                <span className="block text-[13px] text-label-secondary">{row.note}</span>
              </span>
              <Button variant="ghost" size="sm" asChild data-testid={`${testId}-${row.focus}-link`}>
                <Link href={row.href}>
                  Lista
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </ChatCard>
  );
}
