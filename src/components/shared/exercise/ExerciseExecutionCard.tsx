'use client';

import { useState, useCallback, useMemo } from 'react';
import { Clock, Settings2, ChevronUp, ChevronDown, X, Eye, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LabeledStepper } from '@/components/shared/LabeledStepper';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { getMediaUrl } from '@/utils/mediaUrl';
import { cn } from '@/lib/utils';
import { calculateExerciseTotalSeconds, formatExerciseDuration } from '@/utils/exerciseTime';
import { useOptionalNumericDraft } from '@/hooks/useOptionalNumericDraft';
import {
  type ExerciseExecutionCardProps,
  type EditableField,
  isFieldEditable,
} from './types';
import {
  EXERCISE_FIELD_METADATA,
  HIDE_EXERCISE_TAGS,
  INLINE_EXERCISE_FIELD_ORDER,
  formatDifficultyLabel,
  formatFieldValueWithPlaceholder,
  formatSideLabel,
} from './displayRegistry';
import {
  DIFFICULTY_OPTIONS,
  MAPPING_ONLY_FIELD_CONFIG,
  SIDE_OPTIONS,
  getInheritedFieldKeys,
} from './fieldContract';
import { ExercisePreviewDialog } from './ExercisePreviewDialog';
import type { ExerciseExecutionCardSurface } from './types';

