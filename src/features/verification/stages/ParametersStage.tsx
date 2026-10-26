'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SIDE_OPTIONS } from '@/components/shared/exercise/fieldContract';
import { cn } from '@/lib/utils';
import type { ExerciseCoreDraft } from '@/features/exercises/useExerciseEditorForm';
import {
  DEFAULT_REP_SECONDS,
  MODE_PARAMETERS,
  PARAMETER_RULES,
  buildPatientParameterLine,
  formatSessionDuration,
  formatWithUnit,
  sideFactor,
  type AcknowledgeKey,
  type ExecutionMode,
  type ParameterEvaluation,
  type ParameterFieldState,
  type ParameterKey,
  type ParameterValues,
} from '../utils/parameterRules';
import { StageSection } from './StageSection';

interface ParametersStageProps {
  core: ExerciseCoreDraft;
  mode: ExecutionMode;
  values: ParameterValues;
  evaluation: ParameterEvaluation;
  descriptionNumbers: string[];
  onModeChange: (mode: ExecutionMode) => void;
  onValueChange: (key: ParameterKey, value: number | null) => void;
  onAcknowledge: (key: AcknowledgeKey) => void;
  onFixDescription: () => void;
  onAcknowledgeDescription: () => void;
  onCoreFieldChange: <K extends keyof ExerciseCoreDraft>(field: K, value: ExerciseCoreDraft[K]) => void;
}

const MODE_OPTIONS: ReadonlyArray<{ value: ExecutionMode; label: string }> = [
  { value: 'reps', label: 'Powtórzenia' },
  { value: 'hold', label: 'Utrzymanie pozycji' },
];

function parseNumber(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function statusFor(field: ParameterFieldState): { text: string; className: string } {
  switch (field.level) {
    case 'limit':
      return { text: 'Za dużo', className: 'text-status-danger' };
    case 'warning':
      return { text: 'Nietypowe', className: 'text-status-warning' };
    case 'acknowledged':
      return { text: 'Tak ma być', className: 'text-label-secondary' };
    case 'default':
      return { text: `Domyślnie ${DEFAULT_REP_SECONDS} s`, className: 'text-label-secondary' };
    case 'empty':
      return { text: 'Puste', className: 'text-label-secondary' };
    default:
      return { text: '', className: '' };
  }
}

function ParameterRow({
  field,
  onChange,
}: Readonly<{ field: ParameterFieldState; onChange: (value: number | null) => void }>) {
  const rule = PARAMETER_RULES[field.key];
  const status = statusFor(field);
  const inputId = `verification-param-${field.key}`;
  const position = field.value == null ? null : Math.min(100, (field.value / rule.hardMax) * 100);
  const bandLeft = (rule.typicalMin / rule.hardMax) * 100;
  const bandWidth = Math.max(2, ((rule.typicalMax - rule.typicalMin) / rule.hardMax) * 100);
  const isLimit = field.level === 'limit';
  const isWarning = field.level === 'warning';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-x-4 gap-y-2 border-t-[0.5px] border-separator py-3 first:border-t-0 first:pt-0 sm:grid-cols-[180px_112px_minmax(0,1fr)_96px]">
      <Label htmlFor={inputId} className="text-[15px] font-normal text-foreground">
        {rule.label}
      </Label>
      <div className="relative">
        <Input
          id={inputId}
          inputMode="decimal"
          value={field.value ?? ''}
          placeholder={field.key === 'repTime' ? String(DEFAULT_REP_SECONDS) : undefined}
          aria-invalid={isLimit || undefined}
          aria-describedby={`${inputId}-status`}
          onChange={(event) => onChange(parseNumber(event.target.value))}
          className={cn('pr-8 tabular-nums', isWarning && 'ring-2 ring-status-warning')}
          data-testid={`verification-param-${field.key}-input`}
        />
        {rule.unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-label-secondary">
            {rule.unit}
          </span>
        )}
      </div>
      <div className="col-span-2 flex flex-col gap-1 sm:col-span-1" aria-hidden="true">
        <div className="relative h-2 rounded-full bg-fill-tertiary">
          <span
            className="absolute inset-y-0 rounded-full bg-tint/45"
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
          />
          {position != null && (
            <span
              className={cn(
                'absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full ring-[3px] ring-grouped-tertiary',
                isLimit ? 'bg-status-danger' : isWarning ? 'bg-status-warning' : 'bg-foreground'
              )}
              style={{ left: `${position}%` }}
            />
          )}
        </div>
        <span className="text-[12px] text-label-secondary">
          zwykle {rule.typicalMin}–{formatWithUnit(rule.typicalMax, rule.unit)}
        </span>
      </div>
      <span
        id={`${inputId}-status`}
        className={cn('col-span-2 text-[13px] font-semibold sm:col-span-1 sm:text-right', status.className)}
      >
        {status.text}
      </span>
    </div>
  );
}

