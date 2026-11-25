'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EquipmentItemsEditor } from '@/features/exercises/ExerciseV33Editors';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import {
  PRESCRIPTION_GOALS,
  RANGE_KEYS,
  prescriptionWithBound,
  prescriptionWithGoal,
  prescriptionWithStep,
  readRange,
  readStep,
  romLabel,
} from '../utils/v33Prescription';
import { ChipListEditor } from './ChipListEditor';
import { StageSection } from './StageSection';

interface V33ParameterContentProps {
  enrichment: ExerciseEnrichmentData;
  onEnrichmentPathChange: (path: string, value: unknown) => void;
}

const NO_GOAL = 'none';

function parseBound(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function StepEditor({
  which,
  title,
  hint,
  prescription,
  onChange,
}: Readonly<{
  which: 'progression' | 'regression';
  title: string;
  hint: string;
  prescription: unknown;
  onChange: (value: unknown) => void;
}>) {
  const step = readStep(prescription, which);
  const prefix = `verification-param-${which}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${prefix}-criterion`} className="text-[13px] text-label-secondary">
        {title}
      </Label>
      <Textarea
        id={`${prefix}-criterion`}
        value={step.criterion}
        rows={2}
        placeholder={hint}
        onChange={(event) =>
          onChange(prescriptionWithStep(prescription, which, { ...step, criterion: event.target.value }))
        }
        data-testid={`${prefix}-criterion-input`}
      />
      <ChipListEditor
        items={step.next}
        onChange={(next) => onChange(prescriptionWithStep(prescription, which, { ...step, next }))}
        addLabel="Dodaj kolejny krok"
        inputLabel={`${title}: kolejny krok`}
        placeholder="np. wariant w klęku albo klucz ćwiczenia"
        testIdPrefix={`${prefix}-next`}
        multiline
      />
    </div>
  );
}

/**
 * Sprzęt, cel, zakresy dawki, progresja i regresja rekordu 3.3, edytowane w miejscu.
 * Tryb strony zmienia wybór „Strona ciała” wyżej, razem z kolumną. Tempo i zakres ruchu mają pola w sekcji
 * „Tempo, obciążenie…”; wartość z paczki pokazujemy tu tylko jako punkt odniesienia.
 */
export function V33ParameterContent({ enrichment, onEnrichmentPathChange }: V33ParameterContentProps) {
  const prescription = enrichment.prescription ?? null;
  const setPrescription = (value: unknown) => onEnrichmentPathChange('prescription', value);
  const goal = typeof prescription?.goal === 'string' ? prescription.goal : null;
  const isKnownGoal = PRESCRIPTION_GOALS.some((option) => option.code === goal);
  const params = (prescription?.params ?? {}) as Record<string, { default?: unknown } | undefined>;
  const packageTempo = params.tempo?.default != null ? String(params.tempo.default) : null;
  const packageRom = typeof params.rom?.default === 'string' ? params.rom.default : null;

  return (
    <StageSection
      title="Sprzęt, cel i zakresy"
      hint="Zmiany zapisują się w treści ćwiczenia razem z resztą weryfikacji."
      data-testid="verification-param-content"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="verification-param-goal" className="text-[13px] text-label-secondary">
            Cel ćwiczenia
          </Label>
          <Select
            data-testid="verification-param-goal-select"
            value={goal ?? NO_GOAL}
            onValueChange={(value) =>
              setPrescription(prescriptionWithGoal(prescription, value === NO_GOAL ? null : value))
            }
          >
            <SelectTrigger id="verification-param-goal" data-testid="verification-param-goal-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_GOAL}>Bez celu</SelectItem>
              {!isKnownGoal && goal && <SelectItem value={goal}>{goal}</SelectItem>}
              {PRESCRIPTION_GOALS.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-[12px] bg-card p-3 [--input:var(--grouped-tertiary)]">
        <EquipmentItemsEditor
          items={enrichment.equipment_items ?? []}
          onChange={(items) => onEnrichmentPathChange('equipment_items', items)}
          testIdPrefix="verification-param-equipment-items"
        />
      </div>

      <div className="flex flex-col gap-2" data-testid="verification-param-ranges">
        <p className="text-[13px] text-label-secondary">
          Zakres ćwiczenia: od–do. Wartości w polach wyżej spoza zakresu dostaną sugestię.
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_88px_88px] items-center gap-x-3 gap-y-2 sm:grid-cols-[220px_96px_96px_minmax(0,1fr)]">
          {RANGE_KEYS.map(({ key, label, unit }) => {
            const range = readRange(prescription, key);
            return (
              <div key={key} className="contents">
                <span className="text-[14px] text-foreground">
                  {label}
                  {unit ? ` (${unit})` : ''}
                </span>
                {(['min', 'max'] as const).map((bound) => (
                  <Input
                    key={bound}
                    data-testid={`verification-param-range-${key}-${bound}-input`}
                    inputMode="decimal"
                    aria-label={`${label}: ${bound === 'min' ? 'od' : 'do'}`}
                    placeholder={bound === 'min' ? 'od' : 'do'}
                    value={range[bound] ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const value = parseBound(raw);
                      if (raw.trim() !== '' && value == null) return;
                      setPrescription(prescriptionWithBound(prescription, key, bound, value));
                    }}
                    className="tabular-nums"
                  />
                ))}
                <span className="col-span-3 text-[12px] text-label-secondary sm:col-span-1">
                  {range.default != null ? `z paczki: ${range.default}${unit ? ` ${unit}` : ''}` : ''}
                </span>
              </div>
            );
          })}
        </div>
        {(packageTempo || packageRom) && (
          <p className="text-[12px] text-label-secondary" data-testid="verification-param-package-tempo-rom">
            Z paczki:{' '}
            {[
              packageTempo ? `tempo ${packageTempo}` : null,
              packageRom ? `zakres ruchu: ${romLabel(packageRom)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            . Tempo i zakres ruchu ustawiasz w polach wyżej.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StepEditor
          which="progression"
          title="Progresja: kiedy trudniej"
          hint="Kryterium przejścia, np. dwie sesje bez bólu ponad 5/10"
          prescription={prescription}
          onChange={setPrescription}
        />
        <StepEditor
          which="regression"
          title="Regresja: kiedy łatwiej"
          hint="Kryterium cofnięcia, np. ból ponad 5/10"
          prescription={prescription}
          onChange={setPrescription}
        />
      </div>
    </StageSection>
  );
}
