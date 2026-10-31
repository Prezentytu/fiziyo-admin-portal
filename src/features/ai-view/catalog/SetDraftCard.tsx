'use client';

import { useMemo, useState } from 'react';
import { Plus, Repeat2, SlidersHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseThumbnail } from '@/components/shared/exercise/ExerciseThumbnail';
import { buildExerciseImageUrls } from '@/components/shared/exercise/adapters';
import {
  ExerciseParametersFields,
  type ExerciseParameterValues,
} from '@/components/shared/exercise/ExerciseParametersFields';
import { normalizeExerciseType } from '@/utils/exerciseEnums';
import { formatExerciseCount } from '@/utils/polishPlural';
import { toWizardPatient, useChatActions } from '../ChatSessionContext';
import { useAvailableExercises, type ChatCatalogExercise } from '../useAvailableExercises';
import { findAlternatives } from '../utils/exerciseAlternatives';
import { searchExercises } from '../utils/exerciseLookup';
import { seedDraftItems } from '../utils/seedDraft';
import {
  draftItemFromExercise,
  applyParameterPatch,
  draftParameterValues,
  draftMinutes,
  draftNote,
  savedInCatalogText,
  scheduleQuestion,
  formatDraftParams,
  itemMinutes,
  proposeDraftName,
  type DraftItem,
  type SetDraftPayload,
} from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardEmpty, ChatCardNote } from './ChatCard';
import { useSaveTemplateSet } from './useChatWrites';

// A chat draft becomes a plan's mappings: fields a mapping does not keep are not offered.
const UNSAVED_FIELDS = ['side', 'rangeOfMotion', 'difficultyLevel'] as const;

interface RowProps {
  readonly item: DraftItem;
  readonly exercise?: ChatCatalogExercise;
  readonly alternatives: ChatCatalogExercise[];
  readonly locked: boolean;
  readonly testId: string;
  readonly onRemove: () => void;
  readonly onSwap: (exercise: ChatCatalogExercise) => void;
  readonly onChange: (patch: Partial<ExerciseParameterValues>) => void;
}

