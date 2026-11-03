'use client';

import { Info, Timer } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SIDE_OPTIONS } from '@/components/shared/exercise/fieldContract';
import { cn } from '@/lib/utils';
import type { ExerciseCoreDraft } from '@/features/exercises/useExerciseEditorForm';
import {
  DEFAULT_REP_SECONDS,
  MODE_PARAMETERS,
  PARAMETER_RULES,
  describeFieldNote,
  formatSessionDuration,
  formatWithUnit,
  fromSliderValue,
  sideFactor,
  sliderPercent,
  toSliderValue,
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
  onValueChange: (key: ParameterKey, value: number | null) => void;
  onAcknowledge: (key: AcknowledgeKey) => void;
  onFixDescription: () => void;
  onAcknowledgeDescription: () => void;
  onCoreFieldChange: <K extends keyof ExerciseCoreDraft>(field: K, value: ExerciseCoreDraft[K]) => void;
  /** Saved load the kilogram field cannot show (band, RPE, text). */
  savedLoadLabel?: string | null;
}

const FIELD_INFO: Partial<Record<ParameterKey, string>> = {
  reps: 'Utrzymanie pozycji, np. deska: wpisz 1 powtórzenie, a czas utrzymania w polu niżej.',
  repTime: 'Ile trwa jedno powtórzenie razem z powrotem. Z tego liczymy czas ćwiczenia.',
  hold: 'Ile sekund pacjent utrzymuje pozycję w jednej serii.',
};

const DETAIL_INFO = {
  tempo:
    'Słownie (wolno, umiarkowanie, szybko) albo zapis 3-0-1-0: opuszczanie, pauza na dole, unoszenie, pauza na górze, w sekundach.',
  load: 'Pusto znaczy masa ciała. Wpisz kilogramy, gdy pacjent używa ciężaru.',
  rangeOfMotion:
    'Jak głęboko lub daleko: pełny, w wygodnym zakresie albo do kąta, np. do 90°. Opis ruchu należy do opisu ćwiczenia.',
} as const;

const TIMING_FIELDS = [
  {
    field: 'restReps',
    label: 'Przerwa między powtórzeniami',
    info: 'Krótka przerwa między pojedynczymi powtórzeniami. Wlicza się do czasu ćwiczenia.',
  },
  {
    field: 'preparationTime',
    label: 'Czas przygotowania',
    info: 'Czas na ustawienie pozycji przed startem. Wlicza się do czasu ćwiczenia.',
  },
] as const satisfies ReadonlyArray<{ field: keyof ExerciseCoreDraft; label: string; info: string }>;

function parseNumber(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function InfoButton({ label, text, testId }: Readonly<{ label: string; text: string; testId: string }>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-label-secondary"
          aria-label={`Co znaczy: ${label}`}
          data-testid={testId}
        >
          <Info />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="text-[13px] leading-[18px] text-label-secondary">
        {text}
      </PopoverContent>
    </Popover>
  );
}

type NoteTone = 'error' | 'suggestion' | 'done';

function FieldNote({
  tone,
  text,
  children,
  'data-testid': testId,
}: Readonly<{ tone: NoteTone; text: string; children?: React.ReactNode; 'data-testid'?: string }>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2.5 rounded-[12px] py-1.5 pl-3 pr-1.5',
        tone === 'error' && 'bg-status-danger-muted',
        tone === 'suggestion' && 'bg-status-warning-muted',
        tone === 'done' && 'bg-card'
      )}
      data-testid={testId}
    >
      <Badge variant={tone === 'error' ? 'destructive' : tone === 'suggestion' ? 'warning' : 'secondary'}>
        {tone === 'error' ? 'Błąd' : tone === 'suggestion' ? 'Sugestia' : 'OK'}
      </Badge>
      <p className="min-w-0 flex-1 text-[14px] text-foreground">{text}</p>
      {children}
    </div>
  );
}

