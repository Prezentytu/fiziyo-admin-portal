'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { Loader2, Calendar, Zap, Info, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, addWeeks, differenceInDays, format, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getDefaultDaysForFrequency } from '@/features/assignment/utils/scheduleUtils';

import { UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type { PatientAssignment, Frequency } from './PatientAssignmentCard';

interface EditAssignmentScheduleDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly assignment: PatientAssignment | null;
  readonly patientId: string;
  readonly onSuccess?: () => void;
}

const DAYS = [
  { key: 'monday', label: 'Pn', fullLabel: 'Poniedziałek' },
  { key: 'tuesday', label: 'Wt', fullLabel: 'Wtorek' },
  { key: 'wednesday', label: 'Śr', fullLabel: 'Środa' },
  { key: 'thursday', label: 'Cz', fullLabel: 'Czwartek' },
  { key: 'friday', label: 'Pt', fullLabel: 'Piątek' },
  { key: 'saturday', label: 'So', fullLabel: 'Sobota' },
  { key: 'sunday', label: 'Nd', fullLabel: 'Niedziela' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];
type FrequencyType = 'DAILY_1X' | 'DAILY_2X' | 'WEEKLY_3X' | 'SPECIFIC_DAYS';
type DurationType = 'WEEKS_2' | 'WEEKS_4' | 'WEEKS_8' | 'CUSTOM';

interface EditableFrequency {
  timesPerDay: number;
  timesPerWeek: number;
  breakBetweenSets: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

const EMPTY_DAYS: Pick<
  EditableFrequency,
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
> = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
};

function parseDateInputValue(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function toDateInputValue(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function getSelectedDaysCount(frequency: EditableFrequency): number {
  return DAYS.filter((day) => frequency[day.key]).length;
}

function normalizeFrequencyForCompare(frequency: EditableFrequency): EditableFrequency {
  return {
    timesPerDay: frequency.timesPerDay,
    timesPerWeek: frequency.timesPerWeek,
    breakBetweenSets: frequency.breakBetweenSets,
    monday: frequency.monday,
    tuesday: frequency.tuesday,
    wednesday: frequency.wednesday,
    thursday: frequency.thursday,
    friday: frequency.friday,
    saturday: frequency.saturday,
    sunday: frequency.sunday,
  };
}

function frequencyToValue(freq?: Frequency): EditableFrequency {
  const initialValue: EditableFrequency = {
    timesPerDay: Math.max(1, freq?.timesPerDay ?? 1),
    timesPerWeek: Math.max(1, freq?.timesPerWeek ?? 7),
    breakBetweenSets: Math.max(0, freq?.breakBetweenSets ?? 4),
    monday: freq?.monday ?? false,
    tuesday: freq?.tuesday ?? false,
    wednesday: freq?.wednesday ?? false,
    thursday: freq?.thursday ?? false,
    friday: freq?.friday ?? false,
    saturday: freq?.saturday ?? false,
    sunday: freq?.sunday ?? false,
  };

  const selectedDaysCount = getSelectedDaysCount(initialValue);
  if (selectedDaysCount > 0) {
    return {
      ...initialValue,
      timesPerWeek: selectedDaysCount,
    };
  }

  return initialValue;
}

function detectFrequencyType(frequency: EditableFrequency): FrequencyType {
  const selectedDaysCount = getSelectedDaysCount(frequency);
  if (selectedDaysCount > 0) return 'SPECIFIC_DAYS';

  if (frequency.timesPerWeek >= 7) {
    return frequency.timesPerDay >= 2 ? 'DAILY_2X' : 'DAILY_1X';
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
        'flex min-h-12 items-center justify-center rounded-xl border p-3 text-center text-sm font-medium transition-all select-none cursor-pointer',
        checked
          ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
          : 'border-border/70 bg-surface text-muted-foreground hover:bg-surface-light hover:text-foreground'
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
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border border-border/70 bg-surface-light/40 p-1.5',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-lg border-border/60"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        data-testid={`${testIdPrefix}-dec`}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-[3ch] text-center text-xl font-semibold tabular-nums text-foreground">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-lg border-border/60"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        data-testid={`${testIdPrefix}-inc`}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EditAssignmentScheduleDialog({
  open,
  onOpenChange,
  assignment,
  patientId,
  onSuccess,
}: EditAssignmentScheduleDialogProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addWeeks(new Date(), 4));
  const [frequency, setFrequency] = useState<EditableFrequency>(() => frequencyToValue());
  const [durationType, setDurationType] = useState<DurationType>('WEEKS_4');
  const [isCustomDateDirty, setIsCustomDateDirty] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const hasChanges = useMemo(() => {
    if (!open || !assignment) return false;

    const origStartDate = assignment.startDate ? new Date(assignment.startDate) : new Date();
    const origEndDate = assignment.endDate ? new Date(assignment.endDate) : addWeeks(origStartDate, 4);
    const origFreq = frequencyToValue(assignment.frequency);

    return (
      toDateInputValue(startDate) !== toDateInputValue(origStartDate) ||
      toDateInputValue(endDate) !== toDateInputValue(origEndDate) ||
      JSON.stringify(normalizeFrequencyForCompare(frequency)) !== JSON.stringify(normalizeFrequencyForCompare(origFreq))
    );
  }, [open, assignment, startDate, endDate, frequency]);

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Initialize state when assignment changes
  useEffect(() => {
    if (assignment && open) {
      const nextStartDate = assignment.startDate ? new Date(assignment.startDate) : new Date();
      const nextEndDate = assignment.endDate ? new Date(assignment.endDate) : addWeeks(nextStartDate, 4);
      const nextFrequency = frequencyToValue(assignment.frequency);
      const nextDurationType = detectDurationType(nextStartDate, nextEndDate);

      setStartDate(nextStartDate);
      setEndDate(nextEndDate);
      setFrequency(nextFrequency);
      setDurationType(nextDurationType);
      setIsCustomDateDirty(nextDurationType === 'CUSTOM');
    }
  }, [assignment, open]);

  // Mutation
  const [updateAssignment, { loading }] = useMutation(UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION);

  const selectedDaysCount = useMemo(() => getSelectedDaysCount(frequency), [frequency]);
  const frequencyType = useMemo(() => detectFrequencyType(frequency), [frequency]);
  const durationDays = Math.max(1, differenceInDays(startOfDay(endDate), startOfDay(startDate)));
  const effectiveWeeklyFrequency = frequencyType === 'SPECIFIC_DAYS' ? selectedDaysCount : frequency.timesPerWeek;
  const totalSessions = Math.round((durationDays / 7) * effectiveWeeklyFrequency * frequency.timesPerDay);
  const daysToStart = differenceInDays(startOfDay(startDate), startOfDay(new Date()));
  const selectedDayLabels = DAYS.filter((day) => frequency[day.key]).map((day) => day.label).join(', ');
  const specificDaysSuffix = selectedDayLabels ? ` (${selectedDayLabels})` : '';
  const summaryFrequencyText =
    frequencyType === 'SPECIFIC_DAYS'
      ? `${selectedDaysCount} dni/tydzień${specificDaysSuffix}`
      : `${frequency.timesPerWeek}x/tydzień, ${frequency.timesPerDay}x dziennie`;
  const canSave = !loading && !!assignment && !(frequencyType === 'SPECIFIC_DAYS' && selectedDaysCount === 0);

  const applyFrequencyType = (nextType: FrequencyType) => {
    if (nextType === 'SPECIFIC_DAYS') {
      setFrequency((prev) => {
        const currentSelectedDaysCount = getSelectedDaysCount(prev);
        if (currentSelectedDaysCount > 0) {
          return {
            ...prev,
            timesPerWeek: currentSelectedDaysCount,
          };
        }

        return {
          ...prev,
          timesPerDay: Math.max(1, prev.timesPerDay),
          timesPerWeek: 3,
          ...getDefaultDaysForFrequency(3),
        };
      });
      return;
    }

    if (nextType === 'WEEKLY_3X') {
      setFrequency((prev) => ({
        ...prev,
        ...EMPTY_DAYS,
        timesPerDay: 1,
        timesPerWeek: 3,
      }));
      return;
    }

    setFrequency((prev) => ({
      ...prev,
      ...EMPTY_DAYS,
      timesPerWeek: 7,
      timesPerDay: nextType === 'DAILY_2X' ? 2 : 1,
    }));
  };

  const applyDurationType = (nextType: DurationType) => {
    setDurationType(nextType);
    setIsCustomDateDirty(false);

    if (nextType === 'WEEKS_2') {
      setEndDate(addWeeks(startDate, 2));
      return;
    }
    if (nextType === 'WEEKS_4') {
      setEndDate(addWeeks(startDate, 4));
      return;
    }
    if (nextType === 'WEEKS_8') {
      setEndDate(addWeeks(startDate, 8));
    }
  };

  const toggleDay = (day: DayKey) => {
    setFrequency((prev) => {
      const next = {
        ...prev,
        [day]: !prev[day],
      };
      const nextSelectedDaysCount = getSelectedDaysCount(next);
      return {
        ...next,
        timesPerWeek: nextSelectedDaysCount,
      };
    });
  };

  const handleStartDateChange = (value: string) => {
    const nextStartDate = parseDateInputValue(value);
    setStartDate(nextStartDate);

    if (isCustomDateDirty || durationType === 'CUSTOM') {
      if (nextStartDate > endDate) {
        setEndDate(addDays(nextStartDate, 30));
      }
      return;
    }

    if (durationType === 'WEEKS_2') {
      setEndDate(addWeeks(nextStartDate, 2));
      return;
    }
    if (durationType === 'WEEKS_4') {
      setEndDate(addWeeks(nextStartDate, 4));
      return;
    }
    if (durationType === 'WEEKS_8') {
      setEndDate(addWeeks(nextStartDate, 8));
      return;
    }

    if (nextStartDate > endDate) {
      setEndDate(addDays(nextStartDate, 30));
    }
  };

  const handleCustomEndDate = (value: string) => {
    setDurationType('CUSTOM');
    setIsCustomDateDirty(true);
    setEndDate(parseDateInputValue(value));
  };

  const handleSave = async () => {
    if (!assignment) return;

    try {
      await updateAssignment({
        variables: {
          assignmentId: assignment.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          frequency: {
            timesPerDay: frequency.timesPerDay,
            timesPerWeek: frequencyType === 'SPECIFIC_DAYS' ? selectedDaysCount : frequency.timesPerWeek,
            breakBetweenSets: frequency.breakBetweenSets,
            isFlexible: frequencyType !== 'SPECIFIC_DAYS',
            monday: frequency.monday,
            tuesday: frequency.tuesday,
            wednesday: frequency.wednesday,
            thursday: frequency.thursday,
            friday: frequency.friday,
            saturday: frequency.saturday,
            sunday: frequency.sunday,
          },
        },
        refetchQueries: [
          {
            query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
            variables: { userId: patientId },
          },
        ],
      });

      toast.success('Harmonogram został zaktualizowany');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd aktualizacji harmonogramu:', error);
      toast.error('Nie udało się zaktualizować harmonogramu');
    }
  };

  const setName = assignment?.exerciseSet?.name || 'Nieznany zestaw';

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-3xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canSave) {
            event.preventDefault();
            void handleSave();
          }
        }}
        data-testid="patient-schedule-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Edytuj harmonogram
          </DialogTitle>
          <DialogDescription>Zmień harmonogram zestawu &quot;{setName}&quot;</DialogDescription>

        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
            <section className="grid h-full grid-rows-[auto_1fr_auto] rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
              <h3 className="mb-5 flex items-center gap-2 border-b border-border/40 pb-4 text-sm font-semibold text-foreground">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Częstotliwość ćwiczeń
              </h3>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <CardOption
                    checked={frequencyType === 'DAILY_1X'}
                    label="Codziennie"
                    onSelect={() => applyFrequencyType('DAILY_1X')}
                    name="patient-schedule-frequency"
                    testId="patient-schedule-frequency-daily-1x"
                  />
                  <CardOption
                    checked={frequencyType === 'DAILY_2X'}
                    label="2x dziennie"
                    onSelect={() => applyFrequencyType('DAILY_2X')}
                    name="patient-schedule-frequency"
                    testId="patient-schedule-frequency-daily-2x"
                  />
                  <CardOption
                    checked={frequencyType === 'WEEKLY_3X'}
                    label={`${Math.max(1, frequency.timesPerWeek)}x w tygodniu`}
                    onSelect={() => applyFrequencyType('WEEKLY_3X')}
                    name="patient-schedule-frequency"
                    testId="patient-schedule-frequency-weekly"
                  />
                  <CardOption
                    checked={frequencyType === 'SPECIFIC_DAYS'}
                    label="Wybrane dni"
                    onSelect={() => applyFrequencyType('SPECIFIC_DAYS')}
                    name="patient-schedule-frequency"
                    testId="patient-schedule-frequency-specific-days"
                  />
                </div>

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    frequencyType === 'SPECIFIC_DAYS' ? 'max-h-[180px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="rounded-xl border border-border/40 bg-surface-light/40 p-4">
                    <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setFrequency((prev) => ({
                            ...prev,
                            ...DAYS.reduce((accumulator, day) => ({ ...accumulator, [day.key]: true }), {}),
                            timesPerWeek: 7,
                          }));
                        }}
                        className="text-primary hover:underline"
                      >
                        Wszystkie
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFrequency((prev) => ({
                            ...prev,
                            monday: true,
                            tuesday: true,
                            wednesday: true,
                            thursday: true,
                            friday: true,
                            saturday: false,
                            sunday: false,
                            timesPerWeek: 5,
                          }));
                        }}
                        className="text-primary hover:underline"
                      >
                        Pn-Pt
                      </button>
                      <button
                        type="button"
                        onClick={() => setFrequency((prev) => ({ ...prev, ...EMPTY_DAYS, timesPerWeek: 0 }))}
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Wyczyść
                      </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                      {DAYS.map((day) => {
                        const isSelected = frequency[day.key] === true;
                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => toggleDay(day.key)}
                            className={cn(
                              'h-10 w-10 rounded-full border text-sm font-semibold transition-all',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border/60 bg-surface text-muted-foreground hover:border-border hover:text-foreground'
                            )}
                            title={day.fullLabel}
                            data-testid={`patient-schedule-day-${day.key}`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Wybrano: {selectedDaysCount} {pluralizeDay(selectedDaysCount)}
                    </p>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                <div className="w-full space-y-2 text-center">
                  <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sesje w tygodniu
                  </Label>
                  <NumberControl
                    value={
                      frequencyType === 'SPECIFIC_DAYS'
                        ? Math.max(0, selectedDaysCount)
                        : Math.max(1, frequency.timesPerWeek)
                    }
                    min={1}
                    max={7}
                    onChange={(value) => setFrequency((prev) => ({ ...prev, timesPerWeek: value, ...EMPTY_DAYS }))}
                    disabled={frequencyType === 'SPECIFIC_DAYS'}
                    testIdPrefix="patient-schedule-times-per-week"
                  />
                </div>
                <div className="w-full space-y-2 text-center">
                  <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Razy dziennie
                  </Label>
                  <NumberControl
                    value={Math.max(1, frequency.timesPerDay)}
                    min={1}
                    max={5}
                    onChange={(value) => setFrequency((prev) => ({ ...prev, timesPerDay: value }))}
                    testIdPrefix="patient-schedule-times-per-day"
                  />
                </div>
              </div>
            </section>

            <section className="grid h-full grid-rows-[auto_1fr_auto] rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
              <h3 className="mb-5 flex items-center gap-2 border-b border-border/40 pb-4 text-sm font-semibold text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Okres trwania planu
              </h3>

              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <CardOption
                    checked={durationType === 'WEEKS_2' && !isCustomDateDirty}
                    label="2 tyg."
                    onSelect={() => applyDurationType('WEEKS_2')}
                    name="patient-schedule-duration"
                    testId="patient-schedule-duration-2-weeks"
                  />
                  <CardOption
                    checked={durationType === 'WEEKS_4' && !isCustomDateDirty}
                    label="4 tyg."
                    onSelect={() => applyDurationType('WEEKS_4')}
                    name="patient-schedule-duration"
                    testId="patient-schedule-duration-4-weeks"
                  />
                  <CardOption
                    checked={durationType === 'WEEKS_8' && !isCustomDateDirty}
                    label="8 tyg."
                    onSelect={() => applyDurationType('WEEKS_8')}
                    name="patient-schedule-duration"
                    testId="patient-schedule-duration-8-weeks"
                  />
                </div>

                <div className="rounded-xl border border-border/40 bg-surface-light/40 p-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="min-w-0 space-y-2">
                      <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Data rozpoczęcia
                      </Label>
                      <Input
                        type="date"
                        value={toDateInputValue(startDate)}
                        onChange={(event) => handleStartDateChange(event.target.value)}
                        className="h-11 w-full min-w-0 bg-surface pr-10 text-sm"
                        data-testid="patient-schedule-start-date"
                      />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Data zakończenia
                      </Label>
                      <Input
                        type="date"
                        value={toDateInputValue(endDate)}
                        min={toDateInputValue(startDate)}
                        onChange={(event) => handleCustomEndDate(event.target.value)}
                        className="h-11 w-full min-w-0 bg-surface pr-10 text-sm"
                        data-testid="patient-schedule-end-date"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-4">
                <div className="w-full space-y-2 text-center">
                  <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Przerwa między sesjami (godz.)
                  </Label>
                  <NumberControl
                    value={Math.max(0, frequency.breakBetweenSets)}
                    min={0}
                    max={24}
                    onChange={(value) => setFrequency((prev) => ({ ...prev, breakBetweenSets: value }))}
                    testIdPrefix="patient-schedule-break-between-sets"
                  />
                </div>
              </div>
            </section>
          </div>

          <Separator />

          <div className="rounded-xl border border-border/50 bg-surface-light/20 p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Podsumowanie planu
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <p>
                Okres:{' '}
                <span className="font-semibold text-foreground">
                  {format(startDate, 'd MMM yyyy', { locale: pl })} — {format(endDate, 'd MMM yyyy', { locale: pl })}
                </span>
              </p>
              <p>
                Częstotliwość: <span className="font-semibold text-foreground">{summaryFrequencyText}</span>
              </p>
              <p>
                Sesje: <span className="font-semibold text-foreground">~{Math.max(0, totalSessions)}</span>
              </p>
              <p>
                Przerwa: <span className="font-semibold text-foreground">{frequency.breakBetweenSets}h</span>
              </p>
              {daysToStart > 0 && (
                <p>
                  Start za{' '}
                  <span className="font-semibold text-foreground">
                    {daysToStart} {pluralizeDay(daysToStart)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-1 flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <Button variant="outline" onClick={handleCloseAttempt} data-testid="patient-schedule-cancel-btn">
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="shadow-lg shadow-primary/20"
            data-testid="patient-schedule-submit-btn"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz zmiany
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}
