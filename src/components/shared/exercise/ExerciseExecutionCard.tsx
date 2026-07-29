'use client';

import { useState, useCallback, useMemo } from 'react';
import { Clock, Settings2, ChevronUp, ChevronDown, X, Eye, Info, ListOrdered } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LabeledStepper } from '@/components/shared/LabeledStepper';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { getMediaUrl } from '@/utils/mediaUrl';
import { cn } from '@/lib/utils';
import { calculateExerciseTotalSeconds, formatExerciseDuration } from '@/utils/exerciseTime';
import {
  type ExerciseExecutionCardProps,
  type EditableField,
  isFieldEditable,
} from './types';
import {
  EXERCISE_FIELD_METADATA,
  HIDE_EXERCISE_TAGS,
  INLINE_EXERCISE_FIELD_ORDER,
  formatFieldValueWithPlaceholder,
  type ExerciseFieldKey,
} from './displayRegistry';
import {
  ExerciseParametersFields,
  type ExerciseParameterValues,
  type ParameterTestIdKind,
} from './ExerciseParametersFields';
import { ExercisePatientContentFields } from './ExercisePatientContentFields';
import {
  buildEnrichmentOverrideDelta,
  listOverriddenEnrichmentPaths,
} from './enrichmentOverride';
import { setEnrichmentAtPath, deepCloneEnrichment } from '@/features/exercises/useEnrichmentDraft';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import type { MappingOnlyFieldKey } from './fieldContract';
import { ExercisePreviewDialog } from './ExercisePreviewDialog';
import type { ExerciseExecutionCardSurface } from './types';

const CARD_FIELD_TESTID_MAP: Record<
  ExerciseFieldKey | MappingOnlyFieldKey,
  { input: string; info: string }
> = {
  sets: { input: 'sets-input', info: 'help-sets' },
  reps: { input: 'reps-input', info: 'help-reps' },
  executionTime: { input: 'execution-time-input', info: 'help-executionTime' },
  restSets: { input: 'rest-sets-input', info: 'help-restSets' },
  restReps: { input: 'rest-reps-input', info: 'help-restReps' },
  preparationTime: { input: 'preparation-time-input', info: 'help-preparationTime' },
  duration: { input: 'duration-input', info: 'help-duration' },
  load: { input: 'load-input', info: 'help-load' },
  tempo: { input: 'tempo-input', info: 'help-tempo' },
  side: { input: 'side-select', info: 'help-side' },
  rangeOfMotion: { input: 'rom-input', info: 'help-rangeOfMotion' },
  difficultyLevel: { input: 'difficulty-select', info: 'help-difficulty' },
  patientDescription: { input: 'patient-description-input', info: 'help-patientDescription' },
  clinicalDescription: { input: 'clinical-description-input', info: 'help-clinicalDescription' },
  audioCue: { input: 'audio-cue-input', info: 'help-audioCue' },
  notes: { input: 'notes-input', info: 'help-notes' },
  customName: { input: 'custom-name-input', info: 'help-customName' },
  customDescription: { input: 'custom-description-input', info: 'help-customDescription' },
};

function exerciseToParameterValues(
  exercise: ExerciseExecutionCardProps['exercise']
): ExerciseParameterValues {
  return {
    sets: exercise.sets,
    reps: exercise.reps,
    executionTime: exercise.executionTime ?? null,
    restSets: exercise.restSets ?? null,
    restReps: exercise.restReps ?? null,
    preparationTime: exercise.preparationTime ?? null,
    duration: exercise.duration ?? null,
    loadKg: exercise.loadKg ?? null,
    tempo: exercise.tempo ?? '',
    rangeOfMotion: exercise.rangeOfMotion ?? '',
    side: exercise.side ?? 'none',
    difficultyLevel: exercise.difficultyLevel ?? 'UNKNOWN',
    patientDescription: exercise.patientDescription ?? '',
    clinicalDescription: exercise.clinicalDescription ?? '',
    audioCue: exercise.audioCue ?? '',
    notes: exercise.notes ?? '',
    customName: exercise.customName ?? '',
    customDescription: exercise.customDescription ?? '',
  };
}

