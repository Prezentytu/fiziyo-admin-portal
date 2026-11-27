'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseThumbnail } from '@/components/shared/exercise/ExerciseThumbnail';
import { buildExerciseImageUrls } from '@/components/shared/exercise/adapters';
import { useChatActions } from '../ChatSessionContext';
import { useAvailableExercises } from '../useAvailableExercises';
import { draftItemFromExercise, formatDraftParams } from '../utils/setDraft';

const DETAILS: readonly string[] = [];

// The light catalog list may not carry the description of an exercise saved a moment ago; the form's text
// is kept here for the summary. Memory only, like the draft (ai-view/AGENTS.md): after a reload the catalog's.
const createdDescriptions = new Map<string, string>();

export function rememberCreatedDescription(exerciseId: string, description: string): void {
  if (description.trim()) createdDescriptions.set(exerciseId, description.trim());
}

/**
 * What the create-exercise form becomes once saved: the new exercise as a found one looks (picture, name,
 * parameters, the patient's description), so the thread keeps what was made and the next reply builds on it.
 */
export function CreatedExerciseSummary({
  exerciseId,
  testId,
}: {
  readonly exerciseId: string;
  readonly testId: string;
}) {
  const { organizationId } = useChatActions();
  const { exercises, loading } = useAvailableExercises(organizationId, true, DETAILS);
  const exercise = exercises.find((candidate) => candidate.id === exerciseId);
  const description = exercise?.patientDescription?.trim() || createdDescriptions.get(exerciseId);

  return (
    <section
      data-testid={testId}
      className="flex animate-chat-rise items-start gap-3.5 rounded-[18px] border border-separator bg-card px-[18px] py-4"
    >
      {exercise ? (
        <>
          <ExerciseThumbnail
            src={buildExerciseImageUrls(exercise)[0] ?? null}
            sizeClass="h-14 w-14"
            className="rounded-[12px]"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold leading-[21px] text-foreground">{exercise.name}</h3>
              <Badge className="shrink-0" data-testid={`${testId}-new`}>
                nowe w katalogu
              </Badge>
            </div>
            <p className="truncate text-[13px] leading-[18px] tabular-nums text-label-secondary">
              {formatDraftParams(draftItemFromExercise(exercise))}
            </p>
            {description && (
              <p className="line-clamp-2 text-[13px] leading-[18px] text-label-secondary">{description}</p>
            )}
            <Link
              href={`/exercises/${exercise.id}`}
              className="mt-1 w-fit text-[13px] font-medium text-tint hover:underline"
              data-testid={`${testId}-open-link`}
            >
              Otwórz ćwiczenie
            </Link>
          </div>
        </>
      ) : loading ? (
        <>
          <Skeleton className="h-14 w-14 shrink-0 rounded-[12px]" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </>
      ) : (
        <p className="text-[14px] text-label-secondary">Ćwiczenie utworzone.</p>
      )}
    </section>
  );
}
