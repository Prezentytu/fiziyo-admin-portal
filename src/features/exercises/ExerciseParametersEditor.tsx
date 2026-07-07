'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { calculateExerciseTotalSeconds, formatExerciseDuration } from '@/utils/exerciseTime';
import { DirtyDot } from '@/components/shared/enrichment/DirtyDot';
import type { ExerciseCoreDraft } from './useExerciseEditorForm';

const SIDE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'Bez podziału' },
  { value: 'left', label: 'Lewa strona' },
  { value: 'right', label: 'Prawa strona' },
  { value: 'both', label: 'Obie strony' },
  { value: 'alternating', label: 'Naprzemiennie' },
];

const DIFFICULTY_OPTIONS: { value: string; label: string }[] = [
  { value: 'UNKNOWN', label: 'Nieokreślony' },
  { value: 'EASY', label: 'Łatwy' },
  { value: 'MEDIUM', label: 'Średni' },
  { value: 'HARD', label: 'Trudny' },
  { value: 'EXPERT', label: 'Ekspert' },
];

type NumericField = 'sets' | 'reps' | 'executionTime' | 'restSets' | 'restReps' | 'preparationTime' | 'loadKg';
type TextField = 'tempo' | 'rangeOfMotion';

interface ExerciseParametersEditorProps {
  core: ExerciseCoreDraft;
  isDirtyField: (field: keyof ExerciseCoreDraft) => boolean;
  onNumberChange: (field: NumericField, value: number | null) => void;
  onTextChange: (field: TextField, value: string) => void;
  onSideChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  /** Blokuje edycję (np. status weryfikacji uniemożliwiający zmiany), zachowując layout. */
  disabled?: boolean;
}

