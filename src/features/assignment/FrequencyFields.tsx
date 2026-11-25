'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Frequency } from './types';
import {
  FREQUENCY_DAYS,
  applyFrequencyType,
  detectFrequencyType,
  getSelectedDaysCount,
  setFrequencyTimesPerWeek,
  toggleFrequencyDay,
} from './utils/frequencyPresets';

interface CardOptionProps {
  readonly checked: boolean;
  readonly label: string;
  readonly onSelect: () => void;
  readonly name: string;
  readonly testId: string;
}

export function CardOption({ checked, label, onSelect, name, testId }: CardOptionProps) {
  return (
    <label
      className={cn(
        'flex items-center justify-center p-3.5 border rounded-xl text-sm transition-all cursor-pointer text-center select-none h-full',
        checked
          ? 'border-tint-fill bg-tint-fill text-on-tint font-semibold shadow-md shadow-primary/20' // Mocne wyróżnienie
          : 'border-border/80 bg-surface-light/40 text-muted-foreground font-medium hover:text-foreground hover:bg-surface-light hover:border-border' // Bardziej klikalne niż tło
      )}
      data-testid={testId}
    >
      <input
        type="radio"
        className="sr-only"
        checked={checked}
        onChange={onSelect}
        name={name}
        aria-label={label}
        data-testid={`${testId}-input`}
      />
      <span>{label}</span>
    </label>
  );
}

interface NumberControlProps {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
  readonly disabled?: boolean;
  readonly testIdPrefix: string;
}

function NumberControl({ value, min, max, onChange, disabled = false, testIdPrefix }: NumberControlProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={cn(
        'flex items-center justify-between bg-surface-light/30 border border-border/80 rounded-xl p-1.5 transition-opacity',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50 border border-border/50 shadow-sm"
        data-testid={`${testIdPrefix}-dec`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <div className="text-xl font-bold tabular-nums text-foreground min-w-[3ch] text-center">{value}</div>
      <button
        type="button"
        onClick={increment}
        disabled={disabled || value >= max}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50 border border-border/50 shadow-sm"
        data-testid={`${testIdPrefix}-inc`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

interface FrequencyFieldsProps {
  readonly frequency: Frequency;
  readonly onFrequencyChange: (frequency: Frequency) => void;
  /** Prefiks lokatorów E2E: kreator przypisania `assign-schedule`, szablon zestawu `set-frequency`. */
  readonly testIdPrefix?: string;
}

/**
 * Częstotliwość ćwiczeń: tryb (codziennie, N razy w tygodniu, wybrane dni) i liczba sesji.
 * Jeden komponent dla harmonogramu planu pacjenta i domyślnego harmonogramu szablonu.
 */
export function FrequencyFields({
  frequency,
  onFrequencyChange,
  testIdPrefix = 'assign-schedule',
}: FrequencyFieldsProps) {
  const selectedDaysCount = getSelectedDaysCount(frequency);
  const frequencyType = detectFrequencyType(frequency);
  const hasSpecificDaysError = frequencyType === 'SPECIFIC_DAYS' && selectedDaysCount === 0;
  const radioName = testIdPrefix === 'assign-schedule' ? 'frequency' : `${testIdPrefix}-frequency`;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <CardOption
          checked={frequencyType === 'DAILY_1X'}
          label="Zalecenia — 7 razy w tygodniu"
          onSelect={() => onFrequencyChange(applyFrequencyType(frequency, 'DAILY_1X'))}
          name={radioName}
          testId={`${testIdPrefix}-frequency-daily-1x`}
        />
        <CardOption
          checked={frequencyType === 'DAILY_2X'}
          label="Zalecenia — 7 razy w tygodniu, 2× dziennie"
          onSelect={() => onFrequencyChange(applyFrequencyType(frequency, 'DAILY_2X'))}
          name={radioName}
          testId={`${testIdPrefix}-frequency-daily-2x`}
        />
        <CardOption
          checked={frequencyType === 'WEEKLY_3X'}
          label={`Zalecenia — ${frequency.timesPerWeek ?? 3} razy w tygodniu`}
          onSelect={() => onFrequencyChange(applyFrequencyType(frequency, 'WEEKLY_3X'))}
          name={radioName}
          testId={`${testIdPrefix}-frequency-weekly-3x`}
        />
        <CardOption
          checked={frequencyType === 'SPECIFIC_DAYS'}
          label="Harmonogram — wybrane dni"
          onSelect={() => onFrequencyChange(applyFrequencyType(frequency, 'SPECIFIC_DAYS'))}
          name={radioName}
          testId={`${testIdPrefix}-specific-days-toggle`}
        />
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out shrink-0',
          frequencyType === 'SPECIFIC_DAYS' ? 'max-h-[200px] opacity-100 mt-2' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4 bg-surface-light/40 border border-border/40 rounded-xl flex flex-col items-center justify-center gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            {FREQUENCY_DAYS.map((day) => {
              const isSelected = frequency[day.key] === true;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => onFrequencyChange(toggleFrequencyDay(frequency, day.key))}
                  aria-pressed={isSelected}
                  className={cn(
                    'w-11 h-11 rounded-full border text-sm font-semibold transition-all shadow-sm',
                    isSelected
                      ? 'border-tint-fill bg-tint-fill text-on-tint'
                      : 'border-border/60 bg-surface text-muted-foreground hover:border-border hover:bg-surface-hover hover:text-foreground'
                  )}
                  data-testid={`${testIdPrefix}-day-${day.key}`}
                  title={day.label}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          {hasSpecificDaysError && (
            <p className="text-sm text-destructive" role="alert" data-testid={`${testIdPrefix}-specific-days-error`}>
              Wybierz co najmniej jeden dzień harmonogramu.
            </p>
          )}
        </div>
      </div>

      {/* Controls przylegają naturalnie, bez mt-auto dystansującego je na sam dół */}
      <div className="pt-6 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 shrink-0">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
            Sesje w tygodniu
          </label>
          <NumberControl
            value={Math.max(1, frequencyType === 'SPECIFIC_DAYS' ? selectedDaysCount || 1 : (frequency.timesPerWeek ?? 3))}
            min={1}
            max={7}
            onChange={(value) => onFrequencyChange(setFrequencyTimesPerWeek(frequency, value))}
            disabled={frequencyType === 'SPECIFIC_DAYS'}
            testIdPrefix={`${testIdPrefix}-times-per-week`}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
            Sesje w ciągu dnia
          </label>
          <NumberControl
            value={Math.max(1, frequency.timesPerDay || 1)}
            min={1}
            max={5}
            onChange={(value) => onFrequencyChange({ ...frequency, timesPerDay: value })}
            testIdPrefix={`${testIdPrefix}-times-per-day`}
          />
        </div>
      </div>
    </>
  );
}
