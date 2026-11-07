'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { ArrowRight, GitBranch } from 'lucide-react';

import { GET_RELATED_EXERCISES_QUERY } from '@/graphql/queries/exerciseRelations.queries';
import type { RelatedExercisesResponse, RelatedExercisesVariables } from '@/graphql/types';

import { groupRelatedExercises, type RelatedExerciseLink } from './utils/relatedExerciseGroups';

interface RelatedExercisesSectionProps {
  organizationId: string | null | undefined;
  exerciseId: string;
  testIdPrefix?: string;
}

function RelatedExerciseRow({ item, testIdPrefix }: Readonly<{ item: RelatedExerciseLink; testIdPrefix: string }>) {
  return (
    <li className="space-y-0.5" data-testid={`${testIdPrefix}-item-${item.id}`}>
      {item.href ? (
        <Link
          href={item.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          data-testid={`${testIdPrefix}-link-${item.id}`}
        >
          {item.name}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : (
        <span
          className="text-sm font-medium text-foreground"
          title="Ćwiczenie niedostępne w tym gabinecie"
          data-testid={`${testIdPrefix}-name-${item.id}`}
        >
          {item.name}
        </span>
      )}
      {item.difference && <p className="text-sm text-muted-foreground">{item.difference}</p>}
      {item.whenToSwitch && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Kiedy przejść:</span> {item.whenToSwitch}
        </p>
      )}
    </li>
  );
}

/**
 * „Progresja i regresja” — related exercises in the exercise view and in verification.
 * Read-only; relations come from the catalog import. Hidden when there is nothing to show.
 */
export function RelatedExercisesSection({
  organizationId,
  exerciseId,
  testIdPrefix = 'exercise-related',
}: Readonly<RelatedExercisesSectionProps>) {
  const { data } = useQuery<RelatedExercisesResponse, RelatedExercisesVariables>(GET_RELATED_EXERCISES_QUERY, {
    variables: { organizationId: organizationId ?? '', exerciseId },
    skip: !organizationId || !exerciseId,
    fetchPolicy: 'cache-and-network',
  });

  const groups = groupRelatedExercises(data?.relatedExercises ?? []);
  if (groups.length === 0) return null;

  return (
    <section
      className="space-y-4 rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6"
      data-testid={testIdPrefix}
    >
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">Progresja i regresja</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2" data-testid={`${testIdPrefix}-group-${group.key}`}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{group.title}</p>
            <ul className="space-y-2.5">
              {group.items.map((item) => (
                <RelatedExerciseRow key={item.id} item={item} testIdPrefix={testIdPrefix} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