interface NumberFieldConfig {
  field: NumericField;
  label: string;
  tooltip: string;
  suffix?: string;
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

function NumberField({
  config,
  value,
  dirty,
  disabled,
  onCommit,
}: Readonly<{
  config: NumberFieldConfig;
  value: number | null;
  dirty: boolean;
  disabled?: boolean;
  onCommit: (field: NumericField, value: number | null) => void;
}>) {
  const [raw, setRaw] = useState(value != null ? String(value) : '');

  useEffect(() => {
    setRaw(value != null ? String(value) : '');
  }, [value]);

  const commit = () => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (value !== null) onCommit(config.field, null);
      return;
    }
    const parsed = Number(trimmed);
    const next = Number.isNaN(parsed) ? null : parsed;
    if (next !== value) onCommit(config.field, next);
  };

  return (
    <div className="space-y-1">
      <FieldLabel
        label={config.label}
        tooltip={config.tooltip}
        dirty={dirty}
        htmlFor={`exercise-param-${config.field}`}
        infoTestId={`exercise-param-${config.field}-info`}
      />
      <div className="relative">
        <Input
          id={`exercise-param-${config.field}`}
          type="number"
          inputMode="numeric"
          min={0}
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
          data-testid={`exercise-param-${config.field}-input`}
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

export function ExerciseParametersEditor({
  core,
  isDirtyField,
  onNumberChange,
  onTextChange,
  onSideChange,
  onDifficultyChange,
  disabled = false,
}: Readonly<ExerciseParametersEditorProps>) {
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

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Dawkowanie</p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                isTimeBased
                  ? 'bg-primary/15 text-primary'
                  : 'bg-surface-light/60 text-muted-foreground'
              )}
              data-testid="exercise-param-mode-indicator"
            >
              {isTimeBased ? 'Czasowe' : 'Powtórzeniowe'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              config={{ field: 'sets', label: 'Serie', tooltip: 'Ile pełnych serii pacjent ma wykonać w jednej sesji.' }}
              value={core.sets}
              dirty={isDirtyField('sets')}
              disabled={disabled}
              onCommit={onNumberChange}
            />
            <NumberField
              config={{ field: 'reps', label: 'Powtórzenia', tooltip: 'Ile powtórzeń pacjent wykonuje w każdej serii.' }}
              value={core.reps}
              dirty={isDirtyField('reps')}
              disabled={disabled}
              onCommit={onNumberChange}
            />
            <NumberField
              config={{
                field: 'executionTime',
                label: 'Czas 1 powtórzenia',
                tooltip:
                  'Czas jednego powtórzenia. Podanie wartości > 0 automatycznie czyni ćwiczenie czasowym i uruchamia timer w aplikacji pacjenta.',
                suffix: 's',
              }}
              value={core.executionTime}
              dirty={isDirtyField('executionTime')}
              disabled={disabled}
              onCommit={onNumberChange}
            />
            <NumberField
              config={{
                field: 'loadKg',
                label: 'Obciążenie',
                tooltip: 'Docelowe obciążenie w kilogramach. Zostaw puste dla ćwiczeń z masą własnego ciała.',
                suffix: 'kg',
              }}
              value={core.loadKg}
              dirty={isDirtyField('loadKg')}
              disabled={disabled}
              onCommit={onNumberChange}
            />
          </div>

          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <Info className="h-3 w-3 shrink-0" />
            {isTimeBased
              ? 'Ćwiczenie jest czasowe, bo podano czas powtórzenia. Wyczyść to pole, aby wróciło do trybu powtórzeniowego.'
              : 'Podaj „Czas 1 powtórzenia”, aby ćwiczenie stało się czasowe (timer u pacjenta).'}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <ComputedChip
              label="Czas serii"
              value={
                seriesSeconds.seconds > 0 ? formatExerciseDuration(seriesSeconds.seconds, seriesSeconds.isEstimate) : '—'
              }
              tooltip="Wartość wyliczana: powtórzenia × czas powtórzenia + mikroprzerwy. Nieedytowalna."
              testId="exercise-param-series-time"
            />
            <ComputedChip
              label="Czas trwania ćwiczenia"
              value={
                totalSeconds.seconds > 0 ? formatExerciseDuration(totalSeconds.seconds, totalSeconds.isEstimate) : '—'
              }
              tooltip="Wartość wyliczana: wszystkie serie + przerwy + przygotowanie. Nieedytowalna."
              testId="exercise-param-total-time"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-surface/50 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Tempo, przerwy i zakres ruchu
          </p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              config={{
                field: 'restSets',
                label: 'Przerwa między seriami',
                tooltip: 'Przerwa po zakończeniu serii, zanim pacjent rozpocznie następną.',
                suffix: 's',
              }}
              value={core.restSets}
              dirty={isDirtyField('restSets')}
              disabled={disabled}
              onCommit={onNumberChange}
            />
            <NumberField
              config={{
                field: 'restReps',
                label: 'Przerwa między powt.',
                tooltip: 'Krótka mikro-przerwa między pojedynczymi powtórzeniami.',
                suffix: 's',
              }}
              value={core.restReps}
              dirty={isDirtyField('restReps')}
              disabled={disabled}
              onCommit={onNumberChange}
            />
            <NumberField
              config={{
                field: 'preparationTime',
                label: 'Czas przygotowania',
                tooltip: 'Czas na ustawienie pozycji przed startem ruchu.',
                suffix: 's',
              }}
              value={core.preparationTime}
              dirty={isDirtyField('preparationTime')}
              disabled={disabled}
              onCommit={onNumberChange}
            />
            <div className="space-y-1">
              <FieldLabel
                label="Tempo"
                tooltip="Tempo ruchu, np. 3-0-1-0. Pomaga utrzymać kontrolę i jakość wykonania."
                dirty={isDirtyField('tempo')}
                htmlFor="exercise-param-tempo"
                infoTestId="exercise-param-tempo-info"
              />
              <Input
                id="exercise-param-tempo"
                value={core.tempo}
                placeholder="np. 3-0-1-0"
                onChange={(event) => onTextChange('tempo', event.target.value)}
                disabled={disabled}
                className={cn(
                  'h-9 text-sm transition-colors',
                  isDirtyField('tempo') && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
                )}
                data-testid="exercise-param-tempo-input"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel
                label="Zakres ruchu (ROM)"
                tooltip="Docelowy zakres ruchu (ROM), który pacjent powinien osiągnąć."
                dirty={isDirtyField('rangeOfMotion')}
                htmlFor="exercise-param-rom"
                infoTestId="exercise-param-rom-info"
              />
              <Input
                id="exercise-param-rom"
                value={core.rangeOfMotion}
                placeholder="np. 0–90°"
                onChange={(event) => onTextChange('rangeOfMotion', event.target.value)}
                disabled={disabled}
                className={cn(
                  'h-9 text-sm transition-colors',
                  isDirtyField('rangeOfMotion') &&
                    'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
                )}
                data-testid="exercise-param-rom-input"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-surface/50 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Pozycja i klasyfikacja
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Strona ciała</Label>
                <DirtyDot active={isDirtyField('side')} className="ml-0.5" />
              </div>
              <Select value={core.side} onValueChange={onSideChange} disabled={disabled}>
                <SelectTrigger
                  className={cn(
                    'h-9 text-sm transition-colors',
                    isDirtyField('side') && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
                  )}
                  data-testid="exercise-param-side-select"
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
                <Label className="text-xs text-muted-foreground">Poziom trudności</Label>
                <DirtyDot active={isDirtyField('difficultyLevel')} className="ml-0.5" />
              </div>
              <Select value={core.difficultyLevel} onValueChange={onDifficultyChange} disabled={disabled}>
                <SelectTrigger
                  className={cn(
                    'h-9 text-sm transition-colors',
                    isDirtyField('difficultyLevel') &&
                      'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
                  )}
                  data-testid="exercise-param-difficulty-select"
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
      </div>
    </TooltipProvider>
  );
}
