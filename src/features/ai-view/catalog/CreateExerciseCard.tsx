'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Check, ImagePlus, RotateCw, SlidersHorizontal, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SIDE_OPTIONS } from '@/components/shared/exercise/fieldContract';
import { Textarea } from '@/components/ui/textarea';
import { PlayerHintLengthCounter } from '@/components/shared/enrichment/PlayerHintLengthCounter';
import { getLongestText } from '@/features/exercises/utils/playerHintLength';
import { cn } from '@/lib/utils';
import { FloatingMark } from '../FloatingMark';
import { useChatActions, useChatBusy } from '../ChatSessionContext';
import { useChatMode } from '../useChatMode';
import { exerciseCreatedReply } from '../utils/addToDraft';
import {
  buildChatExerciseEnrichment,
  CHAT_EXERCISE_DEFAULTS,
  filmLink,
  formatChatParams,
  linesToItems,
  resolveChatExerciseType,
  youtubeSearchUrl,
} from '../utils/chatExerciseDraft';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';
import { QuickReplies } from './QuickReplies';
import { useCreateExercise } from './useChatWrites';
import { dropExerciseDraft, readExerciseDraft, updateExerciseDraft, useExerciseDraft } from './exerciseDraftStore';
import { useExerciseDraftAi, type DraftFill, type DraftSection, type DraftSectionState } from './useExerciseDraftAi';

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
  mistakes: z.string().max(2000),
  stopIf: z.string().max(500),
  film: z
    .string()
    .max(500)
    .refine((value) => value.trim() === '' || filmLink(value) !== null, 'Wklej link zaczynający się od https://'),
});

export type NewExerciseValues = z.infer<typeof NEW_EXERCISE_SCHEMA>;

type ParamName = 'sets' | 'reps' | 'executionTime' | 'restSets' | 'restReps' | 'preparationTime';

const PARAM_FIELDS: ReadonlyArray<{ name: ParamName; label: string; timeLabel?: string }> = [
  { name: 'sets', label: 'Serie' },
  { name: 'reps', label: 'Powtórzenia' },
  { name: 'executionTime', label: 'Czas powtórzenia (s)', timeLabel: 'Czas trzymania (s)' },
  { name: 'restSets', label: 'Przerwa między seriami (s)' },
  { name: 'restReps', label: 'Przerwa między powtórzeniami (s)' },
  { name: 'preparationTime', label: 'Przygotowanie (s)' },
];

const SECTION_COPY: Record<DraftSection, { title: string; working: string; failed: string }> = {
  params: {
    title: 'Podstawowe parametry',
    working: 'Dobieram serie, czas i przerwy…',
    failed: 'AI nie dobrało parametrów. Zostały wartości domyślne.',
  },
  description: {
    title: 'Jak wykonać (dla pacjenta)',
    working: 'Piszę krótki opis…',
    failed: 'AI nie napisało opisu. Wpisz jedno, dwa zdania.',
  },
  steps: { title: 'Kroki wykonania', working: 'Rozpisuję kroki…', failed: 'AI nie rozpisało kroków.' },
  cues: { title: 'Wskazówki dla pacjenta', working: 'Dobieram wskazówki…', failed: 'AI nie dobrało wskazówek.' },
  more: {
    title: 'Częste błędy i kiedy przerwać',
    working: 'Zbieram częste błędy i sygnały do przerwania…',
    failed: 'AI nie podało błędów ani sygnałów do przerwania.',
  },
  image: {
    title: 'Grafika',
    working: 'Rysuję grafikę ćwiczenia…',
    failed: 'Grafiki nie udało się wygenerować.',
  },
};

/**
 * Exercise for the organization's catalog, written in the thread. The name comes first; „Generuj”
 * unfolds the card section by section, ends with a picture, and any section can be generated
 * again. Nothing is saved before „Utwórz ćwiczenie” (DEC-20261029-01).
 */
