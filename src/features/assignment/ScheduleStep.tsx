'use client';

import { useMemo, useState } from 'react';
import { Calendar, Zap, ArrowRight, MessageSquareText } from 'lucide-react';
import { addWeeks, differenceInDays, format } from 'date-fns';
import { ScheduleSummary } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatEstimatedTime } from '@/utils/exerciseTime';
import { getDefaultPlanEndDate } from './utils/scheduleUtils';
import { FREQUENCY_DAYS, detectFrequencyType } from './utils/frequencyPresets';
import { CardOption, FrequencyFields } from './FrequencyFields';
import { ASSIGNMENT_NOTE_MAX_LENGTH } from './utils/assignmentWizardUtils';
import type { Frequency } from './types';

interface ScheduleStepProps {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly frequency: Frequency;
  readonly estimatedSessionDurationSeconds: number;
  readonly onStartDateChange: (date: Date) => void;
  readonly onEndDateChange: (date: Date) => void;
  readonly onFrequencyChange: (frequency: Frequency) => void;
  /** Notatka do zestawu widoczna dla pacjenta. Bez `onNoteChange` pole jest ukryte. */
  readonly note?: string;
  readonly onNoteChange?: (note: string) => void;
}

type DurationType = 'WEEKS_2' | 'WEEKS_4' | 'WEEKS_8' | 'CUSTOM';

interface SchedulePayload {
  frequencyType: 'DAILY' | 'SPECIFIC_DAYS';
  timesPerDay: number;
  selectedDays: string[];
  duration: DurationType;
}

function detectDurationType(startDate: Date, endDate: Date): DurationType {
  const days = differenceInDays(endDate, startDate);
  if (days >= 12 && days <= 16) return 'WEEKS_2';
  if (days >= 26 && days <= 32) return 'WEEKS_4';
  if (days >= 54 && days <= 60) return 'WEEKS_8';
  return 'CUSTOM';
}

export function ScheduleStep({
  startDate,
  endDate,
  frequency,
  estimatedSessionDurationSeconds,
  onStartDateChange,
  onEndDateChange,
  onFrequencyChange,
  note = '',
  onNoteChange,
}: ScheduleStepProps) {
  const [durationType, setDurationType] = useState<DurationType>(() => detectDurationType(startDate, endDate));
  const [isCustomDateDirty, setIsCustomDateDirty] = useState(false);

  const frequencyType = useMemo(() => detectFrequencyType(frequency), [frequency]);

  const estimatedDailyDurationSeconds = estimatedSessionDurationSeconds * Math.max(1, frequency.timesPerDay ?? 1);

  const schedulePayload: SchedulePayload = useMemo(
    () => ({
      frequencyType: frequencyType === 'SPECIFIC_DAYS' ? 'SPECIFIC_DAYS' : 'DAILY',
      timesPerDay: frequency.timesPerDay ?? 1,
      selectedDays: FREQUENCY_DAYS.filter((day) => frequency[day.key]).map((day) => day.api),
      duration: durationType,
    }),
    [durationType, frequency, frequencyType]
  );

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

  const handleCustomEndDate = (dateString: string) => {
    setIsCustomDateDirty(true);
    setDurationType('CUSTOM');
    onEndDateChange(new Date(dateString));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* LEWA KOLUMNA: CZĘSTOTLIWOŚĆ */}
      <div className="flex flex-col min-h-0 h-full bg-surface border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 shrink-0 border-b border-border/40 pb-4">
            <Zap className="w-5 h-5 text-muted-foreground" /> Częstotliwość ćwiczeń
          </h3>

          <FrequencyFields frequency={frequency} onFrequencyChange={onFrequencyChange} />

          <div
            className="bg-surface-light/40 border border-border/40 rounded-xl px-4 py-3 flex flex-col gap-1.5"
            data-testid="assign-schedule-session-duration-summary"
          >
            <div className="text-xs text-muted-foreground">Szacowany czas jednej sesji</div>
            <div className="text-sm font-semibold text-foreground">{formatEstimatedTime(estimatedSessionDurationSeconds)}</div>
            <div className="text-xs text-muted-foreground">
              Łącznie dziennie: <span className="text-foreground font-medium">{formatEstimatedTime(estimatedDailyDurationSeconds)}</span>
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
                          onEndDateChange(getDefaultPlanEndDate(nextStartDate));
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
        <ScheduleSummary
          startDate={startDate}
          endDate={endDate}
          frequency={frequency}
          variant="inline-highlight"
          showSessions
          showStartInDays
          testIdPrefix="assign"
        />

        {onNoteChange ? (
          <div className="shrink-0 bg-surface border border-border/60 rounded-2xl shadow-sm p-6 flex flex-col gap-3">
            <label
              htmlFor="assign-schedule-note"
              className="text-base font-semibold text-foreground flex items-center gap-2"
            >
              <MessageSquareText className="w-5 h-5 text-muted-foreground" /> Notatka dla pacjenta
              <span className="text-xs font-normal text-muted-foreground">(opcjonalnie)</span>
            </label>
            <Textarea
              id="assign-schedule-note"
              value={note}
              maxLength={ASSIGNMENT_NOTE_MAX_LENGTH}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Np. ćwicz wolno, przerwij, gdy ból przekroczy 3/10."
              aria-describedby="assign-schedule-note-hint"
              data-testid="assign-schedule-note"
            />
            <p id="assign-schedule-note-hint" className="text-xs text-muted-foreground flex justify-between gap-3">
              <span>Pacjent zobaczy ją w aplikacji nad listą ćwiczeń.</span>
              <span className="tabular-nums shrink-0">
                {note.length}/{ASSIGNMENT_NOTE_MAX_LENGTH}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <div className="sr-only" data-testid="assign-schedule-payload-preview">
        {JSON.stringify(schedulePayload)}
      </div>
    </div>
  );
}