function ParameterRow({
  field,
  onChange,
  onAcknowledge,
}: Readonly<{
  field: ParameterFieldState;
  onChange: (value: number | null) => void;
  onAcknowledge: () => void;
}>) {
  const rule = PARAMETER_RULES[field.key];
  const inputId = `verification-param-${field.key}`;
  const sliderValue = toSliderValue(field.key, field.value);
  const position = sliderPercent(field.key, sliderValue);
  const bandLeft = sliderPercent(field.key, rule.typicalMin);
  const bandWidth = sliderPercent(field.key, rule.typicalMax) - bandLeft;
  const isEmpty = field.value == null;
  const isError = field.level === 'limit' || field.level === 'empty';
  const isWarning = field.level === 'warning';
  const note = describeFieldNote(field);
  const info = FIELD_INFO[field.key];
  const showNote = isError || isWarning || field.level === 'acknowledged';

  return (
    <div className="flex flex-col gap-2 border-t-[0.5px] border-separator py-3 first:border-t-0 first:pt-0">
      <div className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-x-4 gap-y-2 sm:grid-cols-[200px_112px_minmax(0,1fr)]">
        <div className="flex items-center gap-1">
          <Label htmlFor={inputId} className="text-[15px] font-normal text-foreground">
            {rule.label}
          </Label>
          {info && <InfoButton label={rule.label} text={info} testId={`verification-param-${field.key}-info-btn`} />}
        </div>
        <div className="relative">
          <Input
            id={inputId}
            data-testid={`verification-param-${field.key}-input`}
            inputMode="decimal"
            value={field.value ?? ''}
            placeholder={field.key === 'repTime' ? String(DEFAULT_REP_SECONDS) : undefined}
            aria-invalid={isError || undefined}
            aria-describedby={showNote ? `${inputId}-note` : undefined}
            onChange={(event) => onChange(parseNumber(event.target.value))}
            className={cn(
              'pr-8 tabular-nums',
              isWarning && 'ring-2 ring-status-warning/50',
              isError && 'ring-2 ring-status-danger'
            )}
          />
          {rule.unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-label-secondary">
              {rule.unit}
            </span>
          )}
        </div>
        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <div className="relative flex h-6 items-center">
            <div className="relative h-2 w-full rounded-full bg-fill-tertiary" aria-hidden="true">
              <span
                className="absolute inset-y-0 rounded-full bg-tint/45"
                style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
              />
            </div>
            <input
              type="range"
              min={rule.slider.min}
              max={rule.slider.max}
              step={rule.slider.step}
              value={sliderValue}
              aria-label={`${rule.label}: suwak`}
              aria-valuetext={isEmpty ? 'Puste' : formatWithUnit(sliderValue, rule.unit)}
              onChange={(event) => onChange(fromSliderValue(field.key, event.target.value))}
              className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
              data-testid={`verification-param-${field.key}-slider`}
            />
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-grouped-tertiary transition-transform',
                'peer-hover:scale-110 peer-active:scale-125 peer-focus-visible:ring-tint',
                isEmpty
                  ? 'bg-card ring-2 ring-label-secondary'
                  : isError
                    ? 'bg-status-danger'
                    : isWarning
                      ? 'bg-status-warning'
                      : 'bg-foreground'
              )}
              style={{ left: `${position}%` }}
            />
          </div>
          <span className="text-[12px] text-label-secondary" aria-hidden="true">
            zwykle {rule.typicalMin}–{formatWithUnit(rule.typicalMax, rule.unit)}
          </span>
        </div>
      </div>
      {showNote && (
        <div id={`${inputId}-note`}>
          <FieldNote
            tone={isError ? 'error' : isWarning ? 'suggestion' : 'done'}
            text={note}
            data-testid={`verification-param-${field.key}-note`}
          >
            {(isError || isWarning) && (
              <Button
                type="button"
                size="sm"
                variant="tinted"
                className="bg-card"
                onClick={() => onChange(rule.suggested)}
                data-testid={`verification-param-${field.key}-fix-btn`}
              >
                Ustaw {formatWithUnit(rule.suggested, rule.unit)}
              </Button>
            )}
            {isWarning && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onAcknowledge}
                data-testid={`verification-param-${field.key}-ack-btn`}
              >
                OK
              </Button>
            )}
          </FieldNote>
        </div>
      )}
    </div>
  );
}

