'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { DirtyDot } from '@/components/shared/enrichment/DirtyDot';
import { FieldHelpContent, FieldHelpTooltip } from '@/components/shared/FieldHelpTooltip';
import { cn } from '@/lib/utils';
import type { ExerciseFieldKey } from './displayRegistry';
import { EXERCISE_FIELD_METADATA, formatParameterValue } from './displayRegistry';
import { computeExerciseTimeLabels } from './computedExerciseTime';
import { ExerciseComputedTime } from './ExerciseComputedTime';
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
import { parseNumberFieldDraft } from './numberFieldDraft';
import { applyTextSuggestion, isTextSuggestionActive, suggestionTestIdSlug } from './textSuggestions';
import { getTimerModeDescription, getTimerModeLabel } from './timerModeCopy';
import {
  describeSideOption,
  getExerciseSideHelp,
  REPS_PER_SIDE_HELP,
  summarizeRepsPerSide,
  type RepsPerSideSummary,
} from '@/utils/exerciseSideLabels';
import { fieldHelpToText, type FieldHelpInput } from '@/utils/fieldHelp';

/** Normalized values for the shared parameter presentation layer. */
export interface ExerciseParameterValues {
  sets?: number | null;
  reps?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  /** Odpoczynek po ćwiczeniu (s); `null` = auto (pole puste), `0` = bez odpoczynku. */
  restAfterExercise?: number | null;
  duration?: number | null;
  loadKg?: number | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  resistance?: string | null;
  equipment?: string | null;
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

/** Zapisany typ ćwiczenia albo `'draft'` dla szkicu bez typu (kreator tworzenia). */
export type ExerciseParametersTimingType = 'reps' | 'time' | 'draft';

export interface ExerciseParametersFieldsProps {
  surface: ExerciseFieldSurface;
  /**
   * Wymagany: REPS nie liczy pozostałego `duration` (jak player), `'draft'` liczy.
   * Dla zapisanego ćwiczenia podaj `normalizeExerciseType(exercise.type) ?? 'draft'`.
   */
  exerciseType: ExerciseParametersTimingType;
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
  /** Rekord ćwiczenia jest w kontrakcie 3.3 (`isV33ExerciseRecord`): „naprzemiennie” to liczba na każdą stronę. */
  alternatingPerSide?: boolean;
  /**
   * Treść ćwiczenia (a z nią wersja rekordu) jeszcze nie dotarła albo się nie wczytała: dla strony „naprzemiennie”
   * kafle czasu i podpowiedź strony nie pokazują liczby, która mogłaby być błędna.
   */
  versionPending?: boolean;
}

const SIDE_HELP_PENDING = 'Wczytuję treść ćwiczenia: dopiero z nią wiadomo, czy liczba powtórzeń jest na każdą stronę.';

function FieldLabel({
  label,
  tooltip,
  dirty,
  htmlFor,
  infoTestId,
  inherited,
}: Readonly<{
  label: string;
  tooltip: FieldHelpInput;
  dirty: boolean;
  htmlFor?: string;
  infoTestId: string;
  inherited?: boolean;
}>) {
  return (
    <div className="flex min-h-4 items-center gap-1">
      <Label className="min-w-0 text-xs text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </Label>
      <FieldHelpTooltip label={label} help={tooltip} testId={infoTestId} />
      {inherited ? (
        <Badge variant="outline" className="ml-0.5 text-[10px] font-normal normal-case">
          odziedziczone
        </Badge>
      ) : null}
      <DirtyDot active={dirty} className="ml-0.5" />
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
  perSide,
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
  /** Pole „Powtórzenia” przy stronach: liczba jest na stronę, pod polem widać sumę w serii. */
  perSide?: RepsPerSideSummary | null;
  onCommit: (value: number | null) => void;
}>) {
  const [raw, setRaw] = useState(value != null ? String(value) : '');
  const [error, setError] = useState<string | null>(null);
  const metadata = EXERCISE_FIELD_METADATA[config.key];
  const suffix = perSide ? 'na stronę' : config.suffix;

  useEffect(() => {
    setRaw(value != null ? String(value) : '');
    setError(null);
  }, [value]);

  const commit = () => {
    const draft = parseNumberFieldDraft(raw, config);
    if (draft.kind === 'error') {
      setError(draft.message);
      return;
    }
    setError(null);
    if (draft.value !== (value ?? null)) onCommit(draft.value);
  };

  return (
    <div className="space-y-1">
      <FieldLabel
        label={metadata.label}
        tooltip={perSide ? REPS_PER_SIDE_HELP : metadata.help}
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
          placeholder={config.placeholder}
          value={raw}
          aria-invalid={error ? true : undefined}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            setRaw(event.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          disabled={disabled}
          className={cn(
            'text-sm tabular-nums transition-colors',
            density === 'comfortable' ? 'h-11' : 'h-9',
            suffix && (perSide ? 'pr-20' : 'pr-10'),
            dirty && 'border-status-warning/70 bg-status-warning-muted dark:border-status-warning/40'
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {perSide ? (
        <p className="text-xs leading-snug text-primary" data-testid={`${testId}-per-side-total`}>
          <strong className="font-bold">{perSide.total} w serii</strong> ({perSide.order})
        </p>
      ) : null}
      {error ? (
        <p className="text-[11px] leading-snug text-destructive" data-testid={`${testId}-error`}>
          {error}
        </p>
      ) : null}
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
  const suggestionMode = config.suggestionMode ?? 'replace';

  return (
    <div className="space-y-1">
      <FieldLabel
        label={metadata.label}
        tooltip={metadata.help}
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
        maxLength={config.maxLength}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          'text-sm transition-colors',
          density === 'comfortable' ? 'h-11' : 'h-9',
          dirty && 'border-status-warning/70 bg-status-warning-muted dark:border-status-warning/40'
        )}
      />
      {config.suggestions && config.suggestions.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5 pt-0.5"
          role="group"
          aria-label={`Podpowiedzi: ${metadata.label}`}
          data-testid={`${testId}-suggestions`}
        >
          {config.suggestions.map((suggestion) => {
            const active = isTextSuggestionActive(value, suggestion, suggestionMode);
            return (
              <button
                key={suggestion}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                data-testid={`${testId}-suggestion-${suggestionTestIdSlug(suggestion)}`}
                onClick={() => onChange(applyTextSuggestion(value, suggestion, suggestionMode))}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:opacity-50',
                  active
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/60 bg-surface text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                )}
              >
                {suggestion}
              </button>
            );
          })}
        </div>
      ) : null}
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
        tooltip={metadata.help}
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
          dirty && 'border-status-warning/70 bg-status-warning-muted dark:border-status-warning/40'
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
  tooltip,
  describeOption,
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
  /** Zastępuje domyślną podpowiedź pola (strona różni się zależnie od wersji rekordu). */
  tooltip?: FieldHelpInput;
  /** Druga linijka opcji na liście (strona: co wpisana liczba powtórzeń znaczy przy tej opcji). */
  describeOption?: (value: string) => string | null;
  onChange: (value: string) => void;
}>) {
  const metadata = EXERCISE_FIELD_METADATA[config.key];
  const options = config.options ?? (config.key === 'side' ? SIDE_OPTIONS : DIFFICULTY_OPTIONS);
  const selectedLabel = options.find((option) => option.value === value)?.label;
  const triggerId = useId();

  return (
    <div className="space-y-1">
      <FieldLabel
        label={metadata.label}
        tooltip={tooltip ?? metadata.help}
        dirty={dirty}
        htmlFor={triggerId}
        infoTestId={infoTestId}
        inherited={inherited}
      />
      <Select value={value} onValueChange={onChange} disabled={disabled} data-testid={testId}>
        <SelectTrigger
          id={triggerId}
          data-testid={testId}
          className={cn(
            'text-sm transition-colors',
            density === 'comfortable' ? 'h-11' : 'h-9',
            dirty && 'border-status-warning/70 bg-status-warning-muted dark:border-status-warning/40'
          )}
        >
          {describeOption && selectedLabel ? <SelectValue>{selectedLabel}</SelectValue> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            const description = describeOption?.(option.value);
            return (
              <SelectItem key={option.value} value={option.value}>
                {description ? (
                  <span className="flex flex-col py-0.5">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </span>
                ) : (
                  option.label
                )}
              </SelectItem>
            );
          })}
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