export function ParametersStage({
  core,
  mode,
  values,
  evaluation,
  descriptionNumbers,
  onModeChange,
  onValueChange,
  onAcknowledge,
  onFixDescription,
  onAcknowledgeDescription,
  onCoreFieldChange,
}: ParametersStageProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasFindings = evaluation.findings.length > 0 || descriptionNumbers.length > 0;
  const fieldsByKey = new Map(evaluation.fields.map((field) => [field.key, field]));

  return (
    <div className="flex flex-col gap-4" data-testid="verification-stage-parameters">
      {hasFindings && (
        <section
          className="flex flex-col gap-2.5 rounded-card bg-grouped-tertiary p-4"
          aria-label="Uwagi do parametrów"
          data-testid="verification-param-findings"
        >
          {evaluation.findings.map((finding, index) => {
            const suggestedKey = finding.key === 'session' ? null : finding.key;
            const unit = suggestedKey ? PARAMETER_RULES[suggestedKey].unit : '';
            return (
              <div
                key={`${finding.key}-${finding.level}`}
                className={cn(
                  'flex flex-wrap items-center gap-2.5',
                  index > 0 && 'border-t-[0.5px] border-separator pt-2.5'
                )}
              >
                <Badge variant={finding.level === 'limit' ? 'destructive' : 'warning'}>
                  {finding.level === 'limit' ? 'Do poprawy' : 'Sprawdź'}
                </Badge>
                <p className="min-w-0 flex-1 text-[15px] text-foreground">{finding.text}</p>
                {suggestedKey && finding.suggested != null && (
                  <Button
                    type="button"
                    size="sm"
                    variant="tinted"
                    onClick={() => onValueChange(suggestedKey, finding.suggested ?? null)}
                    data-testid={`verification-param-${suggestedKey}-fix-btn`}
                  >
                    Ustaw {formatWithUnit(finding.suggested, unit)}
                  </Button>
                )}
                {finding.canAcknowledge && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onAcknowledge(finding.key)}
                    data-testid={`verification-param-${finding.key}-ack-btn`}
                  >
                    Tak ma być
                  </Button>
                )}
              </div>
            );
          })}
          {descriptionNumbers.length > 0 && (
            <div
              className={cn(
                'flex flex-wrap items-center gap-2.5',
                evaluation.findings.length > 0 && 'border-t-[0.5px] border-separator pt-2.5'
              )}
            >
              <Badge variant="warning">Sprawdź</Badge>
              <p className="min-w-0 flex-1 text-[15px] text-foreground">
                Opis dla pacjenta: „{descriptionNumbers.join('”, „')}”. Parametry dopasowujesz do pacjenta, więc liczba
                w opisie przestanie się zgadzać.
              </p>
              <Button
                type="button"
                size="sm"
                variant="tinted"
                onClick={onFixDescription}
                data-testid="verification-param-description-fix-btn"
              >
                Zamień na „zadaną liczbę”
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onAcknowledgeDescription}
                data-testid="verification-param-description-ack-btn"
              >
                Tak ma być
              </Button>
            </div>
          )}
        </section>
      )}

      <StageSection title="Podstawowe parametry" data-testid="verification-param-section">
        <div
          role="radiogroup"
          aria-label="Sposób wykonania"
          className="flex w-fit gap-0.5 rounded-full bg-fill-tertiary p-0.5"
        >
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mode === option.value}
              onClick={() => onModeChange(option.value)}
              className={cn(
                'h-7 rounded-full px-3 text-[13px] font-semibold transition-colors',
                mode === option.value ? 'bg-elevated text-foreground shadow-raised' : 'text-label-secondary'
              )}
              data-testid={`verification-param-mode-${option.value}-btn`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          {MODE_PARAMETERS[mode].map((key) => {
            const field = fieldsByKey.get(key);
            if (!field) return null;
            return <ParameterRow key={key} field={field} onChange={(value) => onValueChange(key, value)} />;
          })}
          <div className="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t-[0.5px] border-separator pt-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <Label htmlFor="verification-param-side" className="text-[15px] font-normal text-foreground">
              Strona ciała
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={core.side || 'none'}
                onValueChange={(value) => onCoreFieldChange('side', value)}
                data-testid="verification-param-side-select"
              >
                <SelectTrigger
                  id="verification-param-side"
                  className="w-[220px]"
                  data-testid="verification-param-side-select"
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
              {sideFactor(core.side) === 2 && (
                <span className="text-[13px] text-label-secondary">Czas ćwiczenia liczony podwójnie.</span>
              )}
            </div>
          </div>
        </div>
      </StageSection>

      <section
        className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-grouped-tertiary px-4 py-3"
        aria-label="Podsumowanie parametrów"
        data-testid="verification-param-summary"
      >
        <p className="text-[15px] text-foreground">
          <span className="text-label-secondary">Pacjent zobaczy: </span>
          {buildPatientParameterLine(values, mode, core.side)}
        </p>
        <p
          className={cn(
            'text-[15px] font-semibold tabular-nums',
            evaluation.sessionLevel === 'limit' && 'text-status-danger',
            evaluation.sessionLevel === 'warning' && 'text-status-warning'
          )}
        >
          Całe ćwiczenie ≈ {formatSessionDuration(evaluation.sessionSeconds)}
        </p>
      </section>

      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <section className="rounded-card bg-grouped-tertiary [--input:var(--grouped-secondary)]">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left"
              data-testid="verification-param-details-toggle-btn"
            >
              <span className="flex-1 text-[15px] font-semibold text-foreground">Tempo, obciążenie, zakres ruchu</span>
              <ChevronDown
                className={cn('h-4 w-4 text-label-tertiary transition-transform', detailsOpen && 'rotate-180')}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="verification-param-tempo" className="text-[13px] text-label-secondary">
                  Tempo
                </Label>
                <Input
                  id="verification-param-tempo"
                  value={core.tempo}
                  placeholder="np. 3-0-1-0"
                  onChange={(event) => onCoreFieldChange('tempo', event.target.value)}
                  data-testid="verification-param-tempo-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="verification-param-load" className="text-[13px] text-label-secondary">
                  Obciążenie (kg)
                </Label>
                <Input
                  id="verification-param-load"
                  inputMode="decimal"
                  value={core.loadKg ?? ''}
                  placeholder="masa ciała"
                  onChange={(event) => onCoreFieldChange('loadKg', parseNumber(event.target.value))}
                  data-testid="verification-param-load-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="verification-param-rom" className="text-[13px] text-label-secondary">
                  Zakres ruchu
                </Label>
                <Input
                  id="verification-param-rom"
                  value={core.rangeOfMotion}
                  placeholder="np. do 90° w kolanie"
                  onChange={(event) => onCoreFieldChange('rangeOfMotion', event.target.value)}
                  data-testid="verification-param-rom-input"
                />
              </div>
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    </div>
  );
}