function toCardPatch(patch: Partial<ExerciseParameterValues>): Partial<ExerciseExecutionCardProps['exercise']> {
  const next: Partial<ExerciseExecutionCardProps['exercise']> = {};

  if ('sets' in patch && patch.sets != null) next.sets = patch.sets;
  if ('reps' in patch && patch.reps != null) next.reps = patch.reps;
  if ('executionTime' in patch) next.executionTime = patch.executionTime ?? undefined;
  if ('restSets' in patch) next.restSets = patch.restSets ?? undefined;
  if ('restReps' in patch) next.restReps = patch.restReps ?? undefined;
  if ('preparationTime' in patch) next.preparationTime = patch.preparationTime ?? undefined;
  if ('duration' in patch) next.duration = patch.duration ?? undefined;
  if ('loadKg' in patch) {
    next.loadKg = patch.loadKg ?? undefined;
    next.loadDisplayText = patch.loadKg == null ? undefined : `${patch.loadKg} kg`;
  }
  if ('tempo' in patch) next.tempo = patch.tempo ?? undefined;
  if ('rangeOfMotion' in patch) next.rangeOfMotion = patch.rangeOfMotion ?? undefined;
  if ('side' in patch) next.side = patch.side ?? undefined;
  if ('difficultyLevel' in patch) next.difficultyLevel = patch.difficultyLevel ?? undefined;
  if ('patientDescription' in patch) next.patientDescription = patch.patientDescription ?? undefined;
  if ('clinicalDescription' in patch) next.clinicalDescription = patch.clinicalDescription ?? undefined;
  if ('audioCue' in patch) next.audioCue = patch.audioCue ?? undefined;
  if ('notes' in patch) next.notes = patch.notes ?? undefined;
  if ('customName' in patch) next.customName = patch.customName ?? undefined;
  if ('customDescription' in patch) next.customDescription = patch.customDescription ?? undefined;

  return next;
}