function EditableFieldLabel({
  label,
  tooltip,
  htmlFor,
  labelId,
  testId,
}: Readonly<{
  label: string;
  tooltip: string;
  htmlFor?: string;
  labelId?: string;
  testId: string;
}>) {
  const textClassName = 'text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide';

  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={textClassName}>
          {label}
        </label>
      ) : (
        <span id={labelId} className={textClassName}>
          {label}
        </span>
      )}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label={`Informacja o polu: ${label}`}
              data-testid={testId}
            >
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
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
  readOnlyReason,
  className,
  testIdPrefix = 'exercise-execution-card',
}: Readonly<ExerciseExecutionCardProps>) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [internalPreviewOpen, setInternalPreviewOpen] = useState(false);

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
  const {
    draftValue: executionTimeDraft,
    handleChange: handleExecutionTimeChange,
    handleFocus: handleExecutionTimeFocus,
    handleBlur: handleExecutionTimeBlur,
    handleKeyDown: handleExecutionTimeKeyDown,
  } = useOptionalNumericDraft({
    value: exercise.executionTime,
    onCommit: (value) => handleChange({ executionTime: value }),
    min: 0,
    max: 300,
  });
  const {
    draftValue: restSetsDraft,
    handleChange: handleRestSetsChange,
    handleFocus: handleRestSetsFocus,
    handleBlur: handleRestSetsBlur,
    handleKeyDown: handleRestSetsKeyDown,
  } = useOptionalNumericDraft({
    value: exercise.restSets,
    onCommit: (value) => handleChange({ restSets: value }),
    min: 0,
    max: 600,
  });
  const {
    draftValue: restRepsDraft,
    handleChange: handleRestRepsChange,
    handleFocus: handleRestRepsFocus,
    handleBlur: handleRestRepsBlur,
    handleKeyDown: handleRestRepsKeyDown,
  } = useOptionalNumericDraft({
    value: exercise.restReps,
    onCommit: (value) => handleChange({ restReps: value }),
    min: 0,
    max: 60,
  });
  const {
    draftValue: loadKgDraft,
    handleChange: handleLoadKgChange,
    handleFocus: handleLoadKgFocus,
    handleBlur: handleLoadKgBlur,
    handleKeyDown: handleLoadKgKeyDown,
  } = useOptionalNumericDraft({
    value: exercise.loadKg,
    onCommit: (value) =>
      handleChange({
        loadKg: value,
        loadDisplayText: value == null ? undefined : `${value} kg`,
      }),
    min: 0,
    max: 500,
    parseMode: 'float',
  });
  const {
    draftValue: durationDraft,
    handleChange: handleDurationChange,
    handleFocus: handleDurationFocus,
    handleBlur: handleDurationBlur,
    handleKeyDown: handleDurationKeyDown,
  } = useOptionalNumericDraft({
    value: exercise.duration,
    onCommit: (value) => handleChange({ duration: value }),
    min: 0,
    max: 3600,
  });
  const {
    draftValue: preparationTimeDraft,
    handleChange: handlePreparationTimeChange,
    handleFocus: handlePreparationTimeFocus,
    handleBlur: handlePreparationTimeBlur,
    handleKeyDown: handlePreparationTimeKeyDown,
  } = useOptionalNumericDraft({
    value: exercise.preparationTime,
    onCommit: (value) => handleChange({ preparationTime: value }),
    min: 0,
    max: 300,
  });
  const setsField = EXERCISE_FIELD_METADATA.sets;
  const repsField = EXERCISE_FIELD_METADATA.reps;
  const executionTimeField = EXERCISE_FIELD_METADATA.executionTime;
  const restSetsField = EXERCISE_FIELD_METADATA.restSets;
  const loadField = EXERCISE_FIELD_METADATA.load;
  const notesField = EXERCISE_FIELD_METADATA.notes;
  const restRepsField = EXERCISE_FIELD_METADATA.restReps;
  const durationField = EXERCISE_FIELD_METADATA.duration;
  const tempoField = EXERCISE_FIELD_METADATA.tempo;
  const preparationTimeField = EXERCISE_FIELD_METADATA.preparationTime;
  const customNameConfig = MAPPING_ONLY_FIELD_CONFIG.customName;
  const customDescriptionConfig = MAPPING_ONLY_FIELD_CONFIG.customDescription;
  const sideField = EXERCISE_FIELD_METADATA.side;
  const rangeOfMotionField = EXERCISE_FIELD_METADATA.rangeOfMotion;
  const difficultyField = EXERCISE_FIELD_METADATA.difficultyLevel;
  const patientDescriptionField = EXERCISE_FIELD_METADATA.patientDescription;
  const clinicalDescriptionField = EXERCISE_FIELD_METADATA.clinicalDescription;
  const audioCueField = EXERCISE_FIELD_METADATA.audioCue;
  const cardSurface: ExerciseExecutionCardSurface = surface;
  const inheritedFieldKeys = useMemo(
    () => getInheritedFieldKeys(cardSurface),
    [cardSurface]
  );
  const showInheritedSection = cardSurface === 'mapping' && inheritedFieldKeys.length > 0;
  const showPatientPlanClinicalFields = cardSurface === 'patientPlan' && canEdit;
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
        const value = formatFieldValueWithPlaceholder(field, exercise, field.group === 'content' ? 'Nie ustawiono' : '—');
        return { field, value };
      }).filter(
        (fieldData): fieldData is { field: (typeof EXERCISE_FIELD_METADATA)[keyof typeof EXERCISE_FIELD_METADATA]; value: string } =>
          fieldData !== null
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
              /*
                Narrow (<460px):
                  [identity ........] [actions]
                  [    steppers centered    ]
                Wide (>=460px):
                  [identity ........] [steppers + actions]
                  Actions share the h-8 control baseline with steppers (labels sit below).
              */
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
                    onChange={(v) => handleChange({ sets: v })}
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
                    onChange={(v) => handleChange({ reps: v })}
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
                      <div className="-ml-0.5 flex shrink-0 items-center self-center">
                        {dragHandle}
                      </div>
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
                              Szacowany laczny czas wykonania cwiczenia z uwzglednieniem serii, powtorzen, przerw i przygotowania.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </div>
                  </div>

                  {/* Narrow: actions top-right, aligned to identity row */}
                  <div className="col-start-2 row-start-1 flex items-center justify-end @[460px]:hidden">
                    {actionButtons}
                  </div>

                  {/* Narrow: steppers on second row */}
                  <div className="col-span-2 col-start-1 row-start-2 flex justify-center @[460px]:hidden">
                    {steppers}
                  </div>

                  {/* Wide: steppers + actions share the control baseline (h-8) */}
                  <div className="col-start-2 row-start-1 hidden items-start gap-3 @[460px]:flex">
                    {steppers}
                    {actionButtons}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ── VIEW & READABLE MODE: single-row layout ── */}
        {mode === 'view' && (
          <div
            className={cn(
              'w-full p-4',
              showReadableView ? 'flex flex-row items-center gap-3' : 'flex flex-row items-center justify-between'
            )}
          >
            {/* Left: CSS Grid — 1fr ensures name is bounded regardless of container */}
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
                  </p>
                ) : shouldShowDurationBadge ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-primary font-medium">
                          <Clock className="h-3 w-3" />
                          Czas: {durationBadgeLabel}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[220px]">
                        Szacowany laczny czas wykonania cwiczenia z uwzglednieniem serii, powtorzen, przerw i przygotowania.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
            </div>
            {/* Right: basic params summary */}
            {viewVariant === 'compact' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-end gap-1.5 sm:gap-3 text-sm font-semibold text-foreground shrink-0 ml-3 bg-surface-light/50 px-3 py-2 sm:py-1.5 rounded-lg border border-border/40 min-w-[80px] sm:min-w-[120px]">
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-1.5 w-full sm:w-auto">
                  <span className="text-[10px] sm:hidden text-muted-foreground uppercase font-bold tracking-wide">Serie</span>
                  <span className="tabular-nums">{exercise.sets}</span>
                  <span className="text-muted-foreground text-xs font-normal hidden sm:inline ml-[-2px]">serie</span>
                </div>
                <div className="hidden sm:block text-muted-foreground/30 h-4 w-px bg-border/50"></div>
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-1.5 w-full sm:w-auto">
                  <span className="text-[10px] sm:hidden text-muted-foreground uppercase font-bold tracking-wide">Powt.</span>
                  <span className="tabular-nums">{exercise.reps}</span>
                  <span className="text-muted-foreground text-xs font-normal hidden sm:inline ml-[-2px]">powt.</span>
                </div>
                {shouldShowDurationBadge && (
                  <>
                    <div className="hidden sm:block text-muted-foreground/30 h-4 w-px bg-border/50"></div>
                    <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-1.5 w-full sm:w-auto">
                      <span className="text-[10px] sm:hidden text-muted-foreground uppercase font-bold tracking-wide">Czas</span>
                      <span className="text-primary tabular-nums">{durationBadgeLabel}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expanded panel (edit only) - below main row, border-t */}
        {mode === 'edit' && (
          <CollapsibleContent>
            <div className="w-full border-t border-border bg-surface/50 px-3 py-4 @[460px]:px-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 @[460px]:gap-4">
                <div>
                  <EditableFieldLabel
                    htmlFor={`${testId}-execution-time-input`}
                    label={`${executionTimeField.label} (s)`}
                    tooltip={executionTimeField.tooltip}
                    testId={`${testId}-help-executionTime`}
                  />
                  <Input
                    id={`${testId}-execution-time-input`}
                    type="number"
                    min={0}
                    max={300}
                    value={executionTimeDraft}
                    onChange={(e) => handleExecutionTimeChange(e.target.value)}
                    onFocus={handleExecutionTimeFocus}
                    onBlur={handleExecutionTimeBlur}
                    onKeyDown={handleExecutionTimeKeyDown}
                    className="h-9 bg-surface-light border-border/50 focus:border-primary"
                    disabled={!canEditField('executionTime')}
                    data-testid={`${testId}-execution-time-input`}
                  />
                </div>
                <div>
                  <EditableFieldLabel
                    htmlFor={`${testId}-rest-sets-input`}
                    label={`${restSetsField.label} (s)`}
                    tooltip={restSetsField.tooltip}
                    testId={`${testId}-help-restSets`}
                  />
                  <Input
                    id={`${testId}-rest-sets-input`}
                    type="number"
                    value={restSetsDraft}
                    onChange={(e) => handleRestSetsChange(e.target.value)}
                    onFocus={handleRestSetsFocus}
                    onBlur={handleRestSetsBlur}
                    onKeyDown={handleRestSetsKeyDown}
                    className="h-9 bg-surface-light border-border/50 focus:border-primary"
                    disabled={!canEditField('restSets')}
                    data-testid={`${testId}-rest-sets-input`}
                  />
                </div>
                <div>
                  <EditableFieldLabel
                    htmlFor={`${testId}-load-input`}
                    label={`${loadField.label} (kg)`}
                    tooltip={loadField.tooltip}
                    testId={`${testId}-help-load`}
                  />
                  <Input
                    id={`${testId}-load-input`}
                    type="number"
                    placeholder="np. 5"
                    value={loadKgDraft}
                    onChange={(e) => handleLoadKgChange(e.target.value)}
                    onFocus={handleLoadKgFocus}
                    onBlur={handleLoadKgBlur}
                    onKeyDown={handleLoadKgKeyDown}
                    className="h-9 bg-surface-light border-border/50 focus:border-primary"
                    disabled={!canEditField('loadKg')}
                    data-testid={`${testId}-load-input`}
                  />
                </div>
                <div>
                  <EditableFieldLabel
                    htmlFor={`${testId}-duration-input`}
                    label={`${durationField.label} (s)`}
                    tooltip={durationField.tooltip}
                    testId={`${testId}-help-duration`}
                  />
                  <Input
                    id={`${testId}-duration-input`}
                    type="number"
                    min={0}
                    max={3600}
                    step={5}
                    value={durationDraft}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    onFocus={handleDurationFocus}
                    onBlur={handleDurationBlur}
                    onKeyDown={handleDurationKeyDown}
                    className="h-9 bg-surface-light border-border/50 focus:border-primary"
                    disabled={!canEditField('duration')}
                    data-testid={`${testId}-duration-input`}
                  />
                </div>
              </div>
              <div>
                <EditableFieldLabel
                  htmlFor={`${testId}-notes-input`}
                  label={notesField.label}
                  tooltip={notesField.tooltip}
                  testId={`${testId}-help-notes`}
                />
                <Textarea
                  id={`${testId}-notes-input`}
                  placeholder="Instrukcje, wskazówki..."
                  value={exercise.notes ?? ''}
                  onChange={(e) => handleChange({ notes: e.target.value })}
                  className="min-h-[60px] resize-none bg-surface-light border-border/50 focus:border-primary"
                  disabled={!canEditField('notes')}
                  data-testid={`${testId}-notes-input`}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
                  data-testid={`${testId}-advanced-toggle`}
                >
                  {showAdvanced ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  Zaawansowane
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/20">
                    <div>
                      <EditableFieldLabel
                        htmlFor={`${testId}-rest-reps-input`}
                        label={`${restRepsField.label} (s)`}
                        tooltip={restRepsField.tooltip}
                        testId={`${testId}-help-restReps`}
                      />
                      <Input
                        id={`${testId}-rest-reps-input`}
                        type="number"
                        min={0}
                        max={60}
                        value={restRepsDraft}
                        onChange={(e) => handleRestRepsChange(e.target.value)}
                        onFocus={handleRestRepsFocus}
                        onBlur={handleRestRepsBlur}
                        onKeyDown={handleRestRepsKeyDown}
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('restReps')}
                        data-testid={`${testId}-rest-reps-input`}
                      />
                    </div>
                    <div>
                      <EditableFieldLabel
                        htmlFor={`${testId}-tempo-input`}
                        label={tempoField.label}
                        tooltip={tempoField.tooltip}
                        testId={`${testId}-help-tempo`}
                      />
                      <Input
                        id={`${testId}-tempo-input`}
                        placeholder="np. 2-1-2-0"
                        value={exercise.tempo ?? ''}
                        onChange={(e) => handleChange({ tempo: e.target.value })}
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('tempo')}
                        data-testid={`${testId}-tempo-input`}
                      />
                    </div>
                    <div>
                      <EditableFieldLabel
                        htmlFor={`${testId}-preparation-time-input`}
                        label={`${preparationTimeField.label} (s)`}
                        tooltip={preparationTimeField.tooltip}
                        testId={`${testId}-help-preparationTime`}
                      />
                      <Input
                        id={`${testId}-preparation-time-input`}
                        type="number"
                        min={0}
                        max={300}
                        value={preparationTimeDraft}
                        onChange={(e) => handlePreparationTimeChange(e.target.value)}
                        onFocus={handlePreparationTimeFocus}
                        onBlur={handlePreparationTimeBlur}
                        onKeyDown={handlePreparationTimeKeyDown}
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('preparationTime')}
                        data-testid={`${testId}-preparation-time-input`}
                      />
                    </div>
                    {showInheritedSection ? (
                      <div
                        className="sm:col-span-2 space-y-2 rounded-lg border border-border/40 bg-surface-light/40 p-3"
                        data-testid={`${testId}-inherited-section`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Odziedziczone z ćwiczenia
                          </p>
                          {exerciseTemplateHref ? (
                            <a
                              href={exerciseTemplateHref}
                              className="text-[11px] font-medium text-primary hover:underline"
                              data-testid={`${testId}-edit-template-link`}
                            >
                              Edytuj w ćwiczeniu
                            </a>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {(['side', 'rangeOfMotion', 'difficultyLevel'] as const).map((fieldKey) => {
                            if (!inheritedFieldKeys.includes(fieldKey)) {
                              return null;
                            }
                            let displayValue = '—';
                            if (fieldKey === 'side') {
                              displayValue = formatSideLabel(exercise.side) || '—';
                            } else if (fieldKey === 'difficultyLevel') {
                              displayValue = formatDifficultyLabel(exercise.difficultyLevel) || '—';
                            } else {
                              displayValue = exercise.rangeOfMotion?.trim() || '—';
                            }
                            return (
                              <div
                                key={fieldKey}
                                className="rounded-md border border-border/30 bg-background/60 px-2.5 py-2"
                                data-testid={`${testId}-inherited-${fieldKey}`}
                              >
                                <div className="mb-1 flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
                                    {EXERCISE_FIELD_METADATA[fieldKey].label}
                                  </span>
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                    odziedziczone
                                  </span>
                                </div>
                                <p className="text-sm text-foreground">{displayValue}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {showPatientPlanClinicalFields ? (
                      <>
                        <div>
                          <EditableFieldLabel
                            htmlFor={`${testId}-side-select`}
                            label={sideField.label}
                            tooltip={sideField.tooltip}
                            testId={`${testId}-help-side`}
                          />
                          <select
                            id={`${testId}-side-select`}
                            value={exercise.side ?? 'none'}
                            onChange={(event) => handleChange({ side: event.target.value })}
                            className="flex h-9 w-full rounded-md border border-border/50 bg-surface-light px-3 text-sm text-foreground"
                            disabled={!canEditField('side')}
                            data-testid={`${testId}-side-select`}
                          >
                            {SIDE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <EditableFieldLabel
                            htmlFor={`${testId}-difficulty-select`}
                            label={difficultyField.label}
                            tooltip={difficultyField.tooltip}
                            testId={`${testId}-help-difficulty`}
                          />
                          <select
                            id={`${testId}-difficulty-select`}
                            value={exercise.difficultyLevel ?? 'UNKNOWN'}
                            onChange={(event) =>
                              handleChange({ difficultyLevel: event.target.value })
                            }
                            className="flex h-9 w-full rounded-md border border-border/50 bg-surface-light px-3 text-sm text-foreground"
                            disabled={!canEditField('difficultyLevel')}
                            data-testid={`${testId}-difficulty-select`}
                          >
                            {DIFFICULTY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <EditableFieldLabel
                            htmlFor={`${testId}-rom-input`}
                            label={rangeOfMotionField.label}
                            tooltip={rangeOfMotionField.tooltip}
                            testId={`${testId}-help-rangeOfMotion`}
                          />
                          <Input
                            id={`${testId}-rom-input`}
                            placeholder="np. 0–90°"
                            value={exercise.rangeOfMotion ?? ''}
                            onChange={(event) =>
                              handleChange({ rangeOfMotion: event.target.value })
                            }
                            className="h-9 bg-surface-light border-border/50"
                            disabled={!canEditField('rangeOfMotion')}
                            data-testid={`${testId}-rom-input`}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <EditableFieldLabel
                            htmlFor={`${testId}-patient-description-input`}
                            label={patientDescriptionField.label}
                            tooltip={patientDescriptionField.tooltip}
                            testId={`${testId}-help-patientDescription`}
                          />
                          <Textarea
                            id={`${testId}-patient-description-input`}
                            placeholder="Opis widoczny dla pacjenta"
                            value={exercise.patientDescription ?? ''}
                            onChange={(event) =>
                              handleChange({ patientDescription: event.target.value })
                            }
                            className="min-h-[60px] resize-none bg-surface-light border-border/50"
                            disabled={!canEditField('patientDescription')}
                            data-testid={`${testId}-patient-description-input`}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <EditableFieldLabel
                            htmlFor={`${testId}-clinical-description-input`}
                            label={clinicalDescriptionField.label}
                            tooltip={clinicalDescriptionField.tooltip}
                            testId={`${testId}-help-clinicalDescription`}
                          />
                          <Textarea
                            id={`${testId}-clinical-description-input`}
                            placeholder="Notatki kliniczne"
                            value={exercise.clinicalDescription ?? ''}
                            onChange={(event) =>
                              handleChange({ clinicalDescription: event.target.value })
                            }
                            className="min-h-[60px] resize-none bg-surface-light border-border/50"
                            disabled={!canEditField('clinicalDescription')}
                            data-testid={`${testId}-clinical-description-input`}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <EditableFieldLabel
                            htmlFor={`${testId}-audio-cue-input`}
                            label={audioCueField.label}
                            tooltip={audioCueField.tooltip}
                            testId={`${testId}-help-audioCue`}
                          />
                          <Input
                            id={`${testId}-audio-cue-input`}
                            placeholder="np. Wdech przy wznosie"
                            value={exercise.audioCue ?? ''}
                            onChange={(event) => handleChange({ audioCue: event.target.value })}
                            className="h-9 bg-surface-light border-border/50"
                            disabled={!canEditField('audioCue')}
                            data-testid={`${testId}-audio-cue-input`}
                          />
                        </div>
                      </>
                    ) : null}
                    <div className="sm:col-span-2">
                      <EditableFieldLabel
                        htmlFor={`${testId}-custom-name-input`}
                        label={customNameConfig.label}
                        tooltip={customNameConfig.tooltip}
                        testId={`${testId}-help-customName`}
                      />
                      <Input
                        id={`${testId}-custom-name-input`}
                        placeholder="Nadpisz nazwę dla pacjenta"
                        value={exercise.customName ?? ''}
                        onChange={(e) => handleChange({ customName: e.target.value })}
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('customName')}
                        data-testid={`${testId}-custom-name-input`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <EditableFieldLabel
                        htmlFor={`${testId}-custom-description-input`}
                        label={customDescriptionConfig.label}
                        tooltip={customDescriptionConfig.tooltip}
                        testId={`${testId}-help-customDescription`}
                      />
                      <Textarea
                        id={`${testId}-custom-description-input`}
                        placeholder="Opis dla pacjenta"
                        value={exercise.customDescription ?? ''}
                        onChange={(e) => handleChange({ customDescription: e.target.value })}
                        className="min-h-[60px] resize-none bg-surface-light border-border/50"
                        disabled={!canEditField('customDescription')}
                        data-testid={`${testId}-custom-description-input`}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-3 border-t border-border/30 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide">
                          Informacje z ćwiczenia
                        </p>
                        {onOpenDetails && (
                          <button
                            type="button"
                            onClick={onOpenDetails}
                            className="text-xs text-primary hover:underline"
                            data-testid={`${testId}-open-details-btn`}
                          >
                            Zobacz pełne szczegóły
                          </button>
                        )}
                      </div>

                      {inlineSourceFields.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  </div>
                )}
              </div>
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
          <ExercisePreviewDialog open={internalPreviewOpen} onOpenChange={setInternalPreviewOpen} exercise={exercise} />
        )}
      </div>
    </Collapsible>
  );
}
