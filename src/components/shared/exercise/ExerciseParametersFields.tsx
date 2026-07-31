'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { DirtyDot } from '@/components/shared/enrichment/DirtyDot';
import { cn } from '@/lib/utils';
import { calculateExerciseTotalSeconds, formatExerciseDuration } from '@/utils/exerciseTime';
import type { ExerciseFieldKey } from './displayRegistry';
import {
  EXERCISE_FIELD_METADATA,
  formatDifficultyLabel,
  formatSideLabel,
} from './displayRegistry';
import {
  DIFFICULTY_OPTIONS,
  MAPPING_ONLY_FIELD_CONFIG,
  SIDE_OPTIONS,
  buildParamTestId,
  getParameterSections,
  type ExerciseFieldEditConfig,
  type ExerciseFieldSurface,
  type MappingOnlyFieldKey,
  type ResolvedParameterField,
} from './fieldContract';

/** Normalized values for the shared parameter presentation layer. */
export interface ExerciseParameterValues {
  sets?: number | null;
  reps?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  duration?: number | null;
  loadKg?: number | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  side?: string | null;
  difficultyLevel?: string | null;
  patientDescription?: string | null;
  clinicalDescription?: string | null;
  audioCue?: string | null;
  notes?: string | null;
  customName?: string | null;
  customDescription?: string | null;
}

export type ParameterTestIdKind = 'input' | 'select' | 'info';

export interface ExerciseParametersFieldsProps {
  surface: ExerciseFieldSurface;
  values: ExerciseParameterValues;
  onChange: (patch: Partial<ExerciseParameterValues>) => void;
  inheritedValues?: Partial<ExerciseParameterValues>;
  isDirtyField?: (key: ExerciseFieldKey) => boolean;
  omitFields?: readonly ExerciseFieldKey[];
  showContentSection?: boolean;
  showMappingOnlyFields?: boolean;
  advancedDefaultOpen?: boolean;
  /** When false, advanced sections render expanded without a collapsible toggle (edit full layout). */
  collapseAdvanced?: boolean;
  density?: 'comfortable' | 'compact';
  templateHref?: string;
  testIdFor?: (key: ExerciseFieldKey | MappingOnlyFieldKey, kind: ParameterTestIdKind) => string;
  /**
   * Prefix for structural testids (advanced toggle, inherited section, mode indicator).
   * Field inputs use testIdFor / buildParamTestId instead.
   */
  structuralTestIdPrefix?: string;
  disabled?: boolean;
  className?: string;
  /** Extra content rendered after advanced sections (e.g. source info tiles). */
  advancedFooter?: React.ReactNode;
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
  inherited,
}: Readonly<{
  label: string;
  tooltip: string;
  dirty: boolean;
  htmlFor?: string;
  infoTestId: string;
  inherited?: boolean;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Label className="text-xs text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </Label>
      <InfoTooltip label={tooltip} testId={infoTestId} />
      {inherited ? (
        <Badge variant="outline" className="ml-0.5 text-[10px] font-normal normal-case">
          odziedziczone
        </Badge>
      ) : null}
      <DirtyDot active={dirty} className="ml-0.5" />
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

function NumberField({
  config,
  value,
  dirty,
  disabled,
  density,
  inherited,
  testId,
  infoTestId,
  onCommit,
}: Readonly<{
  config: ExerciseFieldEditConfig;
  value: number | null | undefined;
  dirty: boolean;
  disabled?: boolean;
  density: 'comfortable' | 'compact';
  inherited?: boolean;
  testId: string;
  infoTestId: string;
  onCommit: (value: number | null) => void;
}>) {
  const [raw, setRaw] = useState(value != null ? String(value) : '');
  const metadata = EXERCISE_FIELD_METADATA[config.key];

  useEffect(() => {
    setRaw(value != null ? String(value) : '');
  }, [value]);

  const commit = () => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (value != null) onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    const next = Number.isNaN(parsed) ? null : parsed;
    if (next !== value) onCommit(next);
  };

  return (
    <div className="space-y-1">
      <FieldLabel
        label={metadata.label}
        tooltip={metadata.tooltip}
        dirty={dirty}
        htmlFor={testId}
        infoTestId={infoTestId}
        inherited={inherited}
      />
      <div className="relative">
        <Input
          data-testid={testId}
          id={testId}
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
            'text-sm tabular-nums transition-colors',
            density === 'comfortable' ? 'h-11' : 'h-9',
            config.suffix && 'pr-10',
            dirty && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
          )}
        />
        {config.suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {config.suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TextField({
  config,
  value,
  dirty,
  disabled,
  density,
  inherited,
  placeholder,
  testId,
  infoTestId,
  onChange,
}: Readonly<{
  config: ExerciseFieldEditConfig;
  value: string;
  dirty: boolean;
  disabled?: boolean;
  density: 'comfortable' | 'compact';
  inherited?: boolean;
  placeholder?: string;
  testId: string;
  infoTestId: string;
  onChange: (value: string) => void;
}>) {
  const metadata = EXERCISE_FIELD_METADATA[config.key];

  return (
    <div className="space-y-1">
      <FieldLabel
        label={metadata.label}
        tooltip={metadata.tooltip}
        dirty={dirty}
        htmlFor={testId}
        infoTestId={infoTestId}
        inherited={inherited}
      />
      <Input
        data-testid={testId}
        id={testId}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          'text-sm transition-colors',
          density === 'comfortable' ? 'h-11' : 'h-9',
          dirty && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
        )}
      />
    </div>
  );
}