export function ExerciseExecutionCard({
  mode,
  exercise,
  viewVariant = 'compact',
  hideTimerBadge = false,
  surface = 'mapping',
  editableFields,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpand,
  onChange,
  onRemove,
  onPreview,
  onOpenDetails,
  dragHandle,
  showModifiedBadge = false,
  readOnlyReason,
  className,
  testIdPrefix = 'exercise-execution-card',
}: Readonly<ExerciseExecutionCardProps>) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const [internalPreviewOpen, setInternalPreviewOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [instructionsMounted, setInstructionsMounted] = useState(false);

  const isExpanded = controlledExpanded ?? uncontrolledExpanded;
  const setExpanded = useCallback(
    (value: boolean) => {
      if (onExpand) onExpand(value);
      else setUncontrolledExpanded(value);
    },
    [onExpand]
  );

  const canEdit = mode === 'edit' && !readOnlyReason;
  const showReadableView = mode === 'view' && viewVariant === 'readable';
  const id = exercise.id;
  const testId = `${testIdPrefix}-${id}`;
  const imageUrl = getMediaUrl(exercise.thumbnailUrl ?? exercise.imageUrls?.[0]);
  const canUseInternalPreview = !onPreview;
  const totalDuration = useMemo(
    () =>
      calculateExerciseTotalSeconds({
        sets: exercise.sets,
        reps: exercise.reps,
        duration: exercise.duration,
        executionTime: exercise.executionTime,
        restSets: exercise.restSets,
        restReps: exercise.restReps,
        preparationTime: exercise.preparationTime,
        tempo: exercise.tempo,
        side: exercise.side,
      }),
    [
      exercise.duration,
      exercise.executionTime,
      exercise.preparationTime,
      exercise.reps,
      exercise.restReps,
      exercise.restSets,
      exercise.sets,
      exercise.side,
      exercise.tempo,
    ]
  );
  const durationBadgeLabel =
    totalDuration.seconds > 0 ? formatExerciseDuration(totalDuration.seconds, totalDuration.isEstimate) : null;
  const shouldShowDurationBadge = durationBadgeLabel !== null && !hideTimerBadge;

  const canEditField = (field: EditableField) => canEdit && isFieldEditable(field, mode, editableFields);
  const setsField = EXERCISE_FIELD_METADATA.sets;
  const repsField = EXERCISE_FIELD_METADATA.reps;
  const cardSurface: ExerciseExecutionCardSurface = surface;
  const exerciseTemplateHref = exercise.sourceExerciseId
    ? `/exercises/${exercise.sourceExerciseId}`
    : undefined;

  const patientPlanEditableSourceKeys = useMemo(
    () =>
      new Set([
        'side',
        'rangeOfMotion',
        'difficultyLevel',
        'patientDescription',
        'clinicalDescription',
        'audioCue',
      ]),
    []
  );

  const inlineSourceFields = useMemo(
    () =>
      INLINE_EXERCISE_FIELD_ORDER.map((fieldKey) => {
        const field = EXERCISE_FIELD_METADATA[fieldKey];
        if (!field.isInlineVisible) return null;
        if (cardSurface === 'patientPlan' && patientPlanEditableSourceKeys.has(fieldKey)) {
          return null;
        }
        // Editable in expanded panel on mapping — avoid duplicate inline tiles.
        if (
          cardSurface === 'mapping' &&
          (fieldKey === 'side' ||
            fieldKey === 'rangeOfMotion' ||
            fieldKey === 'difficultyLevel' ||
            fieldKey === 'clinicalDescription' ||
            fieldKey === 'audioCue')
        ) {
          return null;
        }
        const value = formatFieldValueWithPlaceholder(
          field,
          exercise,
          field.group === 'content' ? 'Nie ustawiono' : '—'
        );
        return { field, value };
      }).filter(
        (
          fieldData
        ): fieldData is {
          field: (typeof EXERCISE_FIELD_METADATA)[keyof typeof EXERCISE_FIELD_METADATA];
          value: string;
        } => fieldData !== null
      ),
    [exercise, cardSurface, patientPlanEditableSourceKeys]
  );

  const handlePreviewTrigger = useCallback(() => {
    if (onPreview) {
      onPreview();
      return;
    }
    setInternalPreviewOpen(true);
  }, [onPreview]);

  const handleChange = useCallback(
    (patch: Partial<typeof exercise>) => {
      onChange?.(patch);
    },
    [onChange]
  );

  const parameterValues = useMemo(() => exerciseToParameterValues(exercise), [exercise]);

  const handleParametersChange = useCallback(
    (patch: Partial<ExerciseParameterValues>) => {
      handleChange(toCardPatch(patch));
    },
    [handleChange]
  );

  const templateEnrichment = useMemo(
    () => toV3(exercise.templateEnrichment),
    [exercise.templateEnrichment]
  );
  const currentEnrichment = useMemo(
    () => exercise.enrichment ?? templateEnrichment,
    [exercise.enrichment, templateEnrichment]
  );
  const enrichmentOverride = useMemo(
    () => buildEnrichmentOverrideDelta(templateEnrichment, currentEnrichment),
    [templateEnrichment, currentEnrichment]
  );
  const enrichmentDirtyPaths = useMemo(
    () => listOverriddenEnrichmentPaths(enrichmentOverride),
    [enrichmentOverride]
  );

  const handleEnrichmentPath = useCallback(
    (path: string, value: unknown) => {
      const next = deepCloneEnrichment(currentEnrichment);
      setEnrichmentAtPath(next as Record<string, unknown>, path, value);
      handleChange({ enrichment: next });
    },
    [currentEnrichment, handleChange]
  );

  const dirtyPathSet = useMemo(() => new Set<string>(enrichmentDirtyPaths), [enrichmentDirtyPaths]);
  const isEnrichmentPathDirty = useCallback(
    (path: string) => dirtyPathSet.has(path),
    [dirtyPathSet]
  );

  const handleRestoreEnrichment = useCallback(() => {
    handleChange({ enrichment: templateEnrichment });
  }, [handleChange, templateEnrichment]);

  const handleInstructionsOpenChange = useCallback((open: boolean) => {
    setInstructionsOpen(open);
    if (open) setInstructionsMounted(true);
  }, []);

  const cardTestIdFor = useCallback(
    (key: ExerciseFieldKey | MappingOnlyFieldKey, kind: ParameterTestIdKind) => {
      const mapped = CARD_FIELD_TESTID_MAP[key];
      if (kind === 'info') return `${testId}-${mapped.info}`;
      return `${testId}-${mapped.input}`;
    },
    [testId]
  );

  const omitFields = useMemo(() => {
    return ['sets', 'reps'] as ExerciseFieldKey[];
  }, []);

  const sourceInfoFooter = (
    <div className="space-y-3 border-t border-border/30 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide">
          Informacje z ćwiczenia
        </p>
        {onOpenDetails ? (
          <button
            type="button"
            onClick={onOpenDetails}
            className="text-xs text-primary hover:underline"
            data-testid={`${testId}-open-details-btn`}
          >
            Zobacz pełne szczegóły
          </button>
        ) : null}
      </div>

      {inlineSourceFields.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 @[460px]:grid-cols-2">
          {inlineSourceFields.map(({ field, value }) => (
            <div
              key={field.key}
              className="rounded-lg border border-border/40 bg-surface-light/30 px-3 py-2"
            >
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-muted-foreground">{field.label}</p>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        aria-label={`Informacja o polu: ${field.label}`}
                        data-testid={`${testId}-source-help-${field.key}`}
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {field.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Brak dodatkowych informacji źródłowych dla tego ćwiczenia.
        </p>
      )}

      {!HIDE_EXERCISE_TAGS && (exercise.mainTags?.length || exercise.additionalTags?.length) ? (
        <div className="flex flex-wrap gap-1.5">
          {exercise.mainTags?.map((tag) => (
            <span
              key={`main-${tag}`}
              className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {tag}
            </span>
          ))}
          {exercise.additionalTags?.map((tag) => (
            <span
              key={`additional-${tag}`}
              className="rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setExpanded}>
      {/*
        @container on the card — container queries let the card self-adapt:
        < 460px  → 2-row (narrow sidebar)
        ≥ 460px  → 1-row (dialogs, wide builders)
      */}
      <div
        className={cn(
          '@container w-full overflow-hidden rounded-xl border border-border bg-surface transition-colors',
          mode === 'edit' && 'hover:border-border/80',
          isExpanded && 'border-primary/30 bg-surface/95',
          className
        )}
        data-testid={testId}
      >
        {/* ── EDIT MODE ── */}
        {mode === 'edit' && (
          <>
            {(() => {
              const actionButtons = (
                <div className="flex h-8 shrink-0 items-center gap-0.5">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-surface-light hover:text-foreground data-[state=open]:bg-primary/10 data-[state=open]:text-primary cursor-pointer"
                      title={isExpanded ? 'Zwiń' : 'Więcej opcji'}
                      data-testid={`${testId}-expand-btn`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <Settings2 className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  {onRemove ? (
                    <button
                      type="button"
                      onClick={onRemove}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      title="Usuń"
                      data-testid={`${testId}-remove-btn`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              );

              const steppers = (
                <div className="flex items-start justify-center gap-4">
                  <LabeledStepper
                    value={exercise.sets}
                    onChange={(value) => handleChange({ sets: value })}
                    label={setsField.label}
                    infoTooltip={setsField.tooltip}
                    infoTestId={`${testId}-help-sets`}
                    inputTestId={`${testId}-sets-input`}
                    min={1}
                    max={20}
                    disabled={!canEditField('sets')}
                  />
                  <LabeledStepper
                    value={exercise.reps}
                    onChange={(value) => handleChange({ reps: value })}
                    label={repsField.label}
                    infoTooltip={repsField.tooltip}
                    infoTestId={`${testId}-help-reps`}
                    inputTestId={`${testId}-reps-input`}
                    min={1}
                    max={100}
                    disabled={!canEditField('reps')}
                  />
                </div>
              );

              return (
                <div
                  className={cn(
                    'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 p-3',
                    '@[460px]:grid-cols-[minmax(0,1fr)_auto] @[460px]:gap-x-4 @[460px]:gap-y-0 @[460px]:p-4'
                  )}
                >
                  <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5">
                    {dragHandle ? (
                      <div className="-ml-0.5 flex shrink-0 items-center self-center">{dragHandle}</div>
                    ) : null}
                    <button
                      type="button"
                      className="group/thumb shrink-0 cursor-pointer"
                      onClick={handlePreviewTrigger}
                      aria-label="Otwórz podgląd ćwiczenia"
                      data-testid={`${testId}-thumbnail-btn`}
                    >
                      <ExerciseThumbnail
                        src={imageUrl}
                        sizeClass="h-10 w-10"
                        overlay={
                          <div
                            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover/thumb:opacity-100"
                            data-testid={`${testId}-preview-btn`}
                          >
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        }
                      />
                    </button>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p
                              className="truncate text-sm font-medium leading-snug text-foreground"
                              data-testid={`${testId}-name`}
                            >
                              {exercise.displayName}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[300px] text-xs wrap-break-word">
                            {exercise.displayName}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {shouldShowDurationBadge ? (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium leading-none text-primary">
                                <Clock className="h-3 w-3 shrink-0" />
                                {durationBadgeLabel}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs">
                              Szacowany laczny czas wykonania cwiczenia z uwzglednieniem serii, powtorzen, przerw i
                              przygotowania.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </div>
                  </div>

                  <div className="col-start-2 row-start-1 flex items-center justify-end @[460px]:hidden">
                    {actionButtons}
                  </div>

                  <div className="col-span-2 col-start-1 row-start-2 flex justify-center @[460px]:hidden">
                    {steppers}
                  </div>

                  <div className="col-start-2 row-start-1 hidden items-start gap-3 @[460px]:flex">
                    {steppers}
                    {actionButtons}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ── VIEW & READABLE MODE ── */}
        {mode === 'view' && (
          <div
            className={cn(
              'w-full p-4',
              showReadableView ? 'flex flex-row items-center gap-3' : 'flex flex-row items-center justify-between'
            )}
          >
            <div
              className="grid items-center gap-3 flex-1 min-w-0"
              style={{ gridTemplateColumns: dragHandle ? 'auto auto 1fr' : 'auto 1fr' }}
            >
              {dragHandle && <div className="shrink-0">{dragHandle}</div>}
              <button
                type="button"
                className="group/thumb cursor-pointer"
                onClick={handlePreviewTrigger}
                aria-label="Otwórz podgląd ćwiczenia"
                data-testid={`${testId}-thumbnail-btn`}
              >
                <ExerciseThumbnail
                  src={imageUrl}
                  sizeClass="h-12 w-12"
                  overlay={
                    <div
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                      data-testid={`${testId}-preview-btn`}
                    >
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                  }
                />
              </button>
              <div className="min-w-0 flex-1">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p
                        className={cn(
                          'font-medium text-sm text-foreground',
                          showReadableView ? 'leading-snug whitespace-normal wrap-break-word' : 'truncate'
                        )}
                        data-testid={`${testId}-name`}
                      >
                        {exercise.displayName}
                      </p>
                    </TooltipTrigger>
                    {!showReadableView && (
                      <TooltipContent side="top" className="text-xs max-w-[300px] wrap-break-word">
                        {exercise.displayName}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                {showReadableView ? (
                  <p className="mt-1 text-xs text-muted-foreground whitespace-normal wrap-break-word">
                    {exercise.sets} serie • {exercise.reps} powt.
                    {durationBadgeLabel ? ` • Czas cwiczenia: ${durationBadgeLabel}` : ''}
                    {showModifiedBadge ? ' • Zmienione' : ''}
                  </p>
                ) : shouldShowDurationBadge || showModifiedBadge ? (
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {shouldShowDurationBadge ? (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium leading-none text-primary">
                              <Clock className="h-3 w-3 shrink-0" />
                              Czas: {durationBadgeLabel}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-[220px]">
                            Szacowany laczny czas wykonania cwiczenia z uwzglednieniem serii, powtorzen, przerw i
                            przygotowania.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                    {showModifiedBadge ? (
                      <span
                        className="inline-flex h-5 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 text-[10px] font-semibold leading-none text-primary"
                        data-testid={`${testId}-modified-badge`}
                      >
                        <Settings2 className="h-3 w-3 shrink-0" aria-hidden />
                        <span>Zmienione</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            {viewVariant === 'compact' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-end gap-1.5 sm:gap-3 text-sm font-semibold text-foreground shrink-0 ml-3 bg-surface-light/50 px-3 py-2 sm:py-1.5 rounded-lg border border-border/40 min-w-[80px] sm:min-w-[120px]">
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-1.5 w-full sm:w-auto">
                  <span className="text-[10px] sm:hidden text-muted-foreground uppercase font-bold tracking-wide">
                    Serie
                  </span>
                  <span className="tabular-nums">{exercise.sets}</span>
                  <span className="text-muted-foreground text-xs font-normal hidden sm:inline ml-[-2px]">serie</span>
                </div>
                <div className="hidden sm:block text-muted-foreground/30 h-4 w-px bg-border/50"></div>
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-1.5 w-full sm:w-auto">
                  <span className="text-[10px] sm:hidden text-muted-foreground uppercase font-bold tracking-wide">
                    Powt.
                  </span>
                  <span className="tabular-nums">{exercise.reps}</span>
                  <span className="text-muted-foreground text-xs font-normal hidden sm:inline ml-[-2px]">powt.</span>
                </div>
                {shouldShowDurationBadge && (
                  <>
                    <div className="hidden sm:block text-muted-foreground/30 h-4 w-px bg-border/50"></div>
                    <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-1.5 w-full sm:w-auto">
                      <span className="text-[10px] sm:hidden text-muted-foreground uppercase font-bold tracking-wide">
                        Czas
                      </span>
                      <span className="text-primary tabular-nums">{durationBadgeLabel}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'edit' && (
          <CollapsibleContent>
            <div className="w-full border-t border-border bg-surface/50 px-3 py-4 @[460px]:px-4 space-y-3">
              <ExerciseParametersFields
                surface={cardSurface === 'patientPlan' ? 'patientPlan' : 'mapping'}
                values={parameterValues}
                onChange={handleParametersChange}
                omitFields={omitFields}
                showContentSection
                showMappingOnlyFields
                density="compact"
                advancedDefaultOpen={false}
                templateHref={exerciseTemplateHref}
                testIdFor={cardTestIdFor}
                structuralTestIdPrefix={testId}
                disabled={!canEdit}
                advancedFooter={sourceInfoFooter}
              />

              <Collapsible open={instructionsOpen} onOpenChange={handleInstructionsOpenChange}>
                <CollapsibleTrigger
                  className="flex w-full items-center justify-between rounded-2xl border border-border/40 bg-surface/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
                  data-testid={`${testId}-instructions-toggle`}
                >
                  <span className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-muted-foreground" />
                    Instrukcje dla pacjenta
                    {enrichmentDirtyPaths.length > 0 ? (
                      <span
                        className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"
                        data-testid={`${testId}-instructions-dirty-badge`}
                      >
                        zmienione
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      instructionsOpen && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  {instructionsMounted ? (
                    <ExercisePatientContentFields
                      surface={cardSurface === 'patientPlan' ? 'patientPlan' : 'mapping'}
                      enrichment={currentEnrichment}
                      setPath={handleEnrichmentPath}
                      isPathDirty={isEnrichmentPathDirty}
                      disabled={!canEdit}
                      showPatientLead
                      showCoreScalars={false}
                      enrichmentOverride={enrichmentOverride}
                      onRestoreAll={handleRestoreEnrichment}
                      testIdPrefix={`${testId}-patient-content`}
                    />
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CollapsibleContent>
        )}

        {readOnlyReason && (
          <div className="px-3 pb-2 pt-1 bg-surface-light/10 border-t border-border/30">
            <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {readOnlyReason}
            </p>
          </div>
        )}

        {canUseInternalPreview && (
          <ExercisePreviewDialog
            open={internalPreviewOpen}
            onOpenChange={setInternalPreviewOpen}
            exercise={exercise}
          />
        )}
      </div>
    </Collapsible>
  );
}
