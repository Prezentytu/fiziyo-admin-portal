'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { calculateExerciseTotalSeconds, formatExerciseDuration } from '@/utils/exerciseTime';
import { DirtyDot } from '@/components/shared/enrichment/DirtyDot';
import {
  DIFFICULTY_OPTIONS,
  EXERCISE_FIELD_EDIT_CONFIG,
  EXERCISE_FIELD_METADATA,
  SIDE_OPTIONS,
  buildParamTestId,
  type ExerciseFieldEditConfig,
  type ExerciseFieldKey,
} from '@/components/shared/exercise';
import type { ExerciseCoreDraft } from './useExerciseEditorForm';

type NumericDraftField =
  | 'sets'
  | 'reps'
  | 'executionTime'
  | 'restSets'
  | 'restReps'
  | 'preparationTime'
  | 'loadKg'
  | 'duration';
type TextDraftField = 'tempo' | 'rangeOfMotion';

export type ExerciseParametersEditorVariant = 'full' | 'create';

interface ExerciseParametersEditorProps {
  core: ExerciseCoreDraft;
  isDirtyField: (field: keyof ExerciseCoreDraft) => boolean;
  onNumberChange: (field: NumericDraftField, value: number | null) => void;
  onTextChange: (field: TextDraftField, value: string) => void;
  onSideChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  /** Blokuje edycję (np. status weryfikacji), zachowując layout. */
  disabled?: boolean;
  /**
   * `full` — wszystkie parametry (detal / dialog / weryfikacja).
   * `create` — TIER 1–2 widoczne; TIER 3–4 w collapsible (lean create).
   */
  variant?: ExerciseParametersEditorVariant;
}

