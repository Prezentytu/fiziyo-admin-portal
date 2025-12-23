"use client";

import { Calendar, Clock, Info } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FrequencyPicker,
  type FrequencyValue,
} from "@/components/exercise-sets/FrequencyPicker";
import { cn } from "@/lib/utils";
import type { ExerciseSet, Patient, Frequency } from "./types";

interface ScheduleStepProps {
  exerciseSet: ExerciseSet;
  selectedPatients: Patient[];
  startDate: Date;
  endDate: Date;
  frequency: Frequency;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onFrequencyChange: (frequency: Frequency) => void;
}

export function ScheduleStep({
  exerciseSet,
  selectedPatients,
  startDate,
  endDate,
  frequency,
  onStartDateChange,
  onEndDateChange,
  onFrequencyChange,
}: ScheduleStepProps) {
  const durationDays = differenceInDays(endDate, startDate);
  const selectedDaysCount = [
    frequency.monday,
    frequency.tuesday,
    frequency.wednesday,
    frequency.thursday,
    frequency.friday,
    frequency.saturday,
    frequency.sunday,
  ].filter(Boolean).length;

  const totalSessions = Math.floor((durationDays / 7) * selectedDaysCount) * frequency.timesPerDay;

  // Convert FrequencyValue to Frequency and vice versa (they should be compatible)
  const handleFrequencyChange = (value: FrequencyValue) => {
    onFrequencyChange(value as Frequency);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
      {/* Left column - Schedule settings */}
      <div className="flex flex-col min-h-0 space-y-6 overflow-y-auto pr-2">
        {/* Date range */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Okres trwania</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data rozpoczęcia</Label>
              <Input
                type="date"
                value={format(startDate, "yyyy-MM-dd")}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  onStartDateChange(newDate);
                  // If end date is before start date, adjust it
                  if (newDate > endDate) {
                    onEndDateChange(addDays(newDate, 30));
                  }
                }}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data zakończenia</Label>
              <Input
                type="date"
                value={format(endDate, "yyyy-MM-dd")}
                onChange={(e) => onEndDateChange(new Date(e.target.value))}
                min={format(startDate, "yyyy-MM-dd")}
                className="h-11"
              />
            </div>
          </div>

          {/* Quick duration buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { days: 7, label: "1 tydzień" },
              { days: 14, label: "2 tygodnie" },
              { days: 30, label: "1 miesiąc" },
              { days: 60, label: "2 miesiące" },
              { days: 90, label: "3 miesiące" },
            ].map(({ days, label }) => {
              const isSelected = durationDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => onEndDateChange(addDays(startDate, days))}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-light hover:bg-surface-hover"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequency */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Częstotliwość</h3>
          </div>

          <FrequencyPicker
            value={frequency as FrequencyValue}
            onChange={handleFrequencyChange}
          />
        </div>
      </div>

      {/* Right column - Summary preview */}
      <div className="flex flex-col min-h-0 rounded-xl border border-border bg-surface/50 p-6 overflow-y-auto">
        <h3 className="font-semibold text-lg mb-4">Podsumowanie harmonogramu</h3>

        <div className="space-y-4 flex-1">
          {/* Assignment info */}
          <div className="rounded-xl bg-surface-light p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Zestaw:</span>
              <span className="font-medium">{exerciseSet.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Pacjenci:</span>
              <Badge variant="secondary">
                {selectedPatients.length} pacjent
                {selectedPatients.length === 1
                  ? ""
                  : selectedPatients.length < 5
                  ? "ów"
                  : "ów"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ćwiczenia:</span>
              <span className="font-medium">
                {exerciseSet.exerciseMappings?.length || 0}
              </span>
            </div>
          </div>

          {/* Schedule details */}
          <div className="rounded-xl bg-surface-light p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Okres:</span>
              <span className="font-medium">
                {format(startDate, "d MMM", { locale: pl })} —{" "}
                {format(endDate, "d MMM yyyy", { locale: pl })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Czas trwania:</span>
              <span className="font-medium">
                {durationDays} dni ({Math.ceil(durationDays / 7)} tyg.)
              </span>
            </div>
          </div>

          {/* Frequency summary */}
          <div className="rounded-xl bg-surface-light p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Dni treningowe:</span>
              <span className="font-medium">{selectedDaysCount} dni/tydzień</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sesji dziennie:</span>
              <span className="font-medium">{frequency.timesPerDay}x</span>
            </div>
            {frequency.breakBetweenSets > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Przerwa między sesjami:</span>
                <span className="font-medium">{frequency.breakBetweenSets}h</span>
              </div>
            )}
          </div>

          {/* Estimated sessions */}
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Szacowana liczba sesji: ~{totalSessions}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Każdy pacjent wykona około {totalSessions} sesji w wybranym okresie
            </p>
          </div>
        </div>

        {/* Patient list preview */}
        {selectedPatients.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Przypisywany dla:
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedPatients.slice(0, 5).map((patient) => (
                <Badge key={patient.id} variant="outline" className="text-xs">
                  {patient.name}
                </Badge>
              ))}
              {selectedPatients.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedPatients.length - 5} więcej
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

