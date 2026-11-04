'use client';

import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SIDE_OPTIONS } from '@/components/shared/exercise/fieldContract';
import { Textarea } from '@/components/ui/textarea';
import { useChatActions } from '../ChatSessionContext';
import { useChatMode } from '../useChatMode';
import {
  buildChatExerciseEnrichment,
  CHAT_EXERCISE_DEFAULTS,
  itemsToLines,
  paramsFromSuggestion,
  resolveChatExerciseType,
} from '../utils/chatExerciseDraft';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';
import { useCreateExercise } from './useChatWrites';
import { useExerciseProposal } from './useExerciseProposal';

const numberField = z.number({ message: 'Podaj liczbę' }).int().min(0).max(3600);

export const NEW_EXERCISE_SCHEMA = z.object({
  name: z.string().trim().min(3, 'Nazwa ma co najmniej 3 znaki').max(120),
  description: z.string().trim().min(10, 'Opisz w jednym, dwóch zdaniach, jak wykonać ćwiczenie').max(2000),
  side: z.enum(['none', 'left', 'right', 'both', 'alternating']),
  sets: numberField.min(1),
  reps: numberField,
  executionTime: numberField,
  restSets: numberField,
  restReps: numberField,
  preparationTime: numberField,
  steps: z.string().max(4000),
  cues: z.string().max(2000),
});

export type NewExerciseValues = z.infer<typeof NEW_EXERCISE_SCHEMA>;

type ParamName = 'sets' | 'reps' | 'executionTime' | 'restSets' | 'restReps' | 'preparationTime';

const PARAM_FIELDS: ReadonlyArray<{ name: ParamName; label: string }> = [
  { name: 'sets', label: 'Serie' },
  { name: 'reps', label: 'Powtórzenia' },
  { name: 'executionTime', label: 'Czas powtórzenia (s)' },
  { name: 'restSets', label: 'Przerwa między seriami (s)' },
  { name: 'restReps', label: 'Przerwa między powtórzeniami (s)' },
  { name: 'preparationTime', label: 'Przygotowanie (s)' },
];

const PROPOSAL_STATUS = {
  loading: 'AI uzupełnia parametry, kroki i wskazówki…',
  ready: 'Propozycja AI. Sprawdź i popraw przed zapisem.',
  failed: 'AI teraz nie odpowiada, uzupełnij ręcznie.',
} as const;

/** Exercise for the organization's catalog, written in the thread (DEC-20261029-01 left this to the design). */
export function CreateExerciseCard({ spec, testId, messageId, chosen }: CardProps<'CreateExercise'>) {
  const { organizationId, contextPatient, appendAssistant, markChosen } = useChatActions();
  const { create, creating } = useCreateExercise();
  const { preference } = useChatMode();
  const form = useForm<NewExerciseValues>({
    resolver: zodResolver(NEW_EXERCISE_SCHEMA),
    defaultValues: {
      name: spec.name ?? '',
      description: spec.description ?? '',
      side: CHAT_EXERCISE_DEFAULTS.side,
      sets: CHAT_EXERCISE_DEFAULTS.sets,
      reps: CHAT_EXERCISE_DEFAULTS.reps,
      executionTime: CHAT_EXERCISE_DEFAULTS.executionTime,
      restSets: CHAT_EXERCISE_DEFAULTS.restSets,
      restReps: CHAT_EXERCISE_DEFAULTS.restReps,
      preparationTime: CHAT_EXERCISE_DEFAULTS.preparationTime,
      steps: '',
      cues: '',
    },
  });
  const { errors } = form.formState;
  const proposalState = useExerciseProposal({
    messageId,
    name: spec.name,
    description: spec.description,
    enabled: preference.useAi && chosen === undefined,
  });
  const proposal = proposalState.status === 'ready' ? proposalState.proposal : null;
  const exerciseType = useRef<'reps' | 'time'>(CHAT_EXERCISE_DEFAULTS.type);

  // Propozycja wypełnia tylko pola, których fizjoterapeuta jeszcze nie ruszył.
  useEffect(() => {
    if (!proposal) return;
    const fillNumber = (field: ParamName, value: number) => {
      if (!form.getFieldState(field).isDirty) form.setValue(field, value);
    };
    const fillText = (field: 'description' | 'steps' | 'cues', value: string) => {
      if (!form.getFieldState(field).isDirty) form.setValue(field, value);
    };
    if (proposal.suggestion) {
      const params = paramsFromSuggestion(proposal.suggestion);
      exerciseType.current = params.type;
      for (const field of PARAM_FIELDS) fillNumber(field.name, params[field.name]);
      if (!form.getFieldState('side').isDirty) form.setValue('side', params.side);
      if (!form.getValues('description').trim() && proposal.suggestion.description) {
        fillText('description', proposal.suggestion.description);
      }
    }
    fillText('steps', itemsToLines(proposal.steps));
    fillText('cues', itemsToLines(proposal.cues));
  }, [form, proposal]);

  const submit = form.handleSubmit(async (values) => {
    const exercise = await create(organizationId, {
      name: values.name,
      type: resolveChatExerciseType(exerciseType.current, values.executionTime),
      patientDescription: values.description,
      side: values.side,
      sets: values.sets,
      reps: values.reps,
      executionTime: values.executionTime || null,
      restSets: values.restSets,
      restReps: values.restReps,
      preparationTime: values.preparationTime,
      enrichmentData: buildChatExerciseEnrichment(values.steps, values.cues),
    });
    if (!exercise) return;
    markChosen(messageId, 'created');
    appendAssistant({
      spec: {
        component: 'ExerciseCreated',
        exerciseId: exercise.id,
        name: exercise.name,
        patientId: contextPatient?.id,
      },
    });
  });

  if (chosen !== undefined) {
    return (
      <p data-testid={testId} className="text-[14px] text-label-secondary">
        Ćwiczenie utworzone.
      </p>
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
        {proposalState.status !== 'idle' && (
          <p className="text-[13px] text-label-secondary" role="status" data-testid={`${testId}-proposal-status`}>
            {PROPOSAL_STATUS[proposalState.status]}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        <div className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
          <span id={`${testId}-side-label`}>Strona</span>
          <Controller
            control={form.control}
            name="side"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} data-testid={`${testId}-side`}>
                <SelectTrigger aria-labelledby={`${testId}-side-label`} data-testid={`${testId}-side-select`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIDE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
          Kroki wykonania (każdy krok w nowej linii)
          <Textarea rows={4} data-testid={`${testId}-steps-input`} {...form.register('steps')} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
          Wskazówki dla pacjenta (każda w nowej linii)
          <Textarea rows={3} data-testid={`${testId}-cues-input`} {...form.register('cues')} />
        </label>
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