function InfoTooltip({ label, testId }: Readonly<{ label: string; testId: string }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
          aria-label={`Informacja: ${label}`}
          data-testid={testId}
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function FieldLabel({
  label,
  tooltip,
  dirty,
  htmlFor,
  infoTestId,
}: Readonly<{ label: string; tooltip: string; dirty: boolean; htmlFor?: string; infoTestId: string }>) {
  return (
    <div className="flex items-center gap-1">
      <Label className="text-xs text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </Label>
      <InfoTooltip label={tooltip} testId={infoTestId} />
      <DirtyDot active={dirty} className="ml-0.5" />
    </div>
  );
}

function draftKeyForField(fieldKey: ExerciseFieldKey): keyof ExerciseCoreDraft {
  if (fieldKey === 'load') return 'loadKg';
  if (fieldKey === 'side') return 'side';
  return fieldKey as keyof ExerciseCoreDraft;
}

function NumberField({
  config,
  value,
  dirty,
  disabled,
  onCommit,
}: Readonly<{
  config: ExerciseFieldEditConfig;
  value: number | null;
  dirty: boolean;
  disabled?: boolean;
  onCommit: (field: NumericDraftField, value: number | null) => void;
}>) {
  const [raw, setRaw] = useState(value != null ? String(value) : '');
  const metadata = EXERCISE_FIELD_METADATA[config.key];
  const draftField = draftKeyForField(config.key) as NumericDraftField;
  const inputTestId = buildParamTestId(config.key, 'input');

  useEffect(() => {
    setRaw(value != null ? String(value) : '');
  }, [value]);

  const commit = () => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (value !== null) onCommit(draftField, null);
      return;
    }
    const parsed = Number(trimmed);
    const next = Number.isNaN(parsed) ? null : parsed;
    if (next !== value) onCommit(draftField, next);
  };

  return (
    <div className="space-y-1">
      <FieldLabel
        label={metadata.label}
        tooltip={metadata.tooltip}
        dirty={dirty}
        htmlFor={`exercise-param-${config.key}`}
        infoTestId={buildParamTestId(config.key, 'info')}
      />
      <div className="relative">
        <Input
          id={`exercise-param-${config.key}`}
          type="number"
          inputMode="numeric"
          min={config.min}
          max={config.max}
          step={config.step}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          disabled={disabled}
          className={cn(
            'h-9 text-sm tabular-nums transition-colors',
            config.suffix && 'pr-10',
            dirty && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
          )}
          data-testid={inputTestId}
        />
        {config.suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {config.suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function TextField({
  config,
  value,
  dirty,
  disabled,
  placeholder,
  onChange,
}: Readonly<{
  config: ExerciseFieldEditConfig;
  value: string;
  dirty: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange: (field: TextDraftField, value: string) => void;
}>) {
  const metadata = EXERCISE_FIELD_METADATA[config.key];
  const draftField = draftKeyForField(config.key) as TextDraftField;

  return (
    <div className="space-y-1">
      <FieldLabel
        label={metadata.label}
        tooltip={metadata.tooltip}
        dirty={dirty}
        htmlFor={`exercise-param-${config.key}`}
        infoTestId={buildParamTestId(config.key, 'info')}
      />
      <Input
        id={`exercise-param-${config.key}`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(draftField, event.target.value)}
        disabled={disabled}
        className={cn(
          'h-9 text-sm transition-colors',
          dirty && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
        )}
        data-testid={buildParamTestId(config.key, 'input')}
      />
    </div>
  );
}

function ComputedChip({
  label,
  value,
  tooltip,
  testId,
}: Readonly<{ label: string; value: string; tooltip: string; testId: string }>) {
  return (
    <div className="rounded-xl bg-surface p-4 shadow-sm" data-testid={testId}>
      <div className="mb-1.5 flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <InfoTooltip label={tooltip} testId={`${testId}-info`} />
      </div>
      <p className="text-xl font-bold leading-tight tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function renderNumberFields(
  keys: ExerciseFieldKey[],
  core: ExerciseCoreDraft,
  isDirtyField: (field: keyof ExerciseCoreDraft) => boolean,
  disabled: boolean,
  onNumberChange: (field: NumericDraftField, value: number | null) => void
) {
  return keys.map((key) => {
    const config = EXERCISE_FIELD_EDIT_CONFIG[key];
    const draftKey = draftKeyForField(key);
    const value = core[draftKey];
    return (
      <NumberField
        key={key}
        config={config}
        value={typeof value === 'number' || value === null ? value : null}
        dirty={isDirtyField(draftKey)}
        disabled={disabled}
        onCommit={onNumberChange}
      />
    );
  });
}

export function ExerciseParametersEditor({
  core,
  isDirtyField,
  onNumberChange,
  onTextChange,
  onSideChange,
  onDifficultyChange,
  disabled = false,
  variant = 'full',
}: Readonly<ExerciseParametersEditorProps>) {
  const [advancedOpen, setAdvancedOpen] = useState(variant === 'full');
  const isTimeBased = (core.executionTime ?? 0) > 0;

  const seriesSeconds = calculateExerciseTotalSeconds({
    sets: 1,
    reps: core.reps ?? undefined,
    duration: core.duration ?? undefined,
    executionTime: core.executionTime ?? undefined,
    restReps: core.restReps ?? undefined,
    restSets: 0,
    preparationTime: 0,
    tempo: core.tempo || undefined,
    side: core.side || undefined,
  });

  const totalSeconds = calculateExerciseTotalSeconds({
    sets: core.sets ?? 0,
    reps: core.reps ?? undefined,
    duration: core.duration ?? undefined,
    executionTime: core.executionTime ?? undefined,
    restSets: core.restSets ?? undefined,
    restReps: core.restReps ?? undefined,
    preparationTime: core.preparationTime ?? undefined,
    tempo: core.tempo || undefined,
    side: core.side || undefined,
  });

  const dosageKeys = useMemo(
    () => ['sets', 'reps', 'executionTime', 'load', 'restSets'] as ExerciseFieldKey[],
    []
  );
  const timingKeys = useMemo(() => ['restReps', 'preparationTime'] as ExerciseFieldKey[], []);
  const showAdvancedCollapsed = variant === 'create';

  const timingAndAdvancedSection = (
    <>
      <div className="rounded-2xl border border-border/40 bg-surface/50 p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Tempo, przerwy i zakres ruchu
        </p>
        <div className="grid grid-cols-2 gap-3">
          {renderNumberFields(timingKeys, core, isDirtyField, disabled, onNumberChange)}
          <TextField
            config={EXERCISE_FIELD_EDIT_CONFIG.tempo}
            value={core.tempo}
            dirty={isDirtyField('tempo')}
            disabled={disabled}
            placeholder="np. 3-0-1-0"
            onChange={onTextChange}
          />
          <TextField
            config={EXERCISE_FIELD_EDIT_CONFIG.rangeOfMotion}
            value={core.rangeOfMotion}
            dirty={isDirtyField('rangeOfMotion')}
            disabled={disabled}
            placeholder="np. 0–90°"
            onChange={onTextChange}
          />
          <NumberField
            config={EXERCISE_FIELD_EDIT_CONFIG.duration}
            value={core.duration}
            dirty={isDirtyField('duration')}
            disabled={disabled}
            onCommit={onNumberChange}
          />
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          „Czas serii” to override time-based (legacy). W większości przypadków wystarczy „Czas powtórzenia” —
          czas serii jest wyliczany powyżej.
        </p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-surface/50 p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Pozycja i klasyfikacja
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">{EXERCISE_FIELD_METADATA.side.label}</Label>
              <InfoTooltip
                label={EXERCISE_FIELD_METADATA.side.tooltip}
                testId={buildParamTestId('side', 'info')}
              />
              <DirtyDot active={isDirtyField('side')} className="ml-0.5" />
            </div>
            <Select value={core.side} onValueChange={onSideChange} disabled={disabled}>
              <SelectTrigger
                className={cn(
                  'h-9 text-sm transition-colors',
                  isDirtyField('side') &&
                    'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
                )}
                data-testid={buildParamTestId('side', 'select')}
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
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">
                {EXERCISE_FIELD_METADATA.difficultyLevel.label}
              </Label>
              <InfoTooltip
                label={EXERCISE_FIELD_METADATA.difficultyLevel.tooltip}
                testId={buildParamTestId('difficultyLevel', 'info')}
              />
              <DirtyDot active={isDirtyField('difficultyLevel')} className="ml-0.5" />
            </div>
            <Select value={core.difficultyLevel} onValueChange={onDifficultyChange} disabled={disabled}>
              <SelectTrigger
                className={cn(
                  'h-9 text-sm transition-colors',
                  isDirtyField('difficultyLevel') &&
                    'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
                )}
                data-testid={buildParamTestId('difficultyLevel', 'select')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Podstawowe parametry</p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                isTimeBased ? 'bg-primary/15 text-primary' : 'bg-surface-light/60 text-muted-foreground'
              )}
              data-testid="exercise-param-mode-indicator"
            >
              {isTimeBased ? 'Z timerem' : 'Bez timera'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderNumberFields(dosageKeys, core, isDirtyField, disabled, onNumberChange)}
          </div>

          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <Info className="h-3 w-3 shrink-0" />
            {isTimeBased
              ? 'Timer w aplikacji pacjenta jest aktywny, bo podano czas powtórzenia. Wyczyść to pole, aby wyłączyć timer.'
              : 'Podaj „Czas powtórzenia”, aby uruchomić timer w aplikacji pacjenta.'}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <ComputedChip
              label="Czas serii"
              value={
                seriesSeconds.seconds > 0
                  ? formatExerciseDuration(seriesSeconds.seconds, seriesSeconds.isEstimate)
                  : '—'
              }
              tooltip="Wartość wyliczana: powtórzenia × czas powtórzenia + mikroprzerwy. Nieedytowalna."
              testId="exercise-param-series-time"
            />
            <ComputedChip
              label="Czas trwania ćwiczenia"
              value={
                totalSeconds.seconds > 0
                  ? formatExerciseDuration(totalSeconds.seconds, totalSeconds.isEstimate)
                  : '—'
              }
              tooltip="Wartość wyliczana: wszystkie serie + przerwy + przygotowanie. Nieedytowalna."
              testId="exercise-param-total-time"
            />
          </div>
        </div>

        {showAdvancedCollapsed ? (
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger
              className="flex w-full items-center justify-between rounded-2xl border border-border/40 bg-surface/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
              data-testid="exercise-param-advanced-toggle"
            >
              <span>Zaawansowane parametry</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', advancedOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">{timingAndAdvancedSection}</CollapsibleContent>
          </Collapsible>
        ) : (
          timingAndAdvancedSection
        )}
      </div>
    </TooltipProvider>
  );
}
