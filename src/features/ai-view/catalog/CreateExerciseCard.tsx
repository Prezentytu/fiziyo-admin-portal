'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';
import { QuickReplies } from './QuickReplies';
import { useCreateExercise } from './useChatWrites';

const numberField = z.number({ message: 'Podaj liczbę' }).int().min(0).max(3600);

export const NEW_EXERCISE_SCHEMA = z.object({
  name: z.string().trim().min(3, 'Nazwa ma co najmniej 3 znaki').max(120),
  description: z.string().trim().min(10, 'Opisz w jednym, dwóch zdaniach, jak wykonać ćwiczenie').max(2000),
  sets: numberField.min(1),
  reps: numberField,
  executionTime: numberField,
  restSets: numberField,
});

export type NewExerciseValues = z.infer<typeof NEW_EXERCISE_SCHEMA>;

const PARAM_FIELDS: ReadonlyArray<{ name: 'sets' | 'reps' | 'executionTime' | 'restSets'; label: string }> = [
  { name: 'sets', label: 'Serie' },
  { name: 'reps', label: 'Powtórzenia' },
  { name: 'executionTime', label: 'Czas powtórzenia (s)' },
  { name: 'restSets', label: 'Przerwa (s)' },
];

const NEXT_STEPS = ['Dodaj do zestawu', 'Gotowe'] as const;

/** Exercise for the organization's catalog, written in the thread (DEC-20261029-01 left this to the design). */
export function CreateExerciseCard({ spec, testId, messageId, chosen }: CardProps<'CreateExercise'>) {
  const { organizationId, contextPatient, appendExchange, markChosen } = useChatActions();
  const { create, creating } = useCreateExercise();
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const form = useForm<NewExerciseValues>({
    resolver: zodResolver(NEW_EXERCISE_SCHEMA),
    defaultValues: {
      name: spec.name ?? '',
      description: spec.description ?? '',
      sets: 3,
      reps: 10,
      executionTime: 0,
      restSets: 60,
    },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    const exercise = await create(organizationId, {
      name: values.name,
      patientDescription: values.description,
      sets: values.sets,
      reps: values.reps,
      executionTime: values.executionTime || null,
      restSets: values.restSets,
    });
    if (exercise) setCreated(exercise);
  });

  if (created || chosen !== undefined) {
    return (
      <div data-testid={testId} className="flex flex-col gap-3">
        <p className="text-[16px] leading-[26px] text-foreground">
          {created ? (
            <>
              Ćwiczenie <b className="font-semibold">{created.name}</b> jest w katalogu gabinetu. Zdjęcie i szczegóły
              dodasz na{' '}
              <Link href={`/exercises/${created.id}`} className="text-tint" data-testid={`${testId}-open-link`}>
                stronie ćwiczenia
              </Link>
              .
            </>
          ) : (
            'Ćwiczenie jest w katalogu gabinetu.'
          )}
        </p>
        {created && (
          <QuickReplies
            options={NEXT_STEPS}
            chosen={chosen}
            testId={testId}
            onPick={(option) => {
              markChosen(messageId, option);
              if (option === 'Dodaj do zestawu') {
                appendExchange(option, {
                  text: 'Zestaw z nowym ćwiczeniem. Dodaj kolejne z katalogu albo przejdź dalej.',
                  spec: { component: 'SetDraft', patientId: contextPatient?.id, exerciseIds: [created.id] },
                });
              } else {
                appendExchange(option, { text: 'Dobrze. Ćwiczenie znajdziesz w katalogu.' });
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <ChatCard testId={testId} title="Nowe ćwiczenie">
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void submit();
          }
        }}
        className="flex flex-col gap-3"
        data-testid={`${testId}-form`}
      >
        <label className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
          Nazwa
          <Input
            aria-invalid={errors.name ? true : undefined}
            data-testid={`${testId}-name-input`}
            {...form.register('name')}
          />
          {errors.name && <span className="text-[12px] text-status-danger">{errors.name.message}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
          Jak wykonać (dla pacjenta)
          <Textarea
            rows={3}
            aria-invalid={errors.description ? true : undefined}
            data-testid={`${testId}-description-input`}
            {...form.register('description')}
          />
          {errors.description && <span className="text-[12px] text-status-danger">{errors.description.message}</span>}
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PARAM_FIELDS.map((field) => (
            <label key={field.name} className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
              {field.label}
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                className="tabular-nums"
                aria-invalid={errors[field.name] ? true : undefined}
                data-testid={`${testId}-${field.name}-input`}
                {...form.register(field.name, { valueAsNumber: true })}
              />
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-label-secondary">Trafi do katalogu Twojego gabinetu</span>
          <Button type="submit" disabled={creating} data-testid={`${testId}-submit-btn`}>
            {creating ? 'Zapisuję…' : 'Utwórz ćwiczenie'}
          </Button>
        </div>
      </form>
    </ChatCard>
  );
}