export function ParametersStage({
  core,
  mode,
  values,
  evaluation,
  descriptionNumbers,
  onValueChange,
  onAcknowledge,
  onFixDescription,
  onAcknowledgeDescription,
  onCoreFieldChange,
  savedLoadLabel = null,
}: ParametersStageProps) {
  const sessionFinding = evaluation.findings.find((finding) => finding.key === 'session');
  const sessionText = formatSessionDuration(evaluation.sessionSeconds, evaluation.sessionIsEstimate);

  return (
    <div className="flex flex-col gap-4" data-testid="verification-stage-parameters">
      <StageSection
        title="Podstawowe parametry"
        data-testid="verification-param-section"
        aside={
          <div
            role="status"
            className={cn(
              'flex items-center gap-2.5 rounded-[14px] px-3.5 py-2',
              evaluation.sessionLevel === 'limit'
                ? 'bg-status-danger-muted text-status-danger'
                : evaluation.sessionLevel === 'warning'
                  ? 'bg-status-warning-muted text-status-warning'
                  : 'bg-card text-foreground'
            )}
            data-testid="verification-param-timer"
          >
            <Timer className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="flex flex-col leading-tight">
              <span className="text-[12px] font-medium opacity-80">Czas ćwiczenia</span>
              <span className="text-[20px] font-bold tabular-nums">{sessionText}</span>
            </span>
          </div>
        }
      >
        {sessionFinding && (
          <FieldNote
            tone={sessionFinding.level === 'limit' ? 'error' : 'suggestion'}
            text={sessionFinding.text}
            data-testid="verification-param-session-note"
          >
            {sessionFinding.canAcknowledge && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onAcknowledge('session')}
                data-testid="verification-param-session-ack-btn"
              >
                OK
              </Button>
            )}
          </FieldNote>
        )}

        <div className="flex flex-col">
          {MODE_PARAMETERS[mode].map((key, index) => {
            const field = evaluation.fields.find((candidate) => candidate.key === key);
            if (!field) return null;
            // Keyed by position: when one long repetition turns the row into „Czas utrzymania”, the input keeps focus.
            return (
              <ParameterRow
                key={index}
                field={{ ...field, value: values[key] }}
                onChange={(value) => onValueChange(key, value)}
                onAcknowledge={() => onAcknowledge(key)}
              />
            );
          })}
          <div className="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t-[0.5px] border-separator pt-3 sm:grid-cols-[200px_minmax(0,1fr)]">
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
                <span className="text-[13px] text-label-secondary">Czas liczony podwójnie</span>
              )}
            </div>
          </div>
        </div>
      </StageSection>

      {descriptionNumbers.length > 0 && (
        <FieldNote
          tone="suggestion"
          text={`Opis: „${descriptionNumbers.join('”, „')}” nie zmieni się z parametrami`}
          data-testid="verification-param-findings"
        >
          <Button
            type="button"
            size="sm"
            variant="tinted"
            className="bg-card"
            onClick={onFixDescription}
            data-testid="verification-param-description-fix-btn"
          >
            Zamień na „zadaną liczbę”
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onAcknowledgeDescription}
            data-testid="verification-param-description-ack-btn"
          >
            OK
          </Button>
        </FieldNote>
      )}

      <StageSection title="Tempo, obciążenie, zakres ruchu, przerwy" data-testid="verification-param-details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <Label htmlFor="verification-param-tempo" className="text-[13px] text-label-secondary">
                Tempo
              </Label>
              <InfoButton label="Tempo" text={DETAIL_INFO.tempo} testId="verification-param-tempo-info-btn" />
            </div>
            <Input
              id="verification-param-tempo"
              value={core.tempo}
              placeholder="wolno albo 3-0-1-0"
              onChange={(event) => onCoreFieldChange('tempo', event.target.value)}
              data-testid="verification-param-tempo-input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <Label htmlFor="verification-param-load" className="text-[13px] text-label-secondary">
                Obciążenie (kg)
              </Label>
              <InfoButton label="Obciążenie" text={DETAIL_INFO.load} testId="verification-param-load-info-btn" />
            </div>
            <Input
              id="verification-param-load"
              inputMode="decimal"
              value={core.loadKg ?? ''}
              placeholder={savedLoadLabel ?? 'masa ciała'}
              onChange={(event) => onCoreFieldChange('loadKg', parseNumber(event.target.value))}
              data-testid="verification-param-load-input"
            />
            {savedLoadLabel && (
              <p className="text-[13px] text-label-secondary" data-testid="verification-param-saved-load-note">
                Zapisane: „{savedLoadLabel}”. Wpisanie kilogramów je zastąpi.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <Label htmlFor="verification-param-rom" className="text-[13px] text-label-secondary">
                Zakres ruchu
              </Label>
              <InfoButton
                label="Zakres ruchu"
                text={DETAIL_INFO.rangeOfMotion}
                testId="verification-param-rom-info-btn"
              />
            </div>
            <Input
              id="verification-param-rom"
              value={core.rangeOfMotion}
              placeholder="pełny albo do 90°"
              onChange={(event) => onCoreFieldChange('rangeOfMotion', event.target.value)}
              data-testid="verification-param-rom-input"
            />
          </div>
          {TIMING_FIELDS.map(({ field, label, info }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor={`verification-param-${field}`} className="text-[13px] text-label-secondary">
                  {label} (s)
                </Label>
                <InfoButton label={label} text={info} testId={`verification-param-${field}-info-btn`} />
              </div>
              <Input
                id={`verification-param-${field}`}
                inputMode="numeric"
                value={core[field] ?? ''}
                placeholder="0"
                onChange={(event) => onCoreFieldChange(field, parseNumber(event.target.value))}
                data-testid={`verification-param-${field}-input`}
              />
            </div>
          ))}
        </div>
      </StageSection>
    </div>
  );
}