function TextAreaField({
  config,
  value,
  dirty,
  disabled,
  inherited,
  placeholder,
  testId,
  infoTestId,
  onChange,
}: Readonly<{
  config: ExerciseFieldEditConfig;
  value: string;
  dirty: boolean;
  disabled?: boolean;
  inherited?: boolean;
  placeholder?: string;
  testId: string;
  infoTestId: string;
  onChange: (value: string) => void;
}>) {
  const metadata = EXERCISE_FIELD_METADATA[config.key];

  return (
    <div className="space-y-1 @[460px]:col-span-2">
      <FieldLabel
        label={metadata.label}
        tooltip={metadata.tooltip}
        dirty={dirty}
        htmlFor={testId}
        infoTestId={infoTestId}
        inherited={inherited}
      />
      <Textarea
        data-testid={testId}
        id={testId}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          'min-h-[60px] resize-none text-sm transition-colors',
          dirty && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
        )}
      />
    </div>
  );
}

function SelectField({
  config,
  value,
  dirty,
  disabled,
  density,
  inherited,
  testId,
  infoTestId,
  onChange,
}: Readonly<{
  config: ExerciseFieldEditConfig;
  value: string;
  dirty: boolean;
  disabled?: boolean;
  density: 'comfortable' | 'compact';
  inherited?: boolean;
  testId: string;
  infoTestId: string;
  onChange: (value: string) => void;
}>) {
  const metadata = EXERCISE_FIELD_METADATA[config.key];
  const options = config.options ?? (config.key === 'side' ? SIDE_OPTIONS : DIFFICULTY_OPTIONS);

  return (
    <div className="space-y-1">
      <FieldLabel
        label={metadata.label}
        tooltip={metadata.tooltip}
        dirty={dirty}
        infoTestId={infoTestId}
        inherited={inherited}
      />
      <Select value={value} onValueChange={onChange} disabled={disabled} data-testid={testId}>
        <SelectTrigger
          data-testid={testId}
          className={cn(
            'text-sm transition-colors',
            density === 'comfortable' ? 'h-11' : 'h-9',
            dirty && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InheritedReadonlyField({
  fieldKey,
  value,
  testIdPrefix,
}: Readonly<{
  fieldKey: ExerciseFieldKey;
  value: string;
  testIdPrefix: string;
}>) {
  return (
    <div
      className="rounded-md border border-border/30 bg-background/60 px-2.5 py-2"
      data-testid={`${testIdPrefix}-inherited-${fieldKey}`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
          {EXERCISE_FIELD_METADATA[fieldKey].label}
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          odziedziczone
        </span>
      </div>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  );
}

function readNumeric(values: ExerciseParameterValues, key: ExerciseFieldKey): number | null {
  if (key === 'load') return values.loadKg ?? null;
  const value = values[key as keyof ExerciseParameterValues];
  return typeof value === 'number' ? value : value == null ? null : null;
}

function readText(values: ExerciseParameterValues, key: ExerciseFieldKey): string {
  if (key === 'load') return values.loadKg != null ? String(values.loadKg) : '';
  const value = values[key as keyof ExerciseParameterValues];
  return typeof value === 'string' ? value : '';
}

function formatInheritedDisplay(key: ExerciseFieldKey, values: ExerciseParameterValues): string {
  if (key === 'side') return formatSideLabel(values.side ?? undefined) || '—';
  if (key === 'difficultyLevel') return formatDifficultyLabel(values.difficultyLevel ?? undefined) || '—';
  if (key === 'load') return values.loadKg != null ? `${values.loadKg} kg` : '—';
  const value = values[key as keyof ExerciseParameterValues];
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim() || '—';
  return '—';
}

function isInheritedMatch(
  key: ExerciseFieldKey,
  values: ExerciseParameterValues,
  inheritedValues?: Partial<ExerciseParameterValues>
): boolean {
  if (!inheritedValues) return false;
  if (key === 'load') return values.loadKg === inheritedValues.loadKg;
  const current = values[key as keyof ExerciseParameterValues];
  const inherited = inheritedValues[key as keyof ExerciseParameterValues];
  return current === inherited;
}

export function ExerciseParametersFields({
  surface,
  values,
  onChange,
  inheritedValues,
  isDirtyField,
  omitFields,
  showContentSection = false,
  showMappingOnlyFields = false,
  advancedDefaultOpen = false,
  collapseAdvanced = true,
  density = 'compact',
  templateHref,
  testIdFor,
  structuralTestIdPrefix = 'exercise-param',
  disabled = false,
  className,
  advancedFooter,
}: Readonly<ExerciseParametersFieldsProps>) {
  const [advancedOpen, setAdvancedOpen] = useState(advancedDefaultOpen || !collapseAdvanced);
  const resolveTestId = (key: ExerciseFieldKey | MappingOnlyFieldKey, kind: ParameterTestIdKind) => {
    if (testIdFor) return testIdFor(key, kind);
    if (key === 'customName' || key === 'customDescription') {
      return `exercise-param-${key}-${kind === 'info' ? 'info' : 'input'}`;
    }
    return buildParamTestId(key, kind);
  };
  const structuralId = (suffix: string) => `${structuralTestIdPrefix}-${suffix}`;

  const sections = useMemo(
    () =>
      getParameterSections(surface, {
        includeContent: showContentSection,
        omitFields,
      }),
    [surface, showContentSection, omitFields]
  );

  const basicSection = sections.find((section) => section.id === 'basic');
  const contentSection = sections.find((section) => section.id === 'content');
  const advancedSections = sections.filter((section) => section.advanced);

  const isTimeBased = (values.executionTime ?? 0) > 0;

  const seriesSeconds = calculateExerciseTotalSeconds({
    sets: 1,
    reps: values.reps ?? undefined,
    duration: values.duration ?? undefined,
    executionTime: values.executionTime ?? undefined,
    restReps: values.restReps ?? undefined,
    restSets: 0,
    preparationTime: 0,
    tempo: values.tempo || undefined,
    side: values.side || undefined,
  });

  const totalSeconds = calculateExerciseTotalSeconds({
    sets: values.sets ?? 0,
    reps: values.reps ?? undefined,
    duration: values.duration ?? undefined,
    executionTime: values.executionTime ?? undefined,
    restSets: values.restSets ?? undefined,
    restReps: values.restReps ?? undefined,
    preparationTime: values.preparationTime ?? undefined,
    tempo: values.tempo || undefined,
    side: values.side || undefined,
  });

  const dirty = (key: ExerciseFieldKey) => Boolean(isDirtyField?.(key));

  const commitNumber = (key: ExerciseFieldKey, value: number | null) => {
    if (key === 'load') {
      onChange({ loadKg: value });
      return;
    }
    onChange({ [key]: value } as Partial<ExerciseParameterValues>);
  };

  const commitText = (key: ExerciseFieldKey, value: string) => {
    onChange({ [key]: value } as Partial<ExerciseParameterValues>);
  };

  const renderEditableField = (field: ResolvedParameterField) => {
    const { key, config, role } = field;
    if (role === 'inherited') {
      return (
        <InheritedReadonlyField
          key={key}
          fieldKey={key}
          value={formatInheritedDisplay(key, values)}
          testIdPrefix={structuralTestIdPrefix}
        />
      );
    }

    const showInheritedBadge = isInheritedMatch(key, values, inheritedValues);
    const inputTestId = resolveTestId(key, config.editor === 'select' ? 'select' : 'input');
    const infoTestId = resolveTestId(key, 'info');

    if (config.editor === 'number') {
      return (
        <NumberField
          key={key}
          config={config}
          value={readNumeric(values, key)}
          dirty={dirty(key)}
          disabled={disabled}
          density={density}
          inherited={showInheritedBadge}
          testId={inputTestId}
          infoTestId={infoTestId}
          onCommit={(next) => commitNumber(key, next)}
        />
      );
    }

    if (config.editor === 'select') {
      const selectValue =
        key === 'difficultyLevel'
          ? (values.difficultyLevel ?? 'UNKNOWN')
          : (values.side ?? 'none');
      return (
        <SelectField
          key={key}
          config={config}
          value={selectValue}
          dirty={dirty(key)}
          disabled={disabled}
          density={density}
          inherited={showInheritedBadge}
          testId={inputTestId}
          infoTestId={infoTestId}
          onChange={(next) => commitText(key, next)}
        />
      );
    }

    if (config.editor === 'textarea') {
      return (
        <TextAreaField
          key={key}
          config={config}
          value={readText(values, key)}
          dirty={dirty(key)}
          disabled={disabled}
          inherited={showInheritedBadge}
          placeholder={
            key === 'notes'
              ? 'Instrukcje, wskazówki...'
              : key === 'patientDescription'
                ? 'Opis widoczny dla pacjenta'
                : key === 'clinicalDescription'
                  ? 'Notatki kliniczne'
                  : undefined
          }
          testId={inputTestId}
          infoTestId={infoTestId}
          onChange={(next) => commitText(key, next)}
        />
      );
    }

    return (
      <TextField
        key={key}
        config={config}
        value={readText(values, key)}
        dirty={dirty(key)}
        disabled={disabled}
        density={density}
        inherited={showInheritedBadge}
        placeholder={
          key === 'tempo' ? 'np. 3-0-1-0' : key === 'rangeOfMotion' ? 'np. 0–90°' : key === 'audioCue' ? 'np. Wdech przy wznosie' : undefined
        }
        testId={inputTestId}
        infoTestId={infoTestId}
        onChange={(next) => commitText(key, next)}
      />
    );
  };

  const inheritedInAdvanced = advancedSections.flatMap((section) =>
    section.fields.filter((field) => field.role === 'inherited')
  );
  const editableAdvanced = advancedSections.map((section) => ({
    ...section,
    fields: section.fields.filter((field) => field.role === 'editable'),
  }));

  const advancedBody = (
    <div className="space-y-4">
      {editableAdvanced.map((section) =>
        section.fields.length > 0 ? (
          <div
            key={section.id}
            className="rounded-2xl border border-border/40 bg-surface/50 p-4"
            data-testid={structuralId(`section-${section.id}`)}
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {section.title}
            </p>
            <div className="grid grid-cols-1 gap-3 @[460px]:grid-cols-2">
              {section.fields.map((field) => renderEditableField(field))}
            </div>
          </div>
        ) : null
      )}

      {inheritedInAdvanced.length > 0 ? (
        <div
          className="space-y-2 rounded-lg border border-border/40 bg-surface-light/40 p-3"
          data-testid={structuralId('inherited-section')}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Odziedziczone z ćwiczenia
            </p>
            {templateHref ? (
              <a
                href={templateHref}
                className="text-[11px] font-medium text-primary hover:underline"
                data-testid={structuralId('edit-template-link')}
              >
                Edytuj w ćwiczeniu
              </a>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-2 @[460px]:grid-cols-3">
            {inheritedInAdvanced.map((field) => (
              <InheritedReadonlyField
                key={field.key}
                fieldKey={field.key}
                value={formatInheritedDisplay(field.key, values)}
                testIdPrefix={structuralTestIdPrefix}
              />
            ))}
          </div>
        </div>
      ) : null}

      {showMappingOnlyFields ? (
        <div className="grid grid-cols-1 gap-3 @[460px]:grid-cols-2">
          {(['customName', 'customDescription'] as const).map((key) => {
            const config = MAPPING_ONLY_FIELD_CONFIG[key];
            const testId = resolveTestId(key, 'input');
            const infoTestId = resolveTestId(key, 'info');
            if (config.editor === 'textarea') {
              return (
                <div key={key} className="space-y-1 @[460px]:col-span-2">
                  <FieldLabel
                    label={config.label}
                    tooltip={config.tooltip}
                    dirty={false}
                    htmlFor={testId}
                    infoTestId={infoTestId}
                  />
                  <Textarea
                    data-testid={testId}
                    id={testId}
                    value={values[key] ?? ''}
                    placeholder={key === 'customDescription' ? 'Opis dla pacjenta' : undefined}
                    onChange={(event) => onChange({ [key]: event.target.value })}
                    disabled={disabled}
                    className="min-h-[60px] resize-none text-sm"
                  />
                </div>
              );
            }
            return (
              <div key={key} className="space-y-1 @[460px]:col-span-2">
                <FieldLabel
                  label={config.label}
                  tooltip={config.tooltip}
                  dirty={false}
                  htmlFor={testId}
                  infoTestId={infoTestId}
                />
                <Input
                  data-testid={testId}
                  id={testId}
                  value={values[key] ?? ''}
                  placeholder={key === 'customName' ? 'Nadpisz nazwę dla pacjenta' : undefined}
                  onChange={(event) => onChange({ [key]: event.target.value })}
                  disabled={disabled}
                  className={cn('text-sm', density === 'comfortable' ? 'h-11' : 'h-9')}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {advancedFooter}
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn('@container space-y-4', className)}>
        {basicSection ? (
          <div
            className="rounded-2xl border border-primary/30 bg-primary/5 p-4"
            data-testid={structuralId('section-basic')}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{basicSection.title}</p>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                  isTimeBased ? 'bg-primary/15 text-primary' : 'bg-surface-light/60 text-muted-foreground'
                )}
                data-testid={structuralId('mode-indicator')}
              >
                {isTimeBased ? 'Z timerem' : 'Bez timera'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 @[460px]:grid-cols-2">
              {basicSection.fields.map((field) => renderEditableField(field))}
            </div>

            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" />
              {isTimeBased
                ? 'Timer w aplikacji pacjenta jest aktywny, bo podano czas powtórzenia. Wyczyść to pole, aby wyłączyć timer.'
                : 'Podaj „Czas powtórzenia”, aby uruchomić timer w aplikacji pacjenta.'}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ComputedChip
                label="Czas serii (wyliczany)"
                value={
                  seriesSeconds.seconds > 0
                    ? formatExerciseDuration(seriesSeconds.seconds, seriesSeconds.isEstimate)
                    : '—'
                }
                tooltip="Wartość wyliczana: powtórzenia × czas powtórzenia + mikroprzerwy. Nieedytowalna."
                testId={structuralId('series-time')}
              />
              <ComputedChip
                label="Czas ćwiczenia (wyliczany)"
                value={
                  totalSeconds.seconds > 0
                    ? formatExerciseDuration(totalSeconds.seconds, totalSeconds.isEstimate)
                    : '—'
                }
                tooltip="Wartość wyliczana: wszystkie serie + przerwy + przygotowanie. Nieedytowalna."
                testId={structuralId('total-time')}
              />
            </div>

            {(values.duration ?? 0) > 0 ? (
              <div
                className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-surface-light/50 px-3 py-2"
                data-testid={structuralId('legacy-duration')}
              >
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Czas serii ustawiony ręcznie (starsze dane):{' '}
                  <span className="font-medium text-foreground tabular-nums">{values.duration} s</span>
                </p>
                <button
                  type="button"
                  className="shrink-0 text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
                  data-testid={structuralId('legacy-duration-clear')}
                  disabled={disabled}
                  onClick={() => onChange({ duration: 0 })}
                >
                  Usuń nadpisanie
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {advancedSections.length > 0 || showMappingOnlyFields || advancedFooter ? (
          collapseAdvanced ? (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger
                className="flex w-full items-center justify-between rounded-2xl border border-border/40 bg-surface/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
                data-testid={structuralId('advanced-toggle')}
              >
                <span>Zaawansowane parametry</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    advancedOpen && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4">{advancedBody}</CollapsibleContent>
            </Collapsible>
          ) : (
            advancedBody
          )
        ) : null}

        {contentSection ? (
          <div
            className="rounded-2xl border border-border/40 bg-surface/50 p-4"
            data-testid={structuralId('section-content')}
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {contentSection.title}
            </p>
            <div className="grid grid-cols-1 gap-3 @[460px]:grid-cols-2">
              {contentSection.fields.map((field) => renderEditableField(field))}
            </div>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