export function CreateExerciseCard({ spec, testId, messageId, chosen }: CardProps<'CreateExercise'>) {
  const { organizationId, contextPatient, appendAssistant, markChosen, sendMessage } = useChatActions();
  const isBusy = useChatBusy();
  // Wybrana inna pozycja idzie jako następna wiadomość; ta karta zostaje, a jej odpowiedzi są już zużyte.
  // Draft outside the card: another screen and back shows the same card, with AI done meanwhile.
  const draft = useExerciseDraft(messageId);
  const { exerciseType, image, pickedPosition } = draft;
  const setImage = (file: File | null) => updateExerciseDraft(messageId, (current) => ({ ...current, image: file }));
  const { create, creating } = useCreateExercise();
  const { preference } = useChatMode();
  const useAi = preference.useAi;
  const [staleDismissed, setStaleDismissed] = useState(false);

  const form = useForm<NewExerciseValues>({
    resolver: zodResolver(NEW_EXERCISE_SCHEMA),
    defaultValues: readExerciseDraft(messageId)?.values ?? {
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
      mistakes: '',
      stopIf: '',
      film: '',
    },
  });
  const { errors } = form.formState;
  const [nameText, stepsText, cuesText] = useWatch({
    control: form.control,
    name: ['name', 'steps', 'cues'],
  });
  const paramValues = useWatch({
    control: form.control,
    name: ['side', 'sets', 'reps', 'executionTime', 'restSets', 'restReps', 'preparationTime'],
  });
  const [paramsOpen, setParamsOpen] = useState(false);
  // Błąd w parametrach musi być widoczny, więc rozwija pola sam.
  const paramsExpanded = paramsOpen || PARAM_FIELDS.some((field) => errors[field.name]);
  const stepItems = linesToItems(stepsText);
  const cueItems = linesToItems(cuesText);

  // Every edit, by hand or by AI, goes to the draft, so a remount starts from it.
  useEffect(() => {
    if (chosen !== undefined) return undefined;
    const keep = () => updateExerciseDraft(messageId, (current) => ({ ...current, values: form.getValues() }));
    keep();
    return form.subscribe({ formState: { values: true }, callback: keep });
  }, [chosen, form, messageId]);

  // Type and picture of an AI answer are already in the draft; the form takes the field values.
  const applyFill = (fill: DraftFill) => {
    const set = (field: keyof NewExerciseValues, value: string | number) =>
      form.setValue(field, value as never, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    switch (fill.section) {
      case 'params':
        set('side', fill.params.side);
        for (const field of PARAM_FIELDS) set(field.name, fill.params[field.name]);
        return;
      case 'more':
        set('mistakes', fill.mistakes);
        set('stopIf', fill.stopIf);
        return;
      case 'image':
        return;
      default:
        set(fill.section, fill.text);
    }
  };

  const draftAi = useExerciseDraftAi({
    draftKey: messageId,
    onFill: applyFill,
    imageInput: () => {
      const current = readExerciseDraft(messageId);
      return {
        description: current?.values?.description ?? form.getValues('description'),
        type: current?.exerciseType ?? exerciseType,
      };
    },
  });
  const { sections, generatedFor, running } = draftAi;
  const started = Object.values(sections).some((state) => state !== 'hidden');

  // Bez AI karta od razu pokazuje wszystkie pola do ręcznego wypełnienia.
  useEffect(() => {
    if (!useAi && chosen === undefined) draftAi.showAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tylko przy zmianie trybu AI
  }, [useAi]);

  const generate = (only?: readonly DraftSection[]) => {
    setStaleDismissed(false);
    if (!only || only.includes('image')) setImage(null);
    void draftAi.generate(form.getValues('name'), only);
  };
  const nameReady = nameText.trim().length >= 3;
  const stale = Boolean(generatedFor) && nameText.trim() !== generatedFor && !running && !staleDismissed;

  const submit = form.handleSubmit(async (values) => {
    const exercise = await create(
      organizationId,
      {
        name: values.name,
        type: resolveChatExerciseType(exerciseType, values.executionTime),
        patientDescription: values.description,
        side: values.side,
        sets: values.sets,
        reps: values.reps,
        executionTime: values.executionTime || null,
        restSets: values.restSets,
        restReps: values.restReps,
        preparationTime: values.preparationTime,
        enrichmentData: buildChatExerciseEnrichment(values),
        videoUrl: filmLink(values.film),
      },
      image
    );
    if (!exercise) return;
    dropExerciseDraft(messageId);
    markChosen(messageId, 'created');
    // Ćwiczenie utworzone dla propozycji zestawu: zestaw wraca od razu, z nowym ćwiczeniem.
    appendAssistant(
      exerciseCreatedReply(exercise, {
        patientId: contextPatient?.id,
        addToSet: spec.addToSet,
        offerForSet: spec.offerForSet,
      })
    );
  });

  if (chosen !== undefined) {
    return (
      <p data-testid={testId} className="text-[14px] text-label-secondary">
        Ćwiczenie utworzone.
      </p>
    );
  }

  const regenerateFor = (section: DraftSection) =>
    useAi && generatedFor && !running ? () => generate([section]) : undefined;
  const fieldClass = (section: DraftSection) => cn(sections[section] === 'working' && 'chat-field-filling');

  return (
    <ChatCard
      testId={testId}
      title="Nowe ćwiczenie"
      badge={
        useAi && generatedFor ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={running || !nameReady}
            onClick={() => generate()}
            data-testid={`${testId}-regenerate-all-btn`}
          >
            <RotateCw aria-hidden="true" />
            Od nowa
          </Button>
        ) : undefined
      }
      stickyFooter={started}
      footer={
        started ? (
          <>
            <span className="text-[13px] text-label-secondary" role="status">
              {running ? (
                <span className="text-chat-shimmer">AI uzupełnia ćwiczenie…</span>
              ) : (
                'Trafi do katalogu Twojego gabinetu'
              )}
            </span>
            <Button
              type="submit"
              form={`${testId}-form`}
              disabled={creating || running}
              data-testid={`${testId}-submit-btn`}
            >
              {creating ? 'Zapisuję…' : 'Utwórz ćwiczenie'}
            </Button>
          </>
        ) : undefined
      }
    >
      {spec.positionOptions && spec.positionOptions.length > 0 && (
        <div data-testid={`${testId}-position`}>
          <QuickReplies
            options={spec.positionOptions}
            chosen={pickedPosition}
            disabled={isBusy}
            testId={`${testId}-position`}
            onPick={(option) => {
              updateExerciseDraft(messageId, (current) => ({ ...current, pickedPosition: option }));
              sendMessage(option);
            }}
          />
        </div>
      )}
      <form
        id={`${testId}-form`}
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
        <div className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
          <label htmlFor={`${testId}-name`}>Nazwa</label>
          <span className="flex gap-2">
            <Input
              className="min-w-0 flex-1"
              aria-invalid={errors.name ? true : undefined}
              id={`${testId}-name`}
              data-testid={`${testId}-name-input`}
              {...form.register('name')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !started && useAi && nameReady) {
                  event.preventDefault();
                  generate();
                }
              }}
            />
            {!started && useAi && (
              <Button
                type="button"
                disabled={!nameReady}
                onClick={() => generate()}
                data-testid={`${testId}-generate-btn`}
              >
                <Sparkles aria-hidden="true" />
                Generuj
              </Button>
            )}
          </span>
          {errors.name && <span className="text-[12px] text-status-danger">{errors.name.message}</span>}
        </div>

        {!started && useAi && (
          <p className="text-[13px] text-label-tertiary">
            Zacznij od nazwy: pozycja i sprzęt w nazwie dają trafniejszą propozycję.{' '}
            <button
              type="button"
              onClick={draftAi.showAll}
              className="font-medium text-tint underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`${testId}-manual-btn`}
            >
              Uzupełnię sam
            </button>
          </p>
        )}

        {stale && (
          <div
            role="status"
            className="flex animate-chat-rise flex-wrap items-center justify-between gap-2 rounded-[14px] bg-fill-quaternary px-3.5 py-2.5 text-[14px] text-foreground"
            data-testid={`${testId}-stale`}
          >
            <span className="min-w-0">
              Propozycja dotyczy nazwy <b className="font-semibold">„{generatedFor}”</b>. Wygenerować dla nowej?
            </span>
            <span className="flex gap-1.5">
              <Button type="button" size="sm" onClick={() => generate()} data-testid={`${testId}-stale-regenerate-btn`}>
                <RotateCw aria-hidden="true" />
                Generuj od nowa
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStaleDismissed(true)}
                data-testid={`${testId}-stale-keep-btn`}
              >
                Zostaw
              </Button>
            </span>
          </div>
        )}

        <DraftSectionShell
          section="params"
          state={sections.params}
          onRegenerate={regenerateFor('params')}
          testId={testId}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className={cn(
                'min-w-0 rounded-[10px] px-2.5 py-1.5 text-[15px] tabular-nums text-foreground',
                fieldClass('params')
              )}
              data-testid={`${testId}-params-summary`}
            >
              {formatChatParams(
                {
                  side: paramValues[0],
                  sets: paramValues[1],
                  reps: paramValues[2],
                  executionTime: paramValues[3],
                  restSets: paramValues[4],
                  restReps: paramValues[5],
                  preparationTime: paramValues[6],
                },
                exerciseType
              )}
            </p>
            {!paramsExpanded && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setParamsOpen(true)}
                data-testid={`${testId}-params-edit-btn`}
              >
                <SlidersHorizontal aria-hidden="true" />
                Zmień
              </Button>
            )}
          </div>
          {paramsExpanded && (
            <div className="flex flex-col gap-3 animate-chat-rise">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PARAM_FIELDS.map((field) => (
                  <label key={field.name} className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
                    {exerciseType === 'time' && field.timeLabel ? field.timeLabel : field.label}
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className={cn('tabular-nums', fieldClass('params'))}
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
                      <SelectTrigger
                        aria-labelledby={`${testId}-side-label`}
                        className={fieldClass('params')}
                        data-testid={`${testId}-side-select`}
                      >
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
            </div>
          )}
        </DraftSectionShell>

        <DraftSectionShell
          section="description"
          state={sections.description}
          onRegenerate={regenerateFor('description')}
          testId={testId}
        >
          <Textarea
            rows={2}
            aria-label={SECTION_COPY.description.title}
            aria-invalid={errors.description ? true : undefined}
            className={fieldClass('description')}
            data-testid={`${testId}-description-input`}
            {...form.register('description')}
          />
          {errors.description && <span className="text-[12px] text-status-danger">{errors.description.message}</span>}
        </DraftSectionShell>

        <DraftSectionShell section="steps" state={sections.steps} onRegenerate={regenerateFor('steps')} testId={testId}>
          <Textarea
            rows={4}
            aria-label="Kroki wykonania, każdy w nowej linii"
            aria-describedby={`${testId}-steps-player-length`}
            className={fieldClass('steps')}
            data-testid={`${testId}-steps-input`}
            {...form.register('steps')}
          />
          <PlayerHintLengthCounter
            id={`${testId}-steps-player-length`}
            kind="step"
            text={getLongestText(stepItems)}
            testId={`${testId}-steps-player-length`}
          />
        </DraftSectionShell>

        <DraftSectionShell section="cues" state={sections.cues} onRegenerate={regenerateFor('cues')} testId={testId}>
          <Textarea
            rows={3}
            aria-label="Wskazówki dla pacjenta, każda w nowej linii"
            aria-describedby={`${testId}-cues-player-length`}
            className={fieldClass('cues')}
            data-testid={`${testId}-cues-input`}
            {...form.register('cues')}
          />
          <PlayerHintLengthCounter
            id={`${testId}-cues-player-length`}
            text={getLongestText(cueItems)}
            testId={`${testId}-cues-player-length`}
          />
        </DraftSectionShell>

        <DraftSectionShell section="more" state={sections.more} onRegenerate={regenerateFor('more')} testId={testId}>
          <label className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
            Częste błędy (błąd → poprawka, każdy w nowej linii)
            <Textarea
              rows={3}
              className={fieldClass('more')}
              data-testid={`${testId}-mistakes-input`}
              {...form.register('mistakes')}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-label-secondary">
            Kiedy przerwać
            <Textarea
              rows={2}
              className={fieldClass('more')}
              data-testid={`${testId}-stop-if-input`}
              {...form.register('stopIf')}
            />
          </label>
        </DraftSectionShell>

        {useAi && (
          <DraftSectionShell
            section="image"
            state={sections.image}
            onRegenerate={image ? regenerateFor('image') : undefined}
            testId={testId}
          >
            <ExerciseImagePreview
              file={image}
              working={sections.image === 'working'}
              onGenerate={nameReady && !running ? () => generate(['image']) : undefined}
              testId={`${testId}-image`}
            />
          </DraftSectionShell>
        )}

        {/* Film na końcu: wyszukanie po nazwie i link, który fizjoterapeuta sam wkleja (nic nie pobieramy). */}
        {(sections.image !== 'hidden' || !useAi) && (
          <section
            className="flex animate-chat-rise flex-col gap-2.5 border-t-[0.5px] border-separator pt-3.5"
            data-testid={`${testId}-section-film`}
          >
            <header className="flex min-h-7 items-center justify-between gap-2">
              <h4 className="text-[14px] font-semibold text-foreground">Film (opcjonalnie)</h4>
              {nameReady && (
                <a
                  href={youtubeSearchUrl(nameText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-tint underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid={`${testId}-film-search-link`}
                >
                  Szukaj na YouTube ↗
                </a>
              )}
            </header>
            <Input
              type="url"
              inputMode="url"
              placeholder="Wklej link do filmu z ćwiczeniem"
              aria-label="Link do filmu z ćwiczeniem"
              aria-invalid={errors.film ? true : undefined}
              data-testid={`${testId}-film-input`}
              {...form.register('film')}
            />
            {errors.film && <span className="text-[12px] text-status-danger">{errors.film.message}</span>}
          </section>
        )}
      </form>
    </ChatCard>
  );
}

/**
 * One section of the card. Hidden until its turn, then it unfolds; while AI fills it, the FiziYo
 * mark floats next to the title. A failed section says so and offers another try.
 */
function DraftSectionShell({
  section,
  state,
  onRegenerate,
  testId,
  children,
}: {
  readonly section: DraftSection;
  readonly state: DraftSectionState;
  readonly onRegenerate?: () => void;
  readonly testId: string;
  readonly children: ReactNode;
}) {
  if (state === 'hidden') return null;
  const copy = SECTION_COPY[section];
  return (
    <section
      ref={state === 'working' ? followWhileWorking : undefined}
      className="flex scroll-mb-24 animate-chat-rise flex-col gap-2.5 border-t-[0.5px] border-separator pt-3.5"
      data-testid={`${testId}-section-${section}`}
      data-state={state}
      aria-busy={state === 'working'}
    >
      <header className="flex min-h-7 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">
          {state === 'working' ? (
            <FloatingMark />
          ) : state === 'failed' ? (
            <AlertTriangle className="h-4 w-4 text-status-warning" />
          ) : (
            <Check className="h-4 w-4 text-tint" />
          )}
        </span>
        <h4 className="flex-1 text-[14px] font-semibold text-foreground">{copy.title}</h4>
        {onRegenerate && state !== 'working' && (
          <button
            type="button"
            onClick={onRegenerate}
            title="Wygeneruj tę część od nowa"
            aria-label={`Wygeneruj od nowa: ${copy.title}`}
            data-testid={`${testId}-section-${section}-regenerate-btn`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-label-tertiary transition-colors hover:bg-fill-quaternary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCw className="h-[15px] w-[15px]" aria-hidden="true" />
          </button>
        )}
      </header>
      {state === 'working' && <p className="text-chat-shimmer text-[13px]">{copy.working}</p>}
      {state === 'failed' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-fill-quaternary px-3 py-2 text-[13px] text-label-secondary">
          <span>{copy.failed}</span>
          {onRegenerate && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              data-testid={`${testId}-section-${section}-retry-btn`}
            >
              <RotateCw aria-hidden="true" />
              Spróbuj ponownie
            </Button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** The card unfolds below the fold: keep the section AI is filling in view, without jumping past it. */
function followWhileWorking(element: HTMLElement | null) {
  if (!element) return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

/** The generated picture before saving; it is uploaded together with the exercise. */
function ExerciseImagePreview({
  file,
  working,
  onGenerate,
  testId,
}: {
  readonly file: File | null;
  readonly working: boolean;
  readonly onGenerate?: () => void;
  readonly testId: string;
}) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  if (working) return <Skeleton className="chat-field-filling aspect-[4/3] w-full max-w-[360px] rounded-[14px]" />;
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- podgląd lokalnego pliku (blob:), next/image go nie zoptymalizuje
      <img
        src={url}
        alt="Grafika ćwiczenia"
        className="h-auto max-h-[420px] w-auto max-w-full self-start rounded-[14px] bg-fill-quaternary object-contain"
        data-testid={`${testId}-preview`}
      />
    );
  }
  return onGenerate ? (
    <Button
      type="button"
      variant="outline"
      className="self-start"
      onClick={onGenerate}
      data-testid={`${testId}-generate-btn`}
    >
      <ImagePlus aria-hidden="true" />
      Wygeneruj grafikę
    </Button>
  ) : null;
}
