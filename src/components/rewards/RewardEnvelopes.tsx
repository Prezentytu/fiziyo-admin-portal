'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SectionHeader } from '@/components/shared/page';
import { ANSWER_REWARD_ENVELOPE_MUTATION } from '@/graphql/mutations/organizationRewards.mutations';
import {
  GET_REWARD_QUEUE_QUERY,
  GET_REWARD_EXERCISES_QUERY,
  GET_PATIENT_REWARDS_QUERY,
} from '@/graphql/queries/organizationRewards.queries';
import type { RewardEnvelope } from '@/graphql/types';
import { rewardDate, rewardExerciseOptions } from './utils/rewardOptions';

function EnvelopeReply({ envelope, organizationId }: { envelope: RewardEnvelope; organizationId: string }) {
  const { register, handleSubmit, setValue, control } = useForm({ defaultValues: { text: '', exerciseId: '' } });
  const exercises = useQuery(GET_REWARD_EXERCISES_QUERY, {
    variables: { organizationId, patientId: envelope.patientId },
    skip: !envelope.requiresExercise,
    fetchPolicy: 'no-cache',
  });
  const choices = rewardExerciseOptions(exercises.data?.patientAssignments ?? []);
  const [answer, { loading }] = useMutation(ANSWER_REWARD_ENVELOPE_MUTATION, {
    refetchQueries: [GET_REWARD_QUEUE_QUERY, GET_PATIENT_REWARDS_QUERY],
    awaitRefetchQueries: true,
    onError: (error) => toast.error(error.message),
    onCompleted: () => toast.success('Odpowiedź trafiła do koperty pacjenta'),
  });
  const text = useWatch({ control, name: 'text' });
  const exerciseId = useWatch({ control, name: 'exerciseId' });
  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={handleSubmit((values) => {
        const parsed = z.string().trim().min(1).max(280).safeParse(values.text);
        if (
          !parsed.success ||
          (envelope.requiresExercise && !choices.some((exercise) => exercise.id === values.exerciseId))
        )
          return;
        void answer({
          variables: {
            redemptionId: envelope.id,
            text: parsed.data,
            exerciseId: envelope.requiresExercise ? values.exerciseId : undefined,
          },
        });
      })}
    >
      {!text && envelope.sentenceStarters.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {envelope.sentenceStarters.map((starter) => (
            <Button
              key={starter}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('text', starter)}
              data-testid={`rewards-starter-${envelope.id}-${envelope.sentenceStarters.indexOf(starter)}`}
            >
              {starter}
            </Button>
          ))}
        </div>
      )}
      <label className="text-sm">
        Odpowiedź ({text.length}/280)
        <Textarea required maxLength={280} data-testid={`rewards-answer-text-${envelope.id}`} {...register('text')} />
      </label>
      {envelope.requiresExercise && (
        <label className="text-sm">
          Ćwiczenie z planu pacjenta
          <select
            className="block w-full rounded-md border border-input bg-background p-2"
            required
            {...register('exerciseId')}
            data-testid={`rewards-exercise-${envelope.id}`}
          >
            <option value="">
              {exercises.loading
                ? 'Pobieranie ćwiczeń…'
                : choices.length
                  ? 'Wybierz ćwiczenie'
                  : 'Brak ćwiczeń do wyboru'}
            </option>
            {choices.map((exercise) => (
              <option value={exercise.id} key={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {exercises.error && (
        <p role="alert">
          Nie udało się pobrać ćwiczeń.{' '}
          <Button
            type="button"
            variant="plain"
            onClick={() => void exercises.refetch()}
            data-testid="rewards-retry-exercises"
          >
            Ponów
          </Button>
        </p>
      )}
      <Button
        type="submit"
        className="justify-self-start"
        disabled={loading || !text.trim() || (envelope.requiresExercise && !exerciseId)}
        data-testid={`rewards-send-answer-${envelope.id}`}
      >
        Wyślij odpowiedź
      </Button>
    </form>
  );
}

export function EnvelopeCard({
  envelope,
  organizationId,
  showPatient = false,
}: {
  envelope: RewardEnvelope;
  organizationId: string;
  showPatient?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <article className="rounded-card bg-surface-card p-4">
      {showPatient && (
        <Link
          href={`/patients/${encodeURIComponent(envelope.patientId)}`}
          className="text-sm text-tint underline"
          data-testid={`rewards-patient-${envelope.id}`}
        >
          {envelope.patientName}
        </Link>
      )}
      <h3 className="font-semibold">{envelope.title}</h3>
      {envelope.answerText ? (
        <>
          <p className="mt-1 whitespace-pre-wrap text-sm">{envelope.answerText}</p>
          {envelope.exerciseName && <p className="text-sm text-muted-foreground">{envelope.exerciseName}</p>}
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {envelope.overdue
              ? 'Punkty wróciły do pacjenta. Nadal możesz odpowiedzieć.'
              : `Odpowiedz do ${rewardDate(envelope.dueAt)}`}
          </p>
          <Button
            size="sm"
            className="mt-3"
            variant="outline"
            aria-expanded={opened}
            onClick={() => setOpened(!opened)}
            data-testid={`rewards-open-answer-${envelope.id}`}
          >
            {opened ? 'Zwiń odpowiedź' : 'Napisz odpowiedź'}
          </Button>
          {opened && <EnvelopeReply envelope={envelope} organizationId={organizationId} />}
        </>
      )}
    </article>
  );
}

export function RewardQueue({ organizationId }: { organizationId: string }) {
  const { data, error, refetch } = useQuery(GET_REWARD_QUEUE_QUERY, { fetchPolicy: 'network-only' });
  if (error)
    return (
      <p role="alert">
        Nie udało się pobrać kolejki kopert.{' '}
        <Button variant="plain" data-testid="rewards-retry-queue" onClick={() => void refetch()}>
          Ponów
        </Button>
      </p>
    );
  if (!data?.organizationRewardQueue.length) return null;
  return (
    <section className="space-y-2">
      <SectionHeader title={`Koperty do odpowiedzi (${data.organizationRewardQueue.length})`} />
      {data.organizationRewardQueue.map((envelope) => (
        <EnvelopeCard key={envelope.id} envelope={envelope} organizationId={organizationId} showPatient />
      ))}
    </section>
  );
}
