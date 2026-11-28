'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Flame,
  Plus,
  Repeat2,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SquarePen,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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
import { isV33ExerciseRecord } from '@/utils/exerciseRecordVersion';
import { formatExerciseCount } from '@/utils/polishPlural';
import { toWizardPatient, useChatActions } from '../ChatSessionContext';
import { useExercisePickerPages } from '@/hooks/useExercisePickerPages';
import { useAvailableExercises, type ChatCatalogExercise } from '../useAvailableExercises';
import { alternativeSearchTerm, findAlternatives } from '../utils/exerciseAlternatives';
import { draftClarifyQuestions } from '../utils/clarifyQuestions';
import { canRestoreDraft, RESTORE_DRAFT_LABEL, restoredDraftSpec, SUPERSEDED } from '../utils/draftVersions';
import { searchExercises } from '../utils/exerciseLookup';
import { rhythmOfFrequency } from '../utils/schedulePlan';
import { seedDraftItems } from '../utils/seedDraft';
import {
  draftItemFromExercise,
  applyParameterPatch,
  draftParameterValues,
  draftMinutes,
  draftNote,
  catalogFrequencyQuestion,
  scheduleQuestion,
  formatDraftParams,
  itemMinutes,
  proposeDraftName,
  draftReturnOf,
  proposeDraftDescription,
  type DraftItem,
  type SetDraftPayload,
} from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardEmpty } from './ChatCard';
import { ChatPhonePreviewDialog } from './ChatPhonePreviewDialog';
import { ClarifyChips } from './ClarifyChips';
import { ExerciseReviewBadge } from './ExerciseReviewBadge';
import { draftItemToPreviewCard } from '../utils/phonePreview';

// A chat draft becomes a plan's mappings: fields a mapping does not keep are not offered.
const isAlternating = (item: DraftItem) => item.side?.toLowerCase() === 'alternating';

const UNSAVED_FIELDS = [
  'side',
  'rangeOfMotion',
  'resistance',
  'equipment',
  'difficultyLevel',
  'restAfterExercise',
] as const;

interface RowProps {
  readonly item: DraftItem;
  readonly exercise?: ChatCatalogExercise;
  readonly organizationId: string;
  readonly catalogPool: readonly ChatCatalogExercise[];
  readonly excludeIds: readonly string[];
  readonly alternatives: ChatCatalogExercise[];
  readonly locked: boolean;
  /** Dopisana w tym kroku („dodaj ćwiczenie X”, nowe ćwiczenie): plakietka „nowe” przy nazwie. */
  readonly added: boolean;
  /** Treść ćwiczeń jeszcze nie dotarła: czas „naprzemiennie” byłby liczony bez wersji rekordu. */
  readonly versionPending: boolean;
  readonly testId: string;
  readonly onPreview?: () => void;
  readonly onRemove: () => void;
  readonly onSwap: (exercise: ChatCatalogExercise) => void;
  readonly onOpenCatalogSearch: (initialQuery?: string) => void;
  readonly onChange: (patch: Partial<ExerciseParameterValues>) => void;
  readonly onClearWarmup: () => void;
}

/**
 * Panel zamienników dla wiersza szkicu (SPEC-069 / W6): gdy pierwsza strona katalogu ma mniej niż 3
 * dopasowania, dociąga kandydatów z API po głównym tagu / rdzeniu nazwy i pokazuje czas oraz badge weryfikacji.
 */