function DraftRow({ item, exercise, alternatives, locked, testId, onRemove, onSwap, onChange }: RowProps) {
  const [panel, setPanel] = useState<'none' | 'swap' | 'edit'>('none');
  const name = exercise?.name ?? 'Ćwiczenie';
  const toggle = (next: 'swap' | 'edit') => setPanel((current) => (current === next ? 'none' : next));

  return (
    <li
      data-testid={`${testId}-item-${item.exerciseId}`}
      className="group border-t-[0.5px] border-hairline pt-2 first:border-t-0 first:pt-0"
    >
      <div className="flex min-h-14 items-center gap-3">
        <ExerciseThumbnail
          src={exercise ? (buildExerciseImageUrls(exercise)[0] ?? null) : null}
          sizeClass="h-10 w-10"
          className="rounded-[10px]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium leading-[21px] text-foreground">{name}</p>
          <p className="truncate text-[13px] leading-[18px] tabular-nums text-label-secondary">
            {formatDraftParams(item)} · ok. {itemMinutes(item)} min
          </p>
        </div>
        {!locked && (
          <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Zmień parametry: ${name}`}
              aria-expanded={panel === 'edit'}
              onClick={() => toggle('edit')}
              data-testid={`${testId}-edit-${item.exerciseId}-btn`}
            >
              <SlidersHorizontal aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Zamień: ${name}`}
              aria-expanded={panel === 'swap'}
              onClick={() => toggle('swap')}
              data-testid={`${testId}-swap-${item.exerciseId}-btn`}
            >
              <Repeat2 aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Usuń: ${name}`}
              onClick={onRemove}
              data-testid={`${testId}-remove-${item.exerciseId}-btn`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
      {panel === 'swap' && !locked && (
        <div className="mb-1 ml-[52px] flex flex-col gap-2 rounded-[12px] bg-fill-quaternary px-3 py-2.5 text-[14px]">
          {alternatives.length === 0 ? (
            <p className="text-label-secondary">Brak podobnych ćwiczeń w katalogu. Dodaj inne przyciskiem poniżej.</p>
          ) : (
            alternatives.map((alternative) => (
              <div key={alternative.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  Zamiast tego: <b className="font-semibold">{alternative.name}</b>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPanel('none');
                    onSwap(alternative);
                  }}
                  data-testid={`${testId}-swap-${item.exerciseId}-to-${alternative.id}-btn`}
                >
                  Zamień
                </Button>
              </div>
            ))
          )}
        </div>
      )}
      {panel === 'edit' && !locked && (
        <div className="mb-1 ml-[52px] rounded-[12px] bg-fill-quaternary p-3">
          <TooltipProvider>
            <ExerciseParametersFields
              surface="mapping"
              exerciseType={normalizeExerciseType(exercise?.type) ?? 'draft'}
              values={draftParameterValues(item)}
              onChange={onChange}
              omitFields={UNSAVED_FIELDS}
              density="compact"
              testIdFor={(key, kind) => `${testId}-param-${item.exerciseId}-${key}-${kind}`}
              structuralTestIdPrefix={`${testId}-param-${item.exerciseId}`}
            />
          </TooltipProvider>
        </div>
      )}
    </li>
  );
}

/**
 * Set composed in the thread (design "Czat v2"): swap, remove with undo, tune parameters, add from
 * the catalog. Nothing is saved here; the next step asks for the schedule and the summary sends.
 */
export function SetDraftCard({ spec, testId, messageId, chosen }: CardProps<'SetDraft'>) {
  const { organizationId, patients, organizationSets, setsReady, appendExchange, markChosen, openCreateSet } =
    useChatActions();
  const { exercises, loading } = useAvailableExercises(organizationId, true);
  const set = spec.setId ? organizationSets.find((candidate) => candidate.id === spec.setId) : undefined;
  const patient = spec.patientId ? patients.find((candidate) => candidate.id === spec.patientId) : undefined;
  const byId = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);

  const [items, setItems] = useState<DraftItem[] | null>(null);
  const [missingSet, setMissingSet] = useState(false);
  const [search, setSearch] = useState<string | null>(null);
  const { saveTemplateSet, saving } = useSaveTemplateSet();
  const locked = chosen !== undefined;

  // Seeded once what it comes from is here: defaults come from the exercise, a catalog set's mapping wins.
  if (items === null) {
    const seed = seedDraftItems({
      setId: spec.setId,
      exerciseIds: spec.exerciseIds,
      sets: organizationSets,
      setsReady,
      exercises,
      exercisesReady: !loading,
    });
    if (seed) {
      setItems(seed.items);
      setMissingSet(seed.missingSet);
    }
  }

  const draftIds = (items ?? []).map((item) => item.exerciseId);
  const searchResults = useMemo(() => {
    if (!search || search.trim().length < 3) return [];
    const inDraft = new Set((items ?? []).map((item) => item.exerciseId));
    return searchExercises(exercises, search, 6).filter((exercise) => !inDraft.has(exercise.id));
  }, [exercises, search, items]);

  if (items === null) {
    return (
      <ChatCard testId={testId} title="Przygotowuję propozycję">
        <div aria-busy="true" className="flex flex-col gap-2">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </ChatCard>
    );
  }

  const removeItem = (index: number) => {
    const removed = items[index];
    setItems(items.filter((_, position) => position !== index));
    toast(`Usunięto: ${byId.get(removed.exerciseId)?.name ?? 'ćwiczenie'}`, {
      action: {
        label: 'Cofnij',
        onClick: () =>
          setItems((current) => {
            const next = [...(current ?? [])];
            next.splice(Math.min(index, next.length), 0, removed);
            return next;
          }),
      },
    });
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setItems(items.map((item, position) => (position === index ? { ...item, ...patch } : item)));

  const name = proposeDraftName({ setName: set?.name, patientName: patient?.name });
  const draft: SetDraftPayload = { name, patientId: patient?.id, sourceSetId: set?.id, items };
  const minutes = draftMinutes(items);

  const handleNext = () => {
    markChosen(messageId, 'next');
    if (patient) {
      appendExchange('Dalej: harmonogram', {
        text: scheduleQuestion(items),
        spec: { component: 'Schedule', draft },
      });
      return;
    }
    appendExchange('Wybierz pacjenta', {
      text: 'Dla kogo jest ten zestaw? Bez pacjenta zapiszę go w katalogu gabinetu.',
      spec: { component: 'PickPatient', draft },
    });
  };

  const handleSaveTemplate = async () => {
    const saved = await saveTemplateSet(organizationId, set?.name ?? 'Nowy zestaw', items);
    if (!saved) return;
    markChosen(messageId, 'saved');
    appendExchange('Zapisz w katalogu', {
      text: savedInCatalogText(saved.name),
      spec: { component: 'SetSaved', setId: saved.id, name: saved.name },
    });
  };

  return (
    <ChatCard
      testId={testId}
      title={set?.name ?? 'Propozycja zestawu'}
      meta={
        <>
          <span>{formatExerciseCount(items.length)}</span>
          {patient && <span>dla: {patient.name}</span>}
          {spec.note && <span>{spec.note}</span>}
        </>
      }
      footer={
        locked ? (
          <span className="text-[13px] text-label-secondary">
            {chosen === 'saved' ? 'Zapisane w katalogu' : 'Ten zestaw jest już w kolejnym kroku poniżej'}
          </span>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleSaveTemplate()}
                disabled={items.length === 0 || saving}
                data-testid={`${testId}-save-template-btn`}
              >
                Zapisz w katalogu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openCreateSet(draftIds, toWizardPatient(patient))}
                disabled={items.length === 0}
                data-testid={`${testId}-full-editor-btn`}
              >
                Pełny edytor
              </Button>
            </div>
            <Button onClick={handleNext} disabled={items.length === 0} data-testid={`${testId}-primary-btn`}>
              {patient ? 'Dalej: harmonogram' : 'Wybierz pacjenta'}
            </Button>
          </>
        )
      }
    >
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => {
            const exercise = byId.get(item.exerciseId);
            return (
              <DraftRow
                key={`${item.exerciseId}-${index}`}
                item={item}
                exercise={exercise}
                alternatives={exercise ? findAlternatives(exercise, exercises, draftIds) : []}
                locked={locked}
                testId={testId}
                onRemove={() => removeItem(index)}
                onSwap={(alternative) => updateItem(index, draftItemFromExercise(alternative))}
                onChange={(patch) =>
                  setItems((current) =>
                    (current ?? []).map((entry, position) =>
                      position === index ? applyParameterPatch(entry, patch) : entry
                    )
                  )
                }
              />
            );
          })}
        </ul>
      ) : (
        <ChatCardEmpty testId={`${testId}-empty`}>
          {missingSet
            ? 'Nie znalazłem tego zestawu w katalogu gabinetu. Dodaj ćwiczenia z katalogu.'
            : 'Zestaw jest pusty. Dodaj ćwiczenia z katalogu.'}
        </ChatCardEmpty>
      )}

      {!locked &&
        (search === null ? (
          <Button
            variant="plain"
            size="sm"
            className="self-start"
            onClick={() => setSearch('')}
            data-testid={`${testId}-add-btn`}
          >
            <Plus aria-hidden="true" />
            Dodaj ćwiczenie
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && setSearch(null)}
              placeholder="Szukaj w katalogu, np. mostek, przysiad"
              aria-label="Szukaj ćwiczenia do dodania"
              data-testid={`${testId}-add-search-input`}
            />
            {searchResults.length > 0 && (
              <ul className="flex flex-col">
                {searchResults.map((exercise) => (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setItems([...items, draftItemFromExercise(exercise)]);
                        setSearch(null);
                      }}
                      data-testid={`${testId}-add-${exercise.id}-btn`}
                      className="flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-[14px] hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExerciseThumbnail
                        src={buildExerciseImageUrls(exercise)[0] ?? null}
                        sizeClass="h-8 w-8"
                        className="rounded-[8px]"
                      />
                      <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
                      <Plus className="h-4 w-4 text-tint" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-[0.5px] border-hairline pt-3 text-[14px] tabular-nums text-label-secondary">
          <span>{formatExerciseCount(items.length)}</span>
          <span>
            dziennie ok. <b className="text-[16px] font-semibold text-foreground">{minutes} min</b>
          </span>
        </div>
      )}
      <ChatCardNote>{draftNote({ fromCatalog: Boolean(set), hasPatient: Boolean(patient) })}</ChatCardNote>
    </ChatCard>
  );
}
