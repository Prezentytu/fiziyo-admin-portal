'use client';

import { useMemo, useState } from 'react';
import { Calendar, Zap, ArrowRight, Minus, Plus, Info } from 'lucide-react';
import { addDays, addWeeks, differenceInDays, format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { getDefaultDaysForFrequency } from './utils/scheduleUtils';
import type { Frequency } from './types';

interface ScheduleStepProps {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly frequency: Frequency;
  readonly onStartDateChange: (date: Date) => void;
  readonly onEndDateChange: (date: Date) => void;
  readonly onFrequencyChange: (frequency: Frequency) => void;
}

const DAYS = [
  { key: 'monday', label: 'Pn', api: 'MONDAY' },
  { key: 'tuesday', label: 'Wt', api: 'TUESDAY' },
  { key: 'wednesday', label: 'Śr', api: 'WEDNESDAY' },
  { key: 'thursday', label: 'Cz', api: 'THURSDAY' },
  { key: 'friday', label: 'Pt', api: 'FRIDAY' },
  { key: 'saturday', label: 'So', api: 'SATURDAY' },
  { key: 'sunday', label: 'Nd', api: 'SUNDAY' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];
type FrequencyType = 'DAILY_1X' | 'DAILY_2X' | 'WEEKLY_3X' | 'SPECIFIC_DAYS';
type DurationType = 'WEEKS_2' | 'WEEKS_4' | 'WEEKS_8' | 'CUSTOM';

interface SchedulePayload {
  frequencyType: 'DAILY' | 'SPECIFIC_DAYS';
  timesPerDay: number;
  selectedDays: string[];
  duration: DurationType;
}

interface CardOptionProps {
  readonly checked: boolean;
  readonly label: string;
  readonly onSelect: () => void;
  readonly name: string;
  readonly testId: string;
}

function CardOption({ checked, label, onSelect, name, testId }: CardOptionProps) {
  return (
    <label
      className={cn(
        'flex items-center justify-center p-3.5 border rounded-xl text-sm transition-all cursor-pointer text-center select-none h-full',
        checked
          ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20' // Mocne wyróżnienie
          : 'border-border/80 bg-surface-light/40 text-muted-foreground font-medium hover:text-foreground hover:bg-surface-light hover:border-border' // Bardziej klikalne niż tło
      )}
      data-testid={testId}
    >
      <input type="radio" className="sr-only" checked={checked} onChange={onSelect} name={name} aria-label={label} />
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

function getSelectedDaysCount(frequency: Frequency): number {
  return [
    frequency.monday,
    frequency.tuesday,
    frequency.wednesday,
    frequency.thursday,
    frequency.friday,
    frequency.saturday,
    frequency.sunday,
  ].filter(Boolean).length;
}

function detectFrequencyType(frequency: Frequency): FrequencyType {
  const selectedDaysCount = getSelectedDaysCount(frequency);
  const hasSpecificDays = selectedDaysCount > 0;
  
  if (frequency.isFlexible === false || hasSpecificDays) return 'SPECIFIC_DAYS';
  
  const tpw = frequency.timesPerWeek ?? 7;
  const tpd = frequency.timesPerDay ?? 1;

  if (tpw === 7) {
    if (tpd >= 2) return 'DAILY_2X';
    return 'DAILY_1X';
  }
  
  return 'WEEKLY_3X';
}

function detectDurationType(startDate: Date, endDate: Date): DurationType {
  const days = differenceInDays(endDate, startDate);
  if (days >= 12 && days <= 16) return 'WEEKS_2';
  if (days >= 26 && days <= 32) return 'WEEKS_4';
  if (days >= 54 && days <= 60) return 'WEEKS_8';
  return 'CUSTOM';
}

function pluralizeDay(dayCount: number): string {
  return dayCount === 1 ? 'dzień' : 'dni';
}

export function ScheduleStep({
  startDate,
  endDate,
  frequency,
  onStartDateChange,
  onEndDateChange,
  onFrequencyChange,
}: ScheduleStepProps) {
  const [durationType, setDurationType] = useState<DurationType>(() => detectDurationType(startDate, endDate));
  const [isCustomDateDirty, setIsCustomDateDirty] = useState(false);

  const selectedDaysCount = useMemo(() => getSelectedDaysCount(frequency), [frequency]);
  const frequencyType = useMemo(() => detectFrequencyType(frequency), [frequency]);

  const durationDays = Math.max(1, differenceInDays(endDate, startDate));
  const effectiveWeeklyFrequency = frequencyType === 'SPECIFIC_DAYS' ? selectedDaysCount : (frequency.timesPerWeek ?? 7);
  const totalSessions = Math.round((durationDays / 7) * effectiveWeeklyFrequency * (frequency.timesPerDay ?? 1));

  const schedulePayload: SchedulePayload = useMemo(
    () => ({
      frequencyType: frequencyType === 'SPECIFIC_DAYS' ? 'SPECIFIC_DAYS' : 'DAILY',
      timesPerDay: frequency.timesPerDay ?? 1,
      selectedDays: DAYS.filter((day) => frequency[day.key]).map((day) => day.api),
      duration: durationType,
    }),
    [durationType, frequency, frequencyType]
  );

  const clearSelectedDays = () => ({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });

  const applyFrequencyType = (nextType: FrequencyType) => {
    if (nextType === 'SPECIFIC_DAYS') {
      const defaultDays = selectedDaysCount > 0 ? null : getDefaultDaysForFrequency(3);
      const newFreq = {
        ...frequency,
        timesPerDay: frequency.timesPerDay || 1,
        timesPerWeek: selectedDaysCount || 3,
        isFlexible: false,
      };
      
      if (defaultDays) {
        Object.assign(newFreq, defaultDays);
      }
      
      onFrequencyChange(newFreq);
      return;
    }

    if (nextType === 'WEEKLY_3X') {
      onFrequencyChange({
        ...frequency,
        timesPerDay: 1,
        timesPerWeek: 3,
        isFlexible: true,
        ...clearSelectedDays(),
      });
      return;
    }

    onFrequencyChange({
      ...frequency,
      timesPerDay: nextType === 'DAILY_2X' ? 2 : 1,
      timesPerWeek: 7,
      isFlexible: true,
      ...clearSelectedDays(),
    });
  };

  const applyDurationType = (nextType: DurationType) => {
    setDurationType(nextType);
    setIsCustomDateDirty(false);

    if (nextType === 'WEEKS_2') {
      onEndDateChange(addWeeks(startDate, 2));
      return;
    }
    if (nextType === 'WEEKS_4') {
      onEndDateChange(addWeeks(startDate, 4));
      return;
    }
    if (nextType === 'WEEKS_8') {
      onEndDateChange(addWeeks(startDate, 8));
      return;
    }
  };

  const setTimesPerDay = (value: number) => {
    onFrequencyChange({
      ...frequency,
      timesPerDay: value,
    });
  };

  const setTimesPerWeek = (value: number) => {
    if (frequencyType === 'SPECIFIC_DAYS') return;
    onFrequencyChange({
      ...frequency,
      timesPerWeek: value,
      isFlexible: true,
      ...clearSelectedDays(),
    });
  };

  const toggleDay = (day: DayKey) => {
    if (frequencyType !== 'SPECIFIC_DAYS') return;
    const nextFrequency = {
      ...frequency,
      [day]: !frequency[day],
      isFlexible: false,
    };
    const nextDaysCount = getSelectedDaysCount(nextFrequency);
    onFrequencyChange({
      ...nextFrequency,
      timesPerWeek: nextDaysCount,
    });
  };

  const handleCustomEndDate = (dateString: string) => {
    setIsCustomDateDirty(true);
    setDurationType('CUSTOM');
    onEndDateChange(new Date(dateString));
  };

  const daysToStart = differenceInDays(startOfDay(startDate), startOfDay(new Date()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* LEWA KOLUMNA: CZĘSTOTLIWOŚĆ */}
      <div className="flex flex-col min-h-0 h-full bg-surface border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 shrink-0 border-b border-border/40 pb-4">
            <Zap className="w-5 h-5 text-muted-foreground" /> Częstotliwość ćwiczeń
          </h3>
          
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <CardOption
              checked={frequencyType === 'DAILY_1X'}
              label="Codziennie"
              onSelect={() => applyFrequencyType('DAILY_1X')}
              name="frequency"
              testId="assign-schedule-frequency-daily-1x"
            />
            <CardOption
              checked={frequencyType === 'DAILY_2X'}
              label="2x dziennie"
              onSelect={() => applyFrequencyType('DAILY_2X')}
              name="frequency"
              testId="assign-schedule-frequency-daily-2x"
            />
            <CardOption
              checked={frequencyType === 'WEEKLY_3X'}
              label={frequencyType === 'WEEKLY_3X' && frequency.timesPerWeek ? `${frequency.timesPerWeek}x w tygodniu` : '3x w tygodniu'}
              onSelect={() => applyFrequencyType('WEEKLY_3X')}
              name="frequency"
              testId="assign-schedule-frequency-weekly-3x"
            />
            <CardOption
              checked={frequencyType === 'SPECIFIC_DAYS'}
              label="Wybrane dni"
              onSelect={() => applyFrequencyType('SPECIFIC_DAYS')}
              name="frequency"
              testId="assign-schedule-specific-days-toggle"
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
                {DAYS.map((day) => {
                  const isSelected = frequency[day.key] === true;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={cn(
                        'w-11 h-11 rounded-full border text-sm font-semibold transition-all shadow-sm',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border/60 bg-surface text-muted-foreground hover:border-border hover:bg-surface-hover hover:text-foreground'
                      )}
                      data-testid={`assign-schedule-day-${day.key}`}
                      title={day.label}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
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
                onChange={setTimesPerWeek}
                disabled={frequencyType === 'SPECIFIC_DAYS'}
                testIdPrefix="assign-schedule-times-per-week"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
                Razy w ciągu dnia
              </label>
              <NumberControl
                value={Math.max(1, frequency.timesPerDay || 1)}
                min={1}
                max={5}
                onChange={setTimesPerDay}
                testIdPrefix="assign-schedule-times-per-day"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PRAWA KOLUMNA: OKRES I PODSUMOWANIE */}
      <div className="flex flex-col min-h-0 h-full gap-6">
        {/* SEKCJA 2: OKRES TRWANIA */}
        <div className="flex flex-col min-h-0 bg-surface border border-border/60 rounded-2xl shadow-sm flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 shrink-0 border-b border-border/40 pb-4">
              <Calendar className="w-5 h-5 text-muted-foreground" /> Okres trwania planu
            </h3>
            
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <CardOption
                checked={durationType === 'WEEKS_2' && !isCustomDateDirty}
                label="2 tygodnie"
                onSelect={() => applyDurationType('WEEKS_2')}
                name="duration"
                testId="assign-schedule-duration-2-weeks"
              />
              <CardOption
                checked={durationType === 'WEEKS_4' && !isCustomDateDirty}
                label="4 tygodnie"
                onSelect={() => applyDurationType('WEEKS_4')}
                name="duration"
                testId="assign-schedule-duration-4-weeks"
              />
              <CardOption
                checked={durationType === 'WEEKS_8' && !isCustomDateDirty}
                label="8 tygodni"
                onSelect={() => applyDurationType('WEEKS_8')}
                name="duration"
                testId="assign-schedule-duration-8-weeks"
              />
            </div>

            <div className="pt-6 mt-auto shrink-0">
              <div className="bg-surface-light/40 border border-border/40 rounded-xl p-4 md:p-5">
                 <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Data rozpoczęcia</label>
                    <Input
                      type="date"
                      value={format(startDate, 'yyyy-MM-dd')}
                      onChange={(event) => {
                        const nextStartDate = new Date(event.target.value);
                        onStartDateChange(nextStartDate);
                        if (nextStartDate > endDate) {
                          onEndDateChange(addDays(nextStartDate, 30));
                        }
                      }}
                      className="bg-surface border-border/60 focus:bg-surface text-sm transition-colors"
                      data-testid="assign-schedule-start-date"
                    />
                  </div>

                  <ArrowRight className="hidden md:block w-4 h-4 text-muted-foreground/40 mt-6" />

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Data zakończenia</label>
                    <Input
                      type="date"
                      value={format(endDate, 'yyyy-MM-dd')}
                      min={format(startDate, 'yyyy-MM-dd')}
                      onChange={(event) => handleCustomEndDate(event.target.value)}
                      className="bg-surface border-border/60 focus:bg-surface text-sm transition-colors"
                      data-testid="assign-schedule-end-date"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PODSUMOWANIE - STONOWANE */}
        <div className="bg-surface border border-border/60 rounded-xl p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 bg-surface-light rounded-full flex items-center justify-center shrink-0 border border-border/40">
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Podsumowanie planu</div>
              <div className="text-base font-semibold text-foreground">
                {durationDays} {pluralizeDay(durationDays)} <span className="text-muted-foreground/30 mx-1.5">•</span> ~{totalSessions} sesji
              </div>
            </div>
          </div>
          {daysToStart > 0 && (
            <div className="text-xs text-muted-foreground bg-surface-light px-3 py-1.5 rounded-lg font-medium whitespace-nowrap border border-border/40">
              Start za {daysToStart} {pluralizeDay(daysToStart)}
            </div>
          )}
        </div>
      </div>

      <div className="sr-only" data-testid="assign-schedule-payload-preview">
        {JSON.stringify(schedulePayload)}
      </div>
    </div>
  );
}