function SwapAlternativesPanel({
  itemExerciseId,
  exercise,
  organizationId,
  catalogPool,
  excludeIds,
  localAlternatives,
  testId,
  onSwap,
  onOpenCatalogSearch,
}: {
  readonly itemExerciseId: string;
  readonly exercise?: ChatCatalogExercise;
  readonly organizationId: string;
  readonly catalogPool: readonly ChatCatalogExercise[];
  readonly excludeIds: readonly string[];
  readonly localAlternatives: readonly ChatCatalogExercise[];
  readonly testId: string;
  readonly onSwap: (alternative: ChatCatalogExercise) => void;
  readonly onOpenCatalogSearch: (initialQuery?: string) => void;
}) {
  const query = useMemo(() => (exercise ? alternativeSearchTerm(exercise) : null), [exercise]);
  const needsRemote = Boolean(exercise && organizationId && query && localAlternatives.length < 3);
  const remote = useExercisePickerPages<ChatCatalogExercise>({
    organizationId,
    skip: !needsRemote,
    search: query ?? '',
    sourceFilter: 'all',
  });

  const alternatives = useMemo(() => {
    if (!exercise) return [...localAlternatives];
    if (!needsRemote || remote.items.length === 0) return [...localAlternatives];
    const byId = new Map<string, ChatCatalogExercise>();
    for (const candidate of catalogPool) byId.set(candidate.id, candidate);
    for (const candidate of remote.items) {
      if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
    }
    const ranked = findAlternatives(exercise, [...byId.values()], excludeIds, 3);
    if (ranked.length > 0) return ranked;
    const excluded = new Set([exercise.id, ...excludeIds]);
    return remote.items.filter((candidate) => !excluded.has(candidate.id)).slice(0, 3);
  }, [catalogPool, excludeIds, exercise, localAlternatives, needsRemote, remote.items]);

  return (
    <div
      className="mb-1 ml-[52px] flex flex-col gap-2 rounded-[12px] bg-fill-quaternary px-3 py-2.5 text-[14px]"
      data-testid={`${testId}-swap-${itemExerciseId}-panel`}
    >
      {needsRemote && remote.loading && alternatives.length === 0 ? (
        <p className="text-label-secondary" role="status">
          Szukam podobnych ćwiczeń w katalogu…
        </p>
      ) : alternatives.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-label-secondary">Brak podobnych ćwiczeń w katalogu.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenCatalogSearch(query ?? '')}
            data-testid={`${testId}-swap-${itemExerciseId}-search-btn`}
          >
            Szukaj w katalogu
          </Button>
        </div>
      ) : (
        alternatives.map((alternative) => (
          <div key={alternative.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate">
                  Zamiast tego: <b className="font-semibold">{alternative.name}</b>
                </span>
                <ExerciseReviewBadge
                  exercise={alternative}
                  testId={`${testId}-swap-${itemExerciseId}-review-${alternative.id}`}
                />
              </div>
              <p className="text-[12px] tabular-nums text-label-secondary">
                ok. {itemMinutes(draftItemFromExercise(alternative))} min
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwap(alternative)}
              data-testid={`${testId}-swap-${itemExerciseId}-to-${alternative.id}-btn`}
            >
              Zamień
            </Button>
          </div>
        ))
      )}
    </div>
  );
}

