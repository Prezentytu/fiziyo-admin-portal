'use client';

import { useState, useCallback, useMemo } from 'react';
import { Clock, Settings2, ChevronUp, ChevronDown, X, Eye, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LabeledStepper } from '@/components/shared/LabeledStepper';
import Image from 'next/image';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';
import { cn } from '@/lib/utils';
import {
  type ExerciseExecutionCardProps,
  type EditableField,
  isTimerExercise,
  isFieldEditable,
} from './types';
import {
  EXERCISE_FIELD_METADATA,
  HIDE_EXERCISE_TAGS,
  INLINE_EXERCISE_FIELD_ORDER,
  formatFieldValueWithPlaceholder,
} from './displayRegistry';
import { ExercisePreviewDialog } from './ExercisePreviewDialog';

const SIDE_OPTIONS = [
  { value: 'none', label: 'Bez podziału' },
  { value: 'both', label: 'Obie strony' },
  { value: 'left', label: 'Lewa strona' },
  { value: 'right', label: 'Prawa strona' },
  { value: 'alternating', label: 'Naprzemiennie' },
] as const;

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
  layoutVariant = 'default',
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
  const showTimerBadge = isTimerExercise(exercise);
  const shouldShowTimerBadge = showTimerBadge && !hideTimerBadge;
  const showReadableView = mode === 'view' && viewVariant === 'readable';
  const id = exercise.id;
  const testId = `${testIdPrefix}-${id}`;
  const imageUrl = getMediaUrl(exercise.thumbnailUrl ?? exercise.imageUrls?.[0]);
  const canUseInternalPreview = !onPreview;

  const canEditField = (field: EditableField) => canEdit && isFieldEditable(field, mode, editableFields);
  const setsField = EXERCISE_FIELD_METADATA.sets;
  const repsField = EXERCISE_FIELD_METADATA.reps;
  const executionTimeField = EXERCISE_FIELD_METADATA.executionTime;
  const restSetsField = EXERCISE_FIELD_METADATA.restSets;
  const loadField = EXERCISE_FIELD_METADATA.load;
  const notesField = EXERCISE_FIELD_METADATA.notes;
  const restRepsField = EXERCISE_FIELD_METADATA.restReps;
  const preparationTimeField = EXERCISE_FIELD_METADATA.preparationTime;
  const tempoField = EXERCISE_FIELD_METADATA.tempo;
  const sideField = EXERCISE_FIELD_METADATA.side;
  const customNameTooltip = 'Własna nazwa widoczna dla pacjenta w tym konkretnym planie.';
  const customDescriptionTooltip = 'Własny opis nadpisujący opis ćwiczenia tylko dla tego planu.';
  const inlineSourceFields = useMemo(
    () =>
      INLINE_EXERCISE_FIELD_ORDER.map((fieldKey) => {
        const field = EXERCISE_FIELD_METADATA[fieldKey];
        if (!field.isInlineVisible) return null;
        const value = formatFieldValueWithPlaceholder(field, exercise, field.group === 'content' ? 'Nie ustawiono' : '—');
        return { field, value };
      }).filter(
        (fieldData): fieldData is { field: (typeof EXERCISE_FIELD_METADATA)[keyof typeof EXERCISE_FIELD_METADATA]; value: string } =>
          fieldData !== null
      ),
    [exercise]
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
              const editDragHandle = dragHandle && (
                <div className="shrink-0 flex items-center">
                  {dragHandle}
                </div>
              );

              const editThumb = (
                <button
                  type="button"
                  className={cn(
                    'h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-light border border-border/60 relative group/thumb',
                    'cursor-pointer'
                  )}
                  onClick={handlePreviewTrigger}
                  aria-label="Otwórz podgląd ćwiczenia"
                  data-testid={`${testId}-thumbnail-btn`}
                >
                  {imageUrl ? (
                    <>
                      <Image src={imageUrl} alt="" fill className="object-cover" sizes="40px" />
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                        data-testid={`${testId}-preview-btn`}
                      >
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                        data-testid={`${testId}-preview-btn`}
                      >
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </>
                  )}
                </button>
              );

              const editName = (
                <div className="min-w-0 overflow-hidden flex-1">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p
                          className="font-medium text-sm text-foreground truncate"
                          data-testid={`${testId}-name`}
                        >
                          {exercise.displayName}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[300px] wrap-break-word">
                        {exercise.displayName}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {shouldShowTimerBadge && (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-primary font-medium">
                            <Clock className="h-3 w-3" />
                            Timer ({exercise.executionTime}s)
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[220px]">
                          Dla pacjenta w aplikacji mobilnej zostanie uruchomiony timer na czas jednego powtórzenia.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );

              const editSteppers = (
                <>
                  <div className={cn(layoutVariant === 'sidebar' ? 'shrink-0' : 'h-8 overflow-visible shrink-0 flex flex-col items-center justify-start')}>
                    <LabeledStepper
                      value={exercise.sets}
                      onChange={(v) => handleChange({ sets: v })}
                      label="SERIE"
                      infoTooltip={setsField.tooltip}
                      infoTestId={`${testId}-help-sets`}
                      min={1}
                      max={20}
                      disabled={!canEditField('sets')}
                    />
                  </div>
                  <div className={cn(layoutVariant === 'sidebar' ? 'shrink-0' : 'h-8 overflow-visible shrink-0 flex flex-col items-center justify-start')}>
                    <LabeledStepper
                      value={exercise.reps}
                      onChange={(v) => handleChange({ reps: v })}
                      label="POWT."
                      infoTooltip={repsField.tooltip}
                      infoTestId={`${testId}-help-reps`}
                      min={1}
                      max={100}
                      disabled={!canEditField('reps')}
                    />
                  </div>
                </>
              );

              const editActions = (
                <div
                  className={cn(
                    'flex items-center gap-1 shrink-0',
                    layoutVariant === 'sidebar' ? '' : '@[460px]:ml-0 ml-auto'
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-surface-light transition-colors data-[state=open]:bg-primary/10 data-[state=open]:text-primary cursor-pointer"
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
                  {onRemove && (
                    <button
                      type="button"
                      onClick={onRemove}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Usuń"
                      data-testid={`${testId}-remove-btn`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );

              if (layoutVariant === 'sidebar') {
                return (
                  <div className="w-full p-4 flex flex-col gap-4">
                    {/* Górny wiersz: Identyfikacja i akcje rozciągnięte na pełną szerokość */}
                    <div className="flex flex-row items-center gap-3 w-full">
                      {editDragHandle}
                      {editThumb}
                      {editName}
                      <div className="shrink-0 ml-auto pl-1">
                        {editActions}
                      </div>
                    </div>

                    {/* Dolny wiersz: Steppery wyśrodkowane i szeroko rozstawione dla idealnego balansu (złoty podział) */}
                    <div className="flex flex-row items-center justify-center gap-10 sm:gap-12 w-full pt-1 pb-1">
                      {editSteppers}
                    </div>
                  </div>
                );
              }

              return (
                <div className="w-full p-4 flex flex-col gap-3 @[460px]:flex-row @[460px]:gap-2 @[460px]:items-center">
                  <div
                    className="grid items-center gap-2 @[460px]:flex-1 @[460px]:min-w-0"
                    style={{ gridTemplateColumns: dragHandle ? 'auto auto 1fr' : 'auto 1fr' }}
                  >
                    {editDragHandle}
                    {editThumb}
                    {editName}
                  </div>
                  <div className="flex shrink-0 gap-3 items-start">
                    {editSteppers}
                    {editActions}
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
                className={cn(
                  'h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-light border border-border/60 relative group/thumb',
                  'cursor-pointer'
                )}
                onClick={handlePreviewTrigger}
                aria-label="Otwórz podgląd ćwiczenia"
                data-testid={`${testId}-thumbnail-btn`}
              >
                {imageUrl ? (
                  <>
                    <Image src={imageUrl} alt="" fill className="object-cover" sizes="48px" />
                    <div
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                      data-testid={`${testId}-preview-btn`}
                    >
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
                    <div
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                      data-testid={`${testId}-preview-btn`}
                    >
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                  </>
                )}
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
                    {exercise.executionTime != null && exercise.executionTime > 0
                      ? ` • Czas powtórzenia: ${exercise.executionTime}s`
                      : ''}
                  </p>
                ) : shouldShowTimerBadge ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-primary font-medium">
                          <Clock className="h-3 w-3" />
                          Timer ({exercise.executionTime}s)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[220px]">
                        Dla pacjenta w aplikacji mobilnej zostanie uruchomiony timer na czas jednego powtórzenia.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
            </div>
            {/* Right: dosage summary */}
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
                {shouldShowTimerBadge && exercise.executionTime != null && (
                  <>
                    <div className="hidden sm:block text-muted-foreground/30 h-4 w-px bg-border/50"></div>
                    <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-1.5 w-full sm:w-auto">
                      <span className="text-[10px] sm:hidden text-muted-foreground uppercase font-bold tracking-wide">
                        Czas powtórzenia
                      </span>
                      <span className="text-primary tabular-nums">{exercise.executionTime}s</span>
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
            <div className="w-full border-t border-border bg-surface/50 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    value={exercise.executionTime ?? ''}
                    onChange={(e) =>
                      handleChange({
                        executionTime: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
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
                    value={exercise.restSets ?? ''}
                    onChange={(e) =>
                      handleChange({ restSets: e.target.value ? Number(e.target.value) : undefined })
                    }
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
                    value={exercise.loadKg ?? ''}
                    onChange={(e) =>
                      handleChange({
                        loadKg: e.target.value ? Number(e.target.value) : undefined,
                        loadDisplayText: e.target.value ? `${e.target.value} kg` : undefined,
                      })
                    }
                    className="h-9 bg-surface-light border-border/50 focus:border-primary"
                    disabled={!canEditField('loadKg')}
                    data-testid={`${testId}-load-input`}
                  />
                </div>
              </div>
              <div>
                <EditableFieldLabel
                  htmlFor={`${testId}-notes-input`}
                  label="Notatka dla pacjenta"
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
                        value={exercise.restReps ?? ''}
                        onChange={(e) =>
                          handleChange({ restReps: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('restReps')}
                        data-testid={`${testId}-rest-reps-input`}
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
                        max={120}
                        value={exercise.preparationTime ?? ''}
                        onChange={(e) =>
                          handleChange({
                            preparationTime: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('preparationTime')}
                        data-testid={`${testId}-preparation-time-input`}
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
                        label={sideField.label}
                        tooltip={sideField.tooltip}
                        labelId={`${testId}-side-label`}
                        testId={`${testId}-help-side`}
                      />
                      <Select
                        value={(exercise.side ?? 'none').toLowerCase()}
                        onValueChange={(v) => handleChange({ side: v })}
                        disabled={!canEditField('side')}
                      >
                        <SelectTrigger className="h-9 bg-surface-light border-border/50" aria-labelledby={`${testId}-side-label`}>
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                        <SelectContent>
                          {SIDE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <EditableFieldLabel
                        htmlFor={`${testId}-custom-name-input`}
                        label="Własna nazwa"
                        tooltip={customNameTooltip}
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
                        label="Własny opis"
                        tooltip={customDescriptionTooltip}
                        testId={`${testId}-help-customDescription`}
                      />
                      <Textarea
                        id={`${testId}-custom-description-input`}
                        placeholder="Opis dla pacjenta (opcjonalnie)"
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