/** Wartość odziedziczona tym samym formatterem co podgląd ćwiczenia (`formatParameterValue`). */
function formatInheritedDisplay(
  key: ExerciseFieldKey,
  values: ExerciseParameterValues,
  alternatingPerSide = false
): string {
  return formatParameterValue(key, values, { alternatingPerSide });
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
  exerciseType,
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
  alternatingPerSide = false,
  versionPending = false,
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
  const timeUnknown = versionPending && values.side?.toLowerCase() === 'alternating';

  const computedTimes = computeExerciseTimeLabels(values, {
    type: exerciseType === 'draft' ? undefined : exerciseType,
    alternatingPerSide,
    timeUnknown,
  });

  const repsPerSide = timeUnknown ? null : summarizeRepsPerSide(values.reps, values.side, alternatingPerSide);

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
          value={formatInheritedDisplay(key, values, alternatingPerSide)}
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
          perSide={key === 'reps' ? repsPerSide : undefined}
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
          tooltip={key === 'side' ? (timeUnknown ? SIDE_HELP_PENDING : getExerciseSideHelp(alternatingPerSide)) : undefined}
          describeOption={
            key === 'side' && !versionPending
              ? (option) => describeSideOption(option, values.reps, alternatingPerSide)
              : undefined
          }
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
          key === 'tempo'
            ? 'np. 3-0-1-0'
            : key === 'rangeOfMotion'
              ? 'np. 0–90°'
              : key === 'audioCue'
                ? 'np. Wdech przy wznosie'
                : key === 'resistance'
                  ? 'np. Średni (czerwona guma)'
                  : key === 'equipment'
                    ? 'np. Guma, krzesło'
                    : undefined
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
                value={formatInheritedDisplay(field.key, values, alternatingPerSide)}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide transition-colors',
                      isTimeBased ? 'bg-primary/15 text-primary' : 'bg-surface-light/60 text-muted-foreground'
                    )}
                    data-testid={structuralId('mode-indicator')}
                    aria-label={fieldHelpToText(getTimerModeDescription(isTimeBased))}
                  >
                    {getTimerModeLabel(isTimeBased)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" align="end" className="max-w-[18rem] px-3 py-2">
                  <FieldHelpContent help={getTimerModeDescription(isTimeBased)} />
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-1 gap-3 @[460px]:grid-cols-2">
              {basicSection.fields.map((field) => renderEditableField(field))}
            </div>

            <div className="mt-3">
              <ExerciseComputedTime times={computedTimes} testIdPrefix={structuralTestIdPrefix} />
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