function DraftRow({
  item,
  exercise,
  organizationId,
  catalogPool,
  excludeIds,
  alternatives,
  locked,
  added,
  versionPending,
  testId,
  onPreview,
  onRemove,
  onSwap,
  onOpenCatalogSearch,
  onChange,
  onClearWarmup,
}: RowProps) {
  const [panel, setPanel] = useState<'none' | 'swap' | 'edit'>('none');
  const name = exercise?.name ?? 'Ćwiczenie';
  const timeUnknown = versionPending && isAlternating(item);
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
          {/* div, nie p: znaczniki (Badge) renderują div, a div w p psuje hydratację (SPEC-061, znalezione na żywo). */}
          <div className="flex items-center gap-2 text-[15px] font-medium leading-[21px] text-foreground">
            <span className="truncate">{name}</span>
            <ExerciseReviewBadge exercise={exercise} testId={`${testId}-review-${item.exerciseId}`} />
            {added && (
              <Badge className="shrink-0" data-testid={`${testId}-new-${item.exerciseId}`}>
                nowe
              </Badge>
            )}
            {item.isWarmup && (
              <Badge variant="warning" className="shrink-0" data-testid={`${testId}-warmup-${item.exerciseId}`}>
                <Flame className="h-3 w-3" aria-hidden="true" />
                Rozgrzewka
                {!locked && (
                  <button
                    type="button"
                    onClick={onClearWarmup}
                    aria-label={`Nie rozgrzewka: ${name}`}
                    className="-mr-1 ml-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid={`${testId}-warmup-${item.exerciseId}-clear-btn`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </Badge>
            )}
          </div>
          <p className="truncate text-[13px] leading-[18px] tabular-nums text-label-secondary">
            {formatDraftParams(item)}
            {timeUnknown ? '' : ` · ok. ${itemMinutes(item)} min`}
          </p>
        </div>
        <div className="flex shrink-0 items-center opacity-100 transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
          {onPreview && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Podgląd jak u pacjenta: ${name}`}
              title="Jak zobaczy to pacjent"
              onClick={onPreview}
              data-testid={`${testId}-preview-${item.exerciseId}-btn`}
            >
              <Smartphone aria-hidden="true" />
            </Button>
          )}
          {!locked && (
            <>
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
            </>
          )}
        </div>
      </div>
      {panel === 'swap' && !locked && (
        <SwapAlternativesPanel
          itemExerciseId={item.exerciseId}
          exercise={exercise}
          organizationId={organizationId}
          catalogPool={catalogPool}
          excludeIds={excludeIds}
          localAlternatives={alternatives}
          testId={testId}
          onSwap={(alternative) => {
            setPanel('none');
            onSwap(alternative);
          }}
          onOpenCatalogSearch={(initialQuery) => {
            setPanel('none');
            onOpenCatalogSearch(initialQuery);
          }}
        />
      )}
      {panel === 'edit' && !locked && (
        <div className="mb-1 ml-[52px] rounded-[12px] bg-fill-quaternary p-3">
          <TooltipProvider>
            <ExerciseParametersFields
              surface="mapping"
              exerciseType={normalizeExerciseType(exercise?.type) ?? 'draft'}
              values={draftParameterValues(item)}
              alternatingPerSide={item.alternatingPerSide === true}
              versionPending={versionPending}
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

function lockedNote(chosen: string | undefined): string {
  if (chosen === 'saved') return 'Zapisane w katalogu';
  if (chosen === SUPERSEDED || chosen === 'added') return 'Nowsza wersja tego zestawu jest poniżej';
  return 'Ten zestaw jest już w kolejnym kroku poniżej';
}

/**
 * Set composed in the thread (design "Czat v2"): swap, remove with undo, tune parameters, add from
 * the catalog. Nothing is saved here; the next step asks for the schedule and the summary sends.
 */
export function SetDraftCard({ spec, testId, messageId, chosen, request }: CardProps<'SetDraft'>) {
  const {
    organizationId,
    patients,
    organizationSets,
    setsReady,
    appendExchange,
    markChosen,
    openCreateSet,
    reportLiveDraft,
    restoreDraft,
  } = useChatActions();
  const [items, setItems] = useState<DraftItem[] | null>(null);
  const set = spec.setId ? organizationSets.find((candidate) => candidate.id === spec.setId) : undefined;
  const baseSet = spec.baseSetId ? organizationSets.find((candidate) => candidate.id === spec.baseSetId) : undefined;
  const seedDetailIds = useMemo(() => {
    if (items !== null) return items.map((item) => item.exerciseId);
    const fromMappings = [...(set?.exerciseMappings ?? []), ...(baseSet?.exerciseMappings ?? [])].map(
      (mapping) => mapping.exerciseId
    );
    return [...new Set([...spec.exerciseIds, ...fromMappings])];
  }, [baseSet?.exerciseMappings, items, set?.exerciseMappings, spec.exerciseIds]);
  // Treść ćwiczeń szkicu (wersja rekordu, strona, typ) dociąga się osobno także dla zestawów z setId/baseSetId (SPEC-068 K5).
  const { exercises, loading, detailsReady, detailsPending, ensureDetailsReady } = useAvailableExercises(
    organizationId,
    true,
    seedDetailIds
  );
  const patient = spec.patientId ? patients.find((candidate) => candidate.id === spec.patientId) : undefined;
  const byId = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);

  const [missingSet, setMissingSet] = useState(false);
  const [search, setSearch] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const locked = chosen !== undefined;

  // Seeded once what it comes from is here: defaults come from the exercise, a catalog set's mapping wins.
  if (items === null) {
    const seed = seedDraftItems({
      setId: spec.setId,
      baseSetId: spec.baseSetId,
      exerciseIds: spec.exerciseIds,
      doses: spec.doses,
      items: spec.items,
      warmupExerciseIds: spec.warmupExerciseIds,
      sets: organizationSets,
      setsReady,
      exercises,
      exercisesReady: !loading,
      missingSettled: !detailsPending,
    });
    if (seed) {
      setItems(seed.items);
      setMissingSet(seed.missingSet);
    }
  }

  // Co karta trzyma teraz (ze zmianami fizjoterapeuty): wraca tu nowe ćwiczenie i „dodaj ćwiczenie X” z czatu.
  const draftReturn = useMemo(
    () => (items ? draftReturnOf(items, { patientId: patient?.id, note: spec.note ?? set?.name }) : null),
    [items, patient?.id, spec.note, set?.name]
  );
  useEffect(() => {
    if (locked || !draftReturn) return undefined;
    reportLiveDraft(messageId, { draft: draftReturn, catalog: exercises });
    return () => reportLiveDraft(messageId, null);
  }, [draftReturn, exercises, locked, messageId, reportLiveDraft]);

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

  const patientNames = patients.map((candidate) => candidate.name);
  const name = proposeDraftName({ setName: set?.name ?? baseSet?.name, topic: spec.note, avoid: patientNames });
  // Wersja rekordu wchodzi do szkicu tutaj, nie do stanu: kolejne kroki (harmonogram, podsumowanie) czytają ją ze szkicu.
  const draftItems = items.map((item) => {
    const catalog = byId.get(item.exerciseId);
    const nextSide = item.side ?? catalog?.side ?? undefined;
    const nextType = item.exerciseType ?? catalog?.type ?? undefined;
    const alternatingPerSide = isV33ExerciseRecord(catalog) ? true : item.alternatingPerSide;
    return {
      ...item,
      ...(nextSide ? { side: nextSide } : {}),
      ...(nextType ? { exerciseType: nextType } : {}),
      ...(alternatingPerSide ? { alternatingPerSide } : {}),
    };
  });
  const previewEntries = draftItems
    .map((item, rowIndex) => {
      const exercise = byId.get(item.exerciseId);
      return exercise ? { rowIndex, card: draftItemToPreviewCard(exercise, item) } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const previewIndexByRow = new Map(previewEntries.map((entry, idx) => [entry.rowIndex, idx]));
  const previewCards = previewEntries.map((entry) => entry.card);
  const draft: SetDraftPayload = {
    name,
    patientId: patient?.id,
    sourceSetId: set?.id ?? baseSet?.id,
    ...(spec.replacesAssignmentId ? { replacesAssignmentId: spec.replacesAssignmentId } : {}),
    rhythm: rhythmOfFrequency(set?.frequency ?? baseSet?.frequency),
    items: draftItems,
  };
  const minutes = draftMinutes(draftItems);
  const description = proposeDraftDescription({ topic: spec.note, avoid: patientNames });
  const versionPending = !detailsReady;
  const minutesUnknown = versionPending && draftItems.some(isAlternating);

  // Nowe ćwiczenie wraca do tej propozycji: z nazwą wpisaną w wyszukiwarce albo bez niej.
  const createExercise = (exerciseName?: string) => {
    if (!draftReturn) return;
    markChosen(messageId, 'create-exercise');
    appendExchange(exerciseName ? `Utwórz ćwiczenie: ${exerciseName}` : 'Utwórz nowe ćwiczenie', {
      text: exerciseName
        ? 'Sprawdź nazwę i kliknij „Generuj”. Gotowe ćwiczenie wróci do tej propozycji zestawu.'
        : 'Wpisz nazwę ćwiczenia i kliknij „Generuj”. Gotowe ćwiczenie wróci do tej propozycji zestawu.',
      spec: { component: 'CreateExercise', name: exerciseName, addToSet: draftReturn },
    });
  };

  const handleNext = () => {
    // Treść nie dotarła (błąd sieci): ponawiamy i nie przechodzimy dalej z dawką liczoną bez wersji rekordu.
    if (!ensureDetailsReady()) return;
    markChosen(messageId, 'next');
    if (patient) {
      appendExchange('Dalej: harmonogram', {
        text: scheduleQuestion(draft),
        spec: { component: 'Schedule', draft },
      });
      return;
    }
    appendExchange('Wybierz pacjenta', {
      text: 'Dla kogo jest ten zestaw? Bez pacjenta zapiszę go w katalogu gabinetu.',
      spec: { component: 'PickPatient', draft },
    });
  };

  // Zapis idzie po „Jak często?”: częstotliwość zapisuje się w zestawie i podpowiada przy przypisaniu.
  const handleSaveTemplate = () => {
    if (!ensureDetailsReady()) return;
    markChosen(messageId, 'next');
    appendExchange('Zapisz w katalogu', {
      text: catalogFrequencyQuestion(draft.rhythm),
      spec: { component: 'CatalogFrequency', draft, description: description || undefined },
    });
  };

  return (
    <ChatCard
      testId={testId}
      title={name}
      info={draftNote({ fromCatalog: Boolean(set), hasPatient: Boolean(patient) })}
      badge={
        previewCards.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPreviewIndex(0)}
            data-testid={`${testId}-preview-set-btn`}
          >
            <Smartphone aria-hidden="true" />
            Podgląd na telefonie
          </Button>
        ) : undefined
      }
      meta={
        <>
          <span>{formatExerciseCount(items.length)}</span>
          {patient && <span>dla: {patient.name}</span>}
          {!set && <span>Propozycja zestawu</span>}
        </>
      }
      footer={
        locked ? (
          <>
            <span className="text-[13px] text-label-secondary">{lockedNote(chosen)}</span>
            {canRestoreDraft(chosen) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => restoreDraft(restoredDraftSpec(spec, items))}
                data-testid={`${testId}-restore-btn`}
              >
                <Undo2 aria-hidden="true" />
                {RESTORE_DRAFT_LABEL}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveTemplate}
                disabled={items.length === 0 || detailsPending}
                data-testid={`${testId}-save-template-btn`}
              >
                <BookmarkPlus aria-hidden="true" />
                Zapisz w katalogu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  openCreateSet(
                    draftIds,
                    toWizardPatient(patient),
                    name,
                    items.filter((item) => item.isWarmup).map((item) => item.exerciseId)
                  )
                }
                disabled={items.length === 0}
                data-testid={`${testId}-full-editor-btn`}
              >
                <SquarePen aria-hidden="true" />
                Pełny edytor
              </Button>
            </div>
            <Button
              onClick={handleNext}
              disabled={items.length === 0 || detailsPending}
              data-testid={`${testId}-primary-btn`}
            >
              {patient ? 'Dalej: harmonogram' : 'Wybierz pacjenta'}
            </Button>
          </>
        )
      }
    >
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {draftItems.map((item, index) => {
            const exercise = byId.get(item.exerciseId);
            return (
              <DraftRow
                key={`${item.exerciseId}-${index}`}
                item={item}
                exercise={exercise}
                organizationId={organizationId}
                catalogPool={exercises}
                excludeIds={draftIds}
                alternatives={exercise ? findAlternatives(exercise, exercises, draftIds) : []}
                locked={locked}
                added={item.exerciseId === spec.addedExerciseId}
                versionPending={versionPending}
                testId={testId}
                onPreview={
                  previewIndexByRow.has(index) ? () => setPreviewIndex(previewIndexByRow.get(index)!) : undefined
                }
                onRemove={() => removeItem(index)}
                onSwap={(alternative) => updateItem(index, draftItemFromExercise(alternative))}
                onOpenCatalogSearch={(initialQuery) => setSearch(initialQuery ?? '')}
                onClearWarmup={() => updateItem(index, { isWarmup: false })}
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
            ? 'Nie udało się znaleźć tego zestawu w katalogu gabinetu. Dodaj ćwiczenia z katalogu.'
            : 'Zestaw jest pusty. Dodaj ćwiczenia z katalogu.'}
        </ChatCardEmpty>
      )}

      {!locked &&
        (search === null ? (
          <div>
            <Button variant="outline" size="sm" onClick={() => setSearch('')} data-testid={`${testId}-add-btn`}>
              <Plus aria-hidden="true" />
              Dodaj ćwiczenie
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && setSearch(null)}
                placeholder="Wpisz nazwę ćwiczenia, np. mostek, przysiad"
                aria-label="Szukaj ćwiczenia do dodania"
                data-testid={`${testId}-add-search-input`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch(null)}
                data-testid={`${testId}-add-cancel-btn`}
              >
                Anuluj
              </Button>
            </div>
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
                      <ExerciseReviewBadge exercise={exercise} testId={`${testId}-add-review-${exercise.id}`} />
                      <Plus className="h-4 w-4 text-tint" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {/* Brak w katalogu albo nie to: nowe ćwiczenie z AI, które wróci do tej propozycji. */}
            {search.trim().length >= 3 && searchResults.length === 0 && (
              <p className="px-2 text-[13px] text-label-secondary" data-testid={`${testId}-add-empty`}>
                Brak pasujących ćwiczeń w katalogu.
              </p>
            )}
            <button
              type="button"
              data-testid={search.trim().length >= 3 ? `${testId}-add-create-btn` : `${testId}-create-btn`}
              onClick={() => createExercise(search.trim().length >= 3 ? search.trim() : undefined)}
              disabled={!draftReturn}
              className="flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-[14px] text-tint hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-fill-quaternary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {search.trim().length >= 3 ? `Utwórz „${search.trim()}” z AI` : 'Utwórz nowe ćwiczenie z AI'}
              </span>
            </button>
          </div>
        ))}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-[0.5px] border-hairline pt-3 text-[14px] tabular-nums text-label-secondary">
          <span>{formatExerciseCount(items.length)}</span>
          <span>
            dziennie ok.{' '}
            <b className="text-[16px] font-semibold text-foreground">{minutesUnknown ? '—' : `${minutes} min`}</b>
          </span>
        </div>
      )}

      {/* Zestaw z opisu (bez zestawu z katalogu): pytania, które pomagają dobrać ćwiczenia trafniej. */}
      {!set && !locked && spec.note && (
        <ClarifyChips
          hint="Zaznacz odpowiedzi, trafią gotowe do wiadomości, a lepiej dobiorę ćwiczenia."
          questions={draftClarifyQuestions({ request, note: spec.note })}
          testId={`${testId}-clarify`}
        />
      )}
      <ChatPhonePreviewDialog
        open={previewIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null);
        }}
        exercises={previewCards}
        initialIndex={previewIndex ?? 0}
      />
    </ChatCard>
  );
}
